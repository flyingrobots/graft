import { safeRead, type SafeReadResult } from "./safe-read.js";
import { fileOutline, type FileOutlineResult } from "./file-outline.js";
import { readRange, type ReadRangeResult } from "./read-range.js";
import { CachedFile } from "./cached-file.js";
import { ObservationCache, hashContent } from "./observation-cache.js";
import { GovernorTracker } from "../session/tracker.js";
import { diffOutlines, type OutlineDiff } from "../parser/diff.js";
import { extractOutlineForFile } from "../parser/outline.js";
import type { JumpEntry, OutlineEntry } from "../parser/types.js";
import { evaluatePolicy } from "../policy/evaluate.js";
import { RefusedResult } from "../policy/types.js";
import { loadGraftignore } from "../policy/graftignore.js";
import type { FileSystem } from "../ports/filesystem.js";
import type { JsonCodec } from "../ports/codec.js";

export interface RepoWorkspaceRefusedResult {
  readonly path: string;
  readonly projection: "refused";
  readonly reason: string;
  readonly reasonDetail: string;
  readonly next: string[];
  readonly actual: { readonly lines: number; readonly bytes: number };
}

export interface RepoWorkspaceSafeReadCacheHitResult {
  readonly path: string;
  readonly projection: "cache_hit";
  readonly reason: "REREAD_UNCHANGED";
  readonly outline: readonly OutlineEntry[];
  readonly jumpTable: readonly JumpEntry[];
  readonly actual: Readonly<{ lines: number; bytes: number }>;
  readonly readCount: number;
  readonly estimatedBytesAvoided: number;
  readonly lastReadAt: string;
}

export interface RepoWorkspaceSafeReadDiffResult {
  readonly path: string;
  readonly projection: "diff";
  readonly reason: "CHANGED_SINCE_LAST_READ";
  readonly diff: OutlineDiff;
  readonly outline: readonly OutlineEntry[];
  readonly jumpTable: readonly JumpEntry[];
  readonly actual: Readonly<{ lines: number; bytes: number }>;
  readonly readCount: number;
  readonly lastReadAt: string;
}

export type RepoWorkspaceSafeReadResult =
  | SafeReadResult
  | RepoWorkspaceSafeReadCacheHitResult
  | RepoWorkspaceSafeReadDiffResult;

export type RepoWorkspaceFileOutlineResult = FileOutlineResult | RepoWorkspaceRefusedResult;

export type RepoWorkspaceReadRangeResult = ReadRangeResult | RepoWorkspaceRefusedResult;

export type RepoWorkspaceChangedSinceResult =
  | { readonly status: "file_not_found" }
  | { readonly status: "refused"; readonly reason: string }
  | { readonly status: "unsupported"; readonly reason: "UNSUPPORTED_LANGUAGE" }
  | { readonly status: "unchanged" }
  | { readonly status: "no_previous_observation" }
  | { readonly diff: OutlineDiff; readonly consumed: boolean };

export interface RepoWorkspaceOptions {
  readonly projectRoot: string;
  readonly fs: FileSystem;
  readonly codec: JsonCodec;
  readonly graftignorePatterns?: readonly string[] | undefined;
  readonly resolvePath?: ((input: string) => string) | undefined;
  readonly toPolicyPath?: ((resolvedPath: string) => string) | undefined;
  readonly governor?: GovernorTracker | undefined;
  readonly cache?: ObservationCache | undefined;
}

async function loadWorkspaceGraftignore(
  fs: Pick<FileSystem, "readFile">,
  projectRoot: string,
): Promise<string[]> {
  try {
    return loadGraftignore(await fs.readFile(`${projectRoot}/.graftignore`, "utf-8"));
  } catch {
    return [];
  }
}

export class RepoWorkspace {
  private readonly resolveWorkspacePath: (input: string) => string;
  private readonly policyPathForWorkspaceFile: (resolvedPath: string) => string;
  readonly projectRoot: string;
  readonly fs: FileSystem;
  readonly codec: JsonCodec;
  readonly graftignorePatterns: readonly string[];
  readonly governor: GovernorTracker;
  readonly cache: ObservationCache;

