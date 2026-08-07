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
import { detectOutlineFormat } from "../parser/lang.js";
import type { JumpEntry, OutlineEntry } from "../parser/types.js";
import { evaluatePolicy } from "../policy/evaluate.js";
import { RefusedResult } from "../policy/types.js";
import { loadGraftignore } from "../policy/graftignore.js";
import type { FileSystem } from "../ports/filesystem.js";
import {
  LiveWorkspaceReadSource,
  observedActual,
  observeFile,
  type AdmittedWorkspaceReadView,
  type ObservedFile,
  type WorkspaceReadView,
} from "./workspace-read-view.js";
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

interface RepoWorkspaceCommonOptions {
  readonly projectRoot: string;
  readonly codec: JsonCodec;
  readonly graftignorePatterns?: readonly string[] | undefined;
  readonly resolvePath?: ((input: string) => string) | undefined;
  readonly toPolicyPath?: ((resolvedPath: string) => string) | undefined;
  readonly governor?: GovernorTracker | undefined;
  readonly cache?: ObservationCache | undefined;
  readonly proseProjector?: ProseProjectionProvider | undefined;
}

export type RepoWorkspaceOptions = RepoWorkspaceCommonOptions & (
  | {
      /**
       * The single read authority for this workspace.
       *
       * There is deliberately no filesystem parameter beside it. Two doors
       * would leave correctness resting on every code path remembering which
       * one is lawful; a workspace built over a settled observation must not
       * be able to reach the live disk at all. Callers that still want live
       * reads pass a `LiveWorkspaceReadSource` and are visible by name.
       */
      readonly readView: WorkspaceReadView;
      readonly fs?: never;
    }
  | {
      /**
       * Compatibility input for the semver-public constructor.
       *
       * Normalized immediately to one live read authority used by every
       * analysis method. The same filesystem remains externally visible
       * through the legacy `fs` member but is never consulted internally.
       */
      readonly fs: FileSystem;
      readonly readView?: never;
    }
);

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

function isFileNotFoundError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

function isAdmittedWorkspaceReadView(
  view: WorkspaceReadView,
): view is AdmittedWorkspaceReadView {
  return "evidence" in view && "admittedPaths" in view;
}

/** An admitted read view whose evidence belongs to a different workspace. */
export class WorkspaceRootMismatchError extends Error {
  readonly code = "WORKSPACE_ROOT_MISMATCH" as const;

  constructor(
    readonly projectRoot: string,
    readonly evidenceWorkspaceRoot: string,
  ) {
    super(
      `workspace root ${projectRoot} does not match admitted evidence root ${evidenceWorkspaceRoot}`,
    );
    this.name = "WorkspaceRootMismatchError";
  }
}

export class RepoWorkspace {
  private readonly resolveWorkspacePath: (input: string) => string;
  private readonly policyPathForWorkspaceFile: (resolvedPath: string) => string;
  private readonly compatibilityFs: FileSystem | undefined;
  readonly projectRoot: string;
  readonly readView: WorkspaceReadView;
  readonly codec: JsonCodec;
  readonly graftignorePatterns: readonly string[];
  readonly governor: GovernorTracker;
  readonly cache: ObservationCache;
  readonly proseProjector: ProseProjectionProvider | undefined;

  constructor(options: RepoWorkspaceOptions) {
    const readView = options.readView ?? new LiveWorkspaceReadSource(options.fs, options.projectRoot);
    if (
      isAdmittedWorkspaceReadView(readView) &&
      readView.evidence.workspaceRoot !== options.projectRoot
    ) {
      throw new WorkspaceRootMismatchError(
        options.projectRoot,
        readView.evidence.workspaceRoot,
      );
    }
    this.projectRoot = options.projectRoot;
    this.compatibilityFs = options.fs;
    this.readView = readView;
    Object.defineProperty(this, "readView", {
      writable: false,
      configurable: false,
    });
    this.codec = options.codec;
    this.graftignorePatterns = options.graftignorePatterns ?? [];
    this.governor = options.governor ?? new GovernorTracker();
    this.cache = options.cache ?? new ObservationCache();
    this.proseProjector = options.proseProjector;
    this.resolveWorkspacePath = options.resolvePath ?? ((input) => input);
    this.policyPathForWorkspaceFile = options.toPolicyPath ?? ((resolvedPath) => resolvedPath);
  }

