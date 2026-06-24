import { safeRead, type SafeReadResult } from "./safe-read.js";
import {
  extractOutlineProjectionForContent,
  fileOutline,
  type ExtractedFileOutline,
  type FileOutlineResult,
} from "./file-outline.js";
import { readRange, type ReadRangeResult } from "./read-range.js";
import { CachedFile } from "./cached-file.js";
import { ObservationCache, hashContent } from "./observation-cache.js";
import { GovernorTracker } from "../session/tracker.js";
import { diffOutlines, type OutlineDiff } from "../parser/diff.js";
import { detectStructuredFormat } from "../parser/lang.js";
import type { JumpEntry, OutlineEntry } from "../parser/types.js";
import { evaluatePolicy } from "../policy/evaluate.js";
import { RefusedResult } from "../policy/types.js";
import { loadGraftignore } from "../policy/graftignore.js";
import type { FileSystem } from "../ports/filesystem.js";
import type { JsonCodec } from "../ports/codec.js";
import type { ProseProjectionProvider } from "./colorful-prose-projection.js";

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
  readonly proseProjector?: ProseProjectionProvider | undefined;
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
  readonly proseProjector: ProseProjectionProvider | undefined;

  constructor(options: RepoWorkspaceOptions) {
    this.projectRoot = options.projectRoot;
    this.fs = options.fs;
    this.codec = options.codec;
    this.graftignorePatterns = options.graftignorePatterns ?? [];
    this.governor = options.governor ?? new GovernorTracker();
    this.cache = options.cache ?? new ObservationCache();
    this.proseProjector = options.proseProjector;
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

  private async outlineForSnapshot(snapshot: CachedFile): Promise<ExtractedFileOutline | null> {
    return extractOutlineProjectionForContent(snapshot.path, snapshot.rawContent, {
      proseProjector: this.proseProjector,
    });
  }

  async safeRead(args: { readonly path: string; readonly intent?: string | undefined }): Promise<RepoWorkspaceSafeReadResult> {
    const filePath = this.resolveWorkspacePath(args.path);

    let snapshot: CachedFile | null = null;
    try {
      snapshot = new CachedFile(filePath, await this.fs.readFile(filePath, "utf-8"));
    } catch {
      // Let safeRead produce the not-found error shape.
    }

    if (snapshot !== null) {
      const cacheResult = this.cache.check(filePath, snapshot.rawContent);
      if (cacheResult.hit) {
        const refusal = this.evaluateRefusal(filePath, snapshot.actual);
        if (refusal !== null) {
          return refusal;
        }
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
        const freshOutline = await this.outlineForSnapshot(snapshot);
        if (freshOutline === null) {
          return await safeRead(filePath, {
            fs: this.fs,
            codec: this.codec,
            content: snapshot.rawContent,
            intent: args.intent,
            policyPath: this.policyPathForWorkspaceFile(filePath),
            graftignorePatterns: [...this.graftignorePatterns],
            sessionDepth: this.governor.getGovernorDepth(),
            budgetRemaining: this.governor.getBudget()?.remaining,
            proseProjector: this.proseProjector,
          });
        }
        this.cache.record(
          filePath,
          snapshot.hash,
          freshOutline.outline,
          freshOutline.jumpTable,
          snapshot.actual,
        );
        const updated = this.cache.get(filePath);
        return {
          path: filePath,
          projection: "diff",
          reason: "CHANGED_SINCE_LAST_READ",
          diff: diffOutlines(cacheResult.stale.outline, freshOutline.outline),
          outline: freshOutline.outline,
          jumpTable: freshOutline.jumpTable,
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
      proseProjector: this.proseProjector,
    });

    if (
      snapshot !== null &&
      result.actual !== undefined &&
      (result.projection === "content" || result.projection === "outline") &&
      result.reason !== "UNSUPPORTED_LANGUAGE"
    ) {
      try {
        const outline = result.outline !== undefined
          ? {
            outline: result.outline,
            jumpTable: result.jumpTable ?? [],
          }
          : await this.outlineForSnapshot(snapshot);
        if (outline !== null) {
          this.cache.record(filePath, snapshot.hash, outline.outline, outline.jumpTable, result.actual);
        }
      } catch {
        // Cache writes are best-effort; never turn a successful read into an error.
      }
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

    const result = await fileOutline(filePath, {
      fs: this.fs,
      proseProjector: this.proseProjector,
    });
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

    const cacheResult = this.cache.check(filePath, rawContent);
    if (cacheResult.hit) {
      return { status: "unchanged" };
    }
    if (cacheResult.stale === null) {
      if (detectStructuredFormat(filePath) === null) {
        const outline = await extractOutlineProjectionForContent(filePath, rawContent, {
          proseProjector: this.proseProjector,
        });
        if (outline === null) {
          return {
            status: "unsupported",
            reason: "UNSUPPORTED_LANGUAGE",
          };
        }
      }
      return { status: "no_previous_observation" };
    }

    const newOutlineResult = await extractOutlineProjectionForContent(filePath, rawContent, {
      proseProjector: this.proseProjector,
    });
    if (newOutlineResult === null) {
      return {
        status: "unsupported",
        reason: "UNSUPPORTED_LANGUAGE",
      };
    }

    const diff = diffOutlines(cacheResult.stale.outline, newOutlineResult.outline);

    if (consume) {
      this.cache.record(
        filePath,
        hashContent(rawContent),
        newOutlineResult.outline,
        newOutlineResult.jumpTable,
        actual,
      );
    }

    return { diff, consumed: consume };
  }
}