  constructor(options: RepoWorkspaceOptions) {
    this.projectRoot = options.projectRoot;
    this.fs = options.fs;
    this.codec = options.codec;
    this.graftignorePatterns = options.graftignorePatterns ?? [];
    this.governor = options.governor ?? new GovernorTracker();
    this.cache = options.cache ?? new ObservationCache();
    this.resolveWorkspacePath = options.resolvePath ?? ((input) => input);
    this.policyPathForWorkspaceFile = options.toPolicyPath ?? ((resolvedPath) => resolvedPath);
  }

  static async loadGraftignorePatterns(
    fs: Pick<FileSystem, "readFile">,
    projectRoot: string,
  ): Promise<string[]> {
    return loadWorkspaceGraftignore(fs, projectRoot);
  }

  setBudget(bytes: number): void {
    this.governor.setBudget(bytes);
  }

  getBudget(): { total: number; consumed: number; remaining: number; fraction: number } | null {
    return this.governor.getBudget();
  }

  private evaluateRefusal(
    filePath: string,
    actual: { readonly lines: number; readonly bytes: number },
  ): RepoWorkspaceRefusedResult | null {
    const policy = evaluatePolicy(
      {
        path: this.policyPathForWorkspaceFile(filePath),
        lines: actual.lines,
        bytes: actual.bytes,
      },
      {
        graftignorePatterns: this.graftignorePatterns.length > 0 ? [...this.graftignorePatterns] : undefined,
        sessionDepth: this.governor.getGovernorDepth(),
        budgetRemaining: this.governor.getBudget()?.remaining,
      },
    );
    if (!(policy instanceof RefusedResult)) {
      return null;
    }
    return {
      path: filePath,
      projection: "refused",
      reason: policy.reason,
      reasonDetail: policy.reasonDetail,
      next: [...policy.next],
      actual,
    };
  }

  async safeRead(args: { readonly path: string; readonly intent?: string | undefined }): Promise<RepoWorkspaceSafeReadResult> {
    const filePath = this.resolveWorkspacePath(args.path);

    let snapshot: CachedFile | null = null;
    try {
      snapshot = new CachedFile(filePath, await this.fs.readFile(filePath, "utf-8"));
    } catch {
      // Let safeRead produce the not-found error shape.
    }

    if (snapshot?.supportsOutline === true) {
      const cacheResult = this.cache.check(filePath, snapshot.rawContent);
      if (cacheResult.hit) {
        cacheResult.obs.touch(this.cache.now());
        return {
          path: filePath,
          projection: "cache_hit",
          reason: "REREAD_UNCHANGED",
          outline: cacheResult.obs.outline,
          jumpTable: cacheResult.obs.jumpTable,
          actual: cacheResult.obs.actual,
          readCount: cacheResult.obs.readCount,
          estimatedBytesAvoided: snapshot.actual.bytes,
          lastReadAt: cacheResult.obs.lastReadAt,
        };
      }

      if (cacheResult.stale !== null) {
        const refusal = this.evaluateRefusal(filePath, snapshot.actual);
        if (refusal !== null) {
          return refusal;
        }
        this.cache.record(filePath, snapshot.hash, snapshot.outline, snapshot.jumpTable, snapshot.actual);
        const updated = this.cache.get(filePath);
        return {
          path: filePath,
          projection: "diff",
          reason: "CHANGED_SINCE_LAST_READ",
          diff: diffOutlines(cacheResult.stale.outline, snapshot.outline),
          outline: snapshot.outline,
          jumpTable: snapshot.jumpTable,
          actual: snapshot.actual,
          readCount: cacheResult.stale.readCount + 1,
          lastReadAt: updated?.lastReadAt ?? this.cache.now(),
        };
      }
    }

    const result = await safeRead(filePath, {
      fs: this.fs,
      codec: this.codec,
      content: snapshot?.rawContent,
      intent: args.intent,
      policyPath: this.policyPathForWorkspaceFile(filePath),
      graftignorePatterns: [...this.graftignorePatterns],
      sessionDepth: this.governor.getGovernorDepth(),
      budgetRemaining: this.governor.getBudget()?.remaining,
    });

    if (
      snapshot !== null &&
      snapshot.supportsOutline &&
      result.actual !== undefined &&
      (result.projection === "content" || result.projection === "outline") &&
      result.reason !== "UNSUPPORTED_LANGUAGE"
    ) {
      this.cache.record(filePath, snapshot.hash, snapshot.outline, snapshot.jumpTable, result.actual);
    }

    return result;
  }