  /**
   * The filesystem supplied through the semver-public compatibility constructor.
   *
   * Analysis methods never use this member; they retain only `readView` as
   * their read authority. Snapshot-backed workspaces have no live filesystem
   * to expose and fail loudly if new code attempts to cross that boundary.
   */
  get fs(): FileSystem {
    if (this.compatibilityFs === undefined) {
      throw new Error("RepoWorkspace.fs is unavailable for a readView-backed workspace");
    }
    return this.compatibilityFs;
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

  private invalidUtf8Refusal(
    filePath: string,
    actual: { readonly lines: number; readonly bytes: number },
  ): RepoWorkspaceRefusedResult {
    return {
      path: filePath,
      projection: "refused",
      reason: "INVALID_UTF8",
      reasonDetail: "This file is not valid UTF-8, so it has no faithful text projection.",
      next: ["Read it as bytes if you need its contents."],
      actual,
    };
  }

  /**
   * Observes a path exactly once, or reports that it could not be observed.
   *
   * A path the observation never admitted is a refusal, not an absence, and it
   * propagates. Folding it into not-found would report an authority escalation
   * as a cache miss, and would tell a caller a file does not exist when what
   * is true is that they may not read it.
   */
  private async observe(filePath: string): Promise<ObservedFile | null> {
    try {
      return await observeFile(this.readView, filePath);
    } catch (error) {
      if (isFileNotFoundError(error)) {
        return null;
      }
      throw error;
    }
  }

  private async outlineForSnapshot(snapshot: CachedFile): Promise<ExtractedFileOutline | null> {
    return extractOutlineProjectionForContent(snapshot.path, snapshot.rawContent, {
      proseProjector: this.proseProjector,
    });
  }

  async safeRead(args: { readonly path: string; readonly intent?: string | undefined }): Promise<RepoWorkspaceSafeReadResult> {
    const filePath = this.resolveWorkspacePath(args.path);

    const observed = await this.observe(filePath);
    if (observed === null) {
      return { path: filePath, projection: "error", reason: "NOT_FOUND" };
    }

    // No cache entry for bytes with no faithful text projection. Hashing and
    // comparing a lenient decode would key the cache by content the
    // observation never settled.
    const snapshot = observed.utf8 === null ? null : new CachedFile(filePath, observed.utf8);

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
          return await safeRead(observed, {
            codec: this.codec,
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

    const result = await safeRead(observed, {
      codec: this.codec,
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

    const observed = await this.observe(filePath);
    if (observed === null) {
      return { path: filePath, outline: [], jumpTable: [], reason: "NOT_FOUND", error: "File not found" };
    }
    const rawContent = observed.utf8;

    // Refusal is evaluated for every observation. Gating it on a successful
    // decode let a banned or binary path skip policy and reach the projection.
    const refusal = this.evaluateRefusal(filePath, observedActual(observed));
    if (refusal !== null) {
      return refusal;
    }

    if (rawContent === null) {
      return this.invalidUtf8Refusal(filePath, observedActual(observed));
    }

    const cacheResult = this.cache.check(filePath, rawContent);
    if (cacheResult.hit) {
      cacheResult.obs.touch(this.cache.now());
      return {
        path: filePath,
        outline: [...cacheResult.obs.outline],
        jumpTable: [...cacheResult.obs.jumpTable],
        cacheHit: true,
        actual: { ...cacheResult.obs.actual },
      };
    }

    const result = await fileOutline(observed, {
      proseProjector: this.proseProjector,
    });
    if (result.reason !== "UNSUPPORTED_LANGUAGE") {
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
    const observed = await this.observe(filePath);
    if (observed === null) {
      return { path: filePath, reason: "NOT_FOUND" };
    }
    // Refusal is evaluated for every observation, decodable or not.
    const refusal = this.evaluateRefusal(filePath, observedActual(observed));
    if (refusal !== null) {
      return refusal;
    }
    if (observed.utf8 === null) {
      return this.invalidUtf8Refusal(filePath, observedActual(observed));
    }
    return readRange(observed, args.start, args.end);
  }

  async changedSince(args: { readonly path: string; readonly consume?: boolean | undefined }): Promise<RepoWorkspaceChangedSinceResult> {
    const filePath = this.resolveWorkspacePath(args.path);
    const consume = args.consume === true;

    const observed = await this.observe(filePath);
    if (observed === null) {
      return { status: "file_not_found" };
    }
    const actual = observedActual(observed);
    const refusal = this.evaluateRefusal(filePath, actual);
    if (refusal !== null) {
      return { status: "refused", reason: refusal.reason };
    }
    if (observed.utf8 === null) {
      // Not an absence and not an unchanged file: there is no faithful text
      // projection to compare outlines across.
      return { status: "refused", reason: "INVALID_UTF8" };
    }
    const rawContent = observed.utf8;

    const cacheResult = this.cache.check(filePath, rawContent);
    if (cacheResult.hit) {
      return { status: "unchanged" };
    }
    if (cacheResult.stale === null) {
      if (detectOutlineFormat(filePath) === null) {
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