  async fileOutline(args: { readonly path: string }): Promise<RepoWorkspaceFileOutlineResult> {
    const filePath = this.resolveWorkspacePath(args.path);

    let rawContent: string | null = null;
    try {
      rawContent = await this.fs.readFile(filePath, "utf-8");
    } catch {
      // Let fileOutline shape the not-found result.
    }

    if (rawContent !== null) {
      const actual = {
        lines: rawContent.split("\n").length,
        bytes: Buffer.byteLength(rawContent),
      };
      const refusal = this.evaluateRefusal(filePath, actual);
      if (refusal !== null) {
        return refusal;
      }
      const cacheResult = this.cache.check(filePath, rawContent);
      if (cacheResult.hit) {
        cacheResult.obs.touch(this.cache.now());
        return {
          path: filePath,
          outline: [...cacheResult.obs.outline],
          jumpTable: [...cacheResult.obs.jumpTable],
          cacheHit: true,
        };
      }
    }

    const result = await fileOutline(filePath, { fs: this.fs });
    if (rawContent !== null && result.reason !== "UNSUPPORTED_LANGUAGE") {
      this.cache.record(
        filePath,
        hashContent(rawContent),
        result.outline,
        result.jumpTable,
        { lines: rawContent.split("\n").length, bytes: Buffer.byteLength(rawContent) },
      );
    }
    return result;
  }

  async readRange(args: { readonly path: string; readonly start: number; readonly end: number }): Promise<RepoWorkspaceReadRangeResult> {
    const filePath = this.resolveWorkspacePath(args.path);
    let rawContent: string | null = null;
    try {
      rawContent = await this.fs.readFile(filePath, "utf-8");
    } catch {
      // Let readRange shape the not-found result.
    }
    if (rawContent !== null) {
      const refusal = this.evaluateRefusal(filePath, {
        lines: rawContent.split("\n").length,
        bytes: Buffer.byteLength(rawContent),
      });
      if (refusal !== null) {
        return refusal;
      }
    }
    return readRange(filePath, args.start, args.end, { fs: this.fs });
  }

  async changedSince(args: { readonly path: string; readonly consume?: boolean | undefined }): Promise<RepoWorkspaceChangedSinceResult> {
    const filePath = this.resolveWorkspacePath(args.path);
    const consume = args.consume === true;

    let rawContent: string;
    try {
      rawContent = await this.fs.readFile(filePath, "utf-8");
    } catch {
      return { status: "file_not_found" };
    }

    const actual = {
      lines: rawContent.split("\n").length,
      bytes: Buffer.byteLength(rawContent),
    };
    const refusal = this.evaluateRefusal(filePath, actual);
    if (refusal !== null) {
      return { status: "refused", reason: refusal.reason };
    }

    const newOutlineResult = extractOutlineForFile(filePath, rawContent);
    if (newOutlineResult === null) {
      return {
        status: "unsupported",
        reason: "UNSUPPORTED_LANGUAGE",
      };
    }

    const cacheResult = this.cache.check(filePath, rawContent);
    if (cacheResult.hit) {
      return { status: "unchanged" };
    }
    if (cacheResult.stale === null) {
      return { status: "no_previous_observation" };
    }

    const diff = diffOutlines(cacheResult.stale.outline, newOutlineResult.entries);

    if (consume) {
      this.cache.record(
        filePath,
        hashContent(rawContent),
        newOutlineResult.entries,
        newOutlineResult.jumpTable ?? [],
        actual,
      );
    }

    return { diff, consumed: consume };
  }
}
