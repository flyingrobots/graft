import * as crypto from "node:crypto";
import * as path from "node:path";
import type WarpApp from "@git-stunts/git-warp";
import { ObservationCache } from "./cache.js";
import { createPathResolver } from "./context.js";
import { Metrics } from "./metrics.js";
import { loadProjectGraftignore } from "./policy.js";
import {
  PersistedLocalHistoryAttachUnavailableError,
  PersistedLocalHistoryStore,
  type PersistedLocalHistoryAttachDeclaration,
  type PersistedLocalHistoryContext,
  type PersistedLocalHistorySummary,
} from "./persisted-local-history.js";
import { RepoStateTracker } from "./repo-state.js";
import { buildRuntimeCausalContext, type RuntimeCausalContext } from "./runtime-causal-context.js";
import { buildRuntimeStagedTarget } from "./runtime-staged-target.js";
import {
  buildRuntimeWorkspaceOverlayFooting,
  type RuntimeWorkspaceOverlayFooting,
} from "./runtime-workspace-overlay.js";
import { SessionTracker } from "../session/tracker.js";
import type { FileSystem } from "../ports/filesystem.js";
import type { GitClient } from "../ports/git.js";
import type { WarpPool } from "./warp-pool.js";
import { DEFAULT_WARP_WRITER_ID } from "../warp/writer-id.js";

export type WorkspaceSessionMode = "repo_local" | "daemon";
export type WorkspaceBindState = "bound" | "unbound";
export type WorkspaceBindAction = "bind" | "rebind";

export interface WorkspaceCapabilityProfile {
  readonly boundedReads: boolean;
  readonly structuralTools: boolean;
  readonly precisionTools: boolean;
  readonly stateBookmarks: boolean;
  readonly runtimeLogs: "session_local_only";
  readonly runCapture: boolean;
}

export interface WorkspaceStatus {
  readonly sessionMode: WorkspaceSessionMode;
  readonly bindState: WorkspaceBindState;
  readonly repoId: string | null;
  readonly worktreeId: string | null;
  readonly worktreeRoot: string | null;
  readonly gitCommonDir: string | null;
  readonly graftDir: string | null;
  readonly capabilityProfile: WorkspaceCapabilityProfile | null;
}

export interface WorkspaceActionResult extends WorkspaceStatus {
  readonly ok: boolean;
  readonly action: WorkspaceBindAction;
  readonly freshSessionSlice: boolean;
  readonly errorCode?: string;
  readonly error?: string;
}

export interface CausalAttachResult extends WorkspaceStatus {
  readonly ok: boolean;
  readonly action: "attach";
  readonly persistedLocalHistory: PersistedLocalHistorySummary;
  readonly errorCode?: string;
  readonly error?: string;
}

export interface WorkspaceBindRequest {
  readonly cwd: string;
  readonly worktreeRoot?: string | undefined;
  readonly gitCommonDir?: string | undefined;
  readonly repoId?: string | undefined;
}

export class WorkspaceBindingRequiredError extends Error {
  readonly code = "UNBOUND_SESSION";

  constructor(toolName: string) {
    super(`Tool ${toolName} requires an active workspace binding. Call workspace_bind first.`);
    this.name = "WorkspaceBindingRequiredError";
  }
}

export class WorkspaceCapabilityDeniedError extends Error {
  readonly code = "CAPABILITY_DENIED";

  constructor(toolName: string) {
    super(`Tool ${toolName} is not enabled in the daemon default capability profile.`);
    this.name = "WorkspaceCapabilityDeniedError";
  }
}

interface WorkspaceBindError {
  readonly code: string;
  readonly message: string;
}

interface WorkspaceSlice {
  readonly sliceId: string;
  readonly session: SessionTracker;
  readonly cache: ObservationCache;
  readonly metrics: Metrics;
  readonly graftDir: string;
  readonly repoState: RepoStateTracker | null;
}

interface BoundWorkspace {
  readonly repoId: string;
  readonly worktreeId: string;
  readonly worktreeRoot: string;
  readonly gitCommonDir: string;
  readonly graftignorePatterns: readonly string[];
  readonly resolvePath: (input: string) => string;
  readonly capabilityProfile: WorkspaceCapabilityProfile;
  readonly warpWriterId: string;
  readonly transportSessionId: string;
  readonly slice: WorkspaceSlice;
  readonly getWarp: () => Promise<WarpApp>;
}

export interface WorkspaceExecutionContext {
  readonly sliceId: string;
  readonly repoId: string;
  readonly worktreeId: string;
  readonly projectRoot: string;
  readonly worktreeRoot: string;
  readonly gitCommonDir: string;
  readonly graftignorePatterns: readonly string[];
  readonly resolvePath: (input: string) => string;
  readonly capabilityProfile: WorkspaceCapabilityProfile;
  readonly warpWriterId: string;
  getCausalContext(): RuntimeCausalContext;
  readonly status: WorkspaceStatus;
  readonly session: SessionTracker;
  readonly cache: ObservationCache;
  readonly metrics: Metrics;
  readonly graftDir: string;
  readonly repoState: RepoStateTracker;
  readonly getWarp: () => Promise<WarpApp>;
}

type AttributedReadToolName = "safe_read" | "file_outline" | "read_range";

export interface ResolvedWorkspace {
  readonly repoId: string;
  readonly worktreeId: string;
  readonly worktreeRoot: string;
  readonly gitCommonDir: string;
}

export interface WorkspaceAuthorizationPolicy {
  getCapabilityProfile(resolved: ResolvedWorkspace): Promise<WorkspaceCapabilityProfile | null>;
  noteBound(resolved: ResolvedWorkspace): Promise<void>;
}

interface WorkspaceRouterOptions {
  readonly mode: WorkspaceSessionMode;
  readonly fs: FileSystem;
  readonly git: GitClient;
  readonly graftDir: string;
  readonly projectRoot?: string | undefined;
  readonly warpPool: WarpPool;
  readonly transportSessionId: string;
  readonly warpWriterId?: string | undefined;
  readonly authorizationPolicy?: WorkspaceAuthorizationPolicy | undefined;
  readonly persistedLocalHistory: PersistedLocalHistoryStore;
}

export const DEFAULT_DAEMON_CAPABILITY_PROFILE: WorkspaceCapabilityProfile = Object.freeze({
  boundedReads: true,
  structuralTools: true,
  precisionTools: true,
  stateBookmarks: true,
  runtimeLogs: "session_local_only",
  runCapture: false,
});

export const DEFAULT_REPO_LOCAL_CAPABILITY_PROFILE: WorkspaceCapabilityProfile = Object.freeze({
  boundedReads: true,
  structuralTools: true,
  precisionTools: true,
  stateBookmarks: true,
  runtimeLogs: "session_local_only",
  runCapture: true,
});

function stableId(prefix: string, input: string): string {
  return `${prefix}:${crypto.createHash("sha256").update(input).digest("hex").slice(0, 16)}`;
}

async function readGitValue(git: GitClient, cwd: string, args: readonly string[]): Promise<string | null> {
  const result = await git.run({ args, cwd });
  if (result.error !== undefined || result.status !== 0) {
    return null;
  }
  const trimmed = result.stdout.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toAbsolutePath(base: string, value: string): string {
  return path.isAbsolute(value) ? value : path.resolve(base, value);
}

export async function resolveWorkspaceRequest(
  git: GitClient,
  request: WorkspaceBindRequest,
): Promise<ResolvedWorkspace | WorkspaceBindError> {
  const cwd = path.resolve(request.cwd);
  const worktreeRoot = await readGitValue(git, cwd, ["rev-parse", "--path-format=absolute", "--show-toplevel"]);
  if (worktreeRoot === null) {
    return {
      code: "NOT_A_GIT_REPO",
      message: `cwd is not inside a git worktree: ${cwd}`,
    };
  }

  const rawGitCommonDir = await readGitValue(git, cwd, ["rev-parse", "--path-format=absolute", "--git-common-dir"]);
  if (rawGitCommonDir === null) {
    return {
      code: "WORKSPACE_RESOLUTION_FAILED",
      message: `Unable to resolve git common dir from ${cwd}`,
    };
  }

  const gitCommonDir = toAbsolutePath(worktreeRoot, rawGitCommonDir);
  return {
    repoId: stableId("repo", gitCommonDir),
    worktreeId: stableId("worktree", worktreeRoot),
    worktreeRoot,
    gitCommonDir,
  };
}

export class WorkspaceRouter {
  private bindingCounter = 0;
  private sliceIdCounter = 0;
  private currentSlice: WorkspaceSlice;
  private currentBinding: BoundWorkspace | null = null;
  private initialization: Promise<void> | null = null;

  constructor(private readonly options: WorkspaceRouterOptions) {
    const initialProjectRoot = options.mode === "repo_local" ? options.projectRoot : undefined;
    this.currentSlice = this.createSlice(
      options.mode === "repo_local" ? options.graftDir : path.join(options.graftDir, "unbound"),
      initialProjectRoot,
    );
  }

  async initialize(): Promise<void> {
    if (this.options.mode !== "repo_local") {
      return;
    }
    if (this.currentBinding !== null) {
      return;
    }
    if (this.initialization !== null) {
      await this.initialization;
      return;
    }

    const projectRoot = this.options.projectRoot;
    if (projectRoot === undefined) {
      throw new Error("repo_local workspace router requires projectRoot");
    }

    this.initialization = (async () => {
      const resolved = await resolveWorkspaceRequest(this.options.git, { cwd: projectRoot });
      const initialWorkspace = "code" in resolved
        ? {
            repoId: stableId("repo", projectRoot),
            worktreeId: stableId("worktree", projectRoot),
            worktreeRoot: projectRoot,
            gitCommonDir: projectRoot,
          }
        : {
            repoId: resolved.repoId,
            worktreeId: stableId("worktree", projectRoot),
            worktreeRoot: projectRoot,
            gitCommonDir: resolved.gitCommonDir,
          };
      const currentBinding = this.createBoundWorkspace(
        initialWorkspace,
        this.options.graftDir,
        DEFAULT_REPO_LOCAL_CAPABILITY_PROFILE,
        undefined,
        this.currentSlice,
      );
      const currentRepoState = currentBinding.slice.repoState;
      if (currentRepoState === null) {
        throw new WorkspaceBindingRequiredError("workspace");
      }
      await currentRepoState.initialize();
      await this.options.persistedLocalHistory.noteBinding({
        current: this.buildPersistedLocalHistoryContext(currentBinding, currentRepoState.getState()),
      });
      this.currentBinding = currentBinding;
    })();

    await this.initialization;
  }

  get mode(): WorkspaceSessionMode {
    return this.options.mode;
  }

  get session(): SessionTracker {
    return this.currentSlice.session;
  }

  get cache(): ObservationCache {
    return this.currentSlice.cache;
  }

  get metrics(): Metrics {
    return this.currentSlice.metrics;
  }

  get graftDir(): string {
    return this.currentSlice.graftDir;
  }

  isBound(): boolean {
    return this.currentBinding !== null;
  }

  getProjectRoot(): string {
    return this.requireBinding().worktreeRoot;
  }

  getGraftignorePatterns(): readonly string[] {
    return this.requireBinding().graftignorePatterns;
  }

  getPathResolver(): (input: string) => string {
    return this.requireBinding().resolvePath;
  }

  getWarp(): Promise<WarpApp> {
    return this.requireBinding().getWarp();
  }

  async observeRepoState(): Promise<void> {
    const binding = this.requireBinding();
    const repoState = this.requireRepoState();
    const previousObservation = repoState.getState();
    const previousContext = this.buildPersistedLocalHistoryContext(binding, previousObservation);
    const nextObservation = await repoState.observe();
    const nextContext = this.buildPersistedLocalHistoryContext(binding, nextObservation);
    if (previousContext.checkoutEpochId !== nextContext.checkoutEpochId) {
      await this.options.persistedLocalHistory.noteCheckoutBoundary({
        previous: previousContext,
        current: nextContext,
      });
    }
  }

  getRepoState() {
    return this.requireRepoState().getState();
  }

  getStatus(): WorkspaceStatus {
    if (this.currentBinding === null) {
      return {
        sessionMode: this.options.mode,
        bindState: "unbound",
        repoId: null,
        worktreeId: null,
        worktreeRoot: null,
        gitCommonDir: null,
        graftDir: null,
        capabilityProfile: null,
      };
    }

    return {
      sessionMode: this.options.mode,
      bindState: "bound",
      repoId: this.currentBinding.repoId,
      worktreeId: this.currentBinding.worktreeId,
      worktreeRoot: this.currentBinding.worktreeRoot,
      gitCommonDir: this.currentBinding.gitCommonDir,
      graftDir: this.currentBinding.slice.graftDir,
      capabilityProfile: this.currentBinding.capabilityProfile,
    };
  }

  async getPersistedLocalHistorySummary(): Promise<PersistedLocalHistorySummary> {
    const binding = this.currentBinding;
    if (binding?.slice.repoState === null || binding === null) {
      return {
        availability: "none",
        persistence: "persisted_local_history",
        historyPath: null,
        totalContinuityRecords: 0,
        active: false,
        lastOperation: null,
        lastObservedAt: null,
        continuityKey: null,
        causalSessionId: null,
        strandId: null,
        checkoutEpochId: null,
        continuedFromCausalSessionId: null,
        continuityConfidence: "unknown",
        continuityEvidence: [],
        attribution: {
          actor: {
            actorId: "unknown",
            actorKind: "unknown",
            displayName: "Unknown",
            source: "persisted_local_history.fallback",
            authorityScope: "inferred",
          },
          confidence: "unknown",
          basis: "unknown_fallback",
          evidence: [],
        },
        latestReadEvent: null,
        latestStageEvent: null,
        preserves: [
          "continuity_operations",
          "read_events",
          "stage_events",
          "runtime_context_ids",
          "workspace_overlay_snapshots",
        ],
        excludes: [
          "raw_chat_transcripts",
          "queue_bookkeeping",
          "canonical_provenance",
          "canonical_structural_truth",
        ],
        nextAction: "bind_workspace_to_begin_local_history",
      };
    }
    const status = this.getStatus();
    const repoState = binding.slice.repoState.getState();
    const causalContext = this.buildCausalContext(binding, repoState);
    const summary = await this.options.persistedLocalHistory.summarize(status, causalContext);
    const stagedTarget = buildRuntimeStagedTarget(status, causalContext, repoState, summary.attribution);

    if (stagedTarget.availability === "full_file") {
      await this.options.persistedLocalHistory.noteStageObservation({
        current: this.buildPersistedLocalHistoryContext(binding, repoState),
        stagedTarget,
        attribution: summary.attribution,
      });
      return this.options.persistedLocalHistory.summarize(status, causalContext);
    }

    return summary;
  }

  async getWorkspaceOverlayFooting(): Promise<RuntimeWorkspaceOverlayFooting | null> {
    const binding = this.currentBinding;
    if (binding?.slice.repoState === null || binding === null) {
      return null;
    }
    return buildRuntimeWorkspaceOverlayFooting(
      this.options.fs,
      this.options.git,
      binding.worktreeRoot,
      binding.gitCommonDir,
      binding.slice.repoState.getState(),
    );
  }

  async noteReadObservation(
    toolName: AttributedReadToolName,
    args: Record<string, unknown>,
    result: Record<string, unknown>,
    execution?: WorkspaceExecutionContext | null,
  ): Promise<void> {
    const active = execution ?? this.captureCurrentExecutionContext();
    if (active === null) {
      return;
    }

    const readObservation = this.buildReadObservation(active, toolName, args, result);
    if (readObservation === null) {
      return;
    }

    const summary = await this.options.persistedLocalHistory.summarize(
      active.status,
      active.getCausalContext(),
    );

    await this.options.persistedLocalHistory.noteReadObservation({
      current: this.buildPersistedLocalHistoryContextFromExecution(active, active.repoState.getState()),
      attribution: summary.attribution,
      ...readObservation,
    });
  }

  captureExecutionContext(): WorkspaceExecutionContext {
    const binding = this.requireBinding();
    const repoState = binding.slice.repoState;
    if (repoState === null) {
      throw new WorkspaceBindingRequiredError("workspace");
    }
    return {
      sliceId: binding.slice.sliceId,
      repoId: binding.repoId,
      worktreeId: binding.worktreeId,
      projectRoot: binding.worktreeRoot,
      worktreeRoot: binding.worktreeRoot,
      gitCommonDir: binding.gitCommonDir,
      graftignorePatterns: binding.graftignorePatterns,
      resolvePath: binding.resolvePath,
      capabilityProfile: binding.capabilityProfile,
      warpWriterId: binding.warpWriterId,
      getCausalContext: () => this.buildCausalContext(binding, repoState.getState()),
      status: {
        sessionMode: this.options.mode,
        bindState: "bound",
        repoId: binding.repoId,
        worktreeId: binding.worktreeId,
        worktreeRoot: binding.worktreeRoot,
        gitCommonDir: binding.gitCommonDir,
        graftDir: binding.slice.graftDir,
        capabilityProfile: binding.capabilityProfile,
      },
      session: binding.slice.session,
      cache: binding.slice.cache,
      metrics: binding.slice.metrics,
      graftDir: binding.slice.graftDir,
      repoState,
      getWarp: binding.getWarp,
    };
  }

  async bind(request: WorkspaceBindRequest, actionName: string): Promise<WorkspaceActionResult> {
    return this.bindInternal("bind", request, actionName);
  }

  async rebind(request: WorkspaceBindRequest, actionName: string): Promise<WorkspaceActionResult> {
    if (this.currentBinding === null) {
      return {
        ok: false,
        action: "rebind",
        freshSessionSlice: false,
        ...this.getStatus(),
        errorCode: "UNBOUND_SESSION",
        error: "workspace_rebind requires an active workspace binding.",
      };
    }
    return this.bindInternal("rebind", request, actionName);
  }

  async declareAttach(
    declaration: PersistedLocalHistoryAttachDeclaration,
  ): Promise<CausalAttachResult> {
    const binding = this.currentBinding;
    if (binding?.slice.repoState === null || binding === null) {
      return {
        ok: false,
        action: "attach",
        ...this.getStatus(),
        persistedLocalHistory: await this.getPersistedLocalHistorySummary(),
        errorCode: "UNBOUND_SESSION",
        error: "causal_attach requires an active workspace binding.",
      };
    }

    try {
      await this.options.persistedLocalHistory.declareAttach({
        current: this.buildPersistedLocalHistoryContext(binding, binding.slice.repoState.getState()),
        declaration,
      });
    } catch (error) {
      if (error instanceof PersistedLocalHistoryAttachUnavailableError) {
        return {
          ok: false,
          action: "attach",
          ...this.getStatus(),
          persistedLocalHistory: await this.getPersistedLocalHistorySummary(),
          errorCode: error.code,
          error: error.message,
        };
      }
      throw error;
    }

    return {
      ok: true,
      action: "attach",
      ...this.getStatus(),
      persistedLocalHistory: await this.getPersistedLocalHistorySummary(),
    };
  }

  private async bindInternal(
    action: WorkspaceBindAction,
    request: WorkspaceBindRequest,
    actionName: string,
  ): Promise<WorkspaceActionResult> {
    const resolved = await resolveWorkspaceRequest(this.options.git, request);
    if ("code" in resolved) {
      return {
        ok: false,
        action,
        freshSessionSlice: false,
        ...this.getStatus(),
        errorCode: resolved.code,
        error: resolved.message,
      };
    }

    const sliceDir = path.join(
      this.options.graftDir,
      "bindings",
      `slice-${String(++this.bindingCounter).padStart(4, "0")}`,
    );
    await this.options.fs.mkdir(sliceDir, { recursive: true });

    const capabilityProfile = this.options.mode === "repo_local"
      ? DEFAULT_REPO_LOCAL_CAPABILITY_PROFILE
      : (await this.options.authorizationPolicy?.getCapabilityProfile(resolved)) ?? null;
    if (capabilityProfile === null) {
      return {
        ok: false,
        action,
        freshSessionSlice: false,
        ...this.getStatus(),
        errorCode: "WORKSPACE_NOT_AUTHORIZED",
        error: `Workspace ${resolved.worktreeRoot} is not authorized for daemon binding. Call workspace_authorize first.`,
      };
    }

    const nextBinding = this.createBoundWorkspace(resolved, sliceDir, capabilityProfile, actionName);
    const nextRepoState = nextBinding.slice.repoState;
    if (nextRepoState === null) {
      throw new WorkspaceBindingRequiredError("workspace");
    }
    await nextRepoState.initialize();
    const previousBinding = this.currentBinding;
    const previousRepoState = previousBinding?.slice.repoState;
    await this.options.persistedLocalHistory.noteBinding({
      current: this.buildPersistedLocalHistoryContext(nextBinding, nextRepoState.getState()),
      previous: previousBinding === null || previousRepoState == null
        ? null
        : this.buildPersistedLocalHistoryContext(previousBinding, previousRepoState.getState()),
    });
    if (this.options.mode === "daemon") {
      await this.options.authorizationPolicy?.noteBound(resolved);
    }
    this.currentBinding = nextBinding;
    this.currentSlice = nextBinding.slice;

    return {
      ok: true,
      action,
      freshSessionSlice: true,
      ...this.getStatus(),
    };
  }

  private createBoundWorkspace(
    resolved: ResolvedWorkspace,
    graftDir: string,
    capabilityProfile: WorkspaceCapabilityProfile,
    actionName: string | undefined,
    sliceOverride?: WorkspaceSlice,
  ): BoundWorkspace {
    const slice = sliceOverride ?? this.createSlice(graftDir, resolved.worktreeRoot);
    if (actionName !== undefined) {
      slice.session.recordMessage();
      slice.session.recordToolCall(actionName);
    }

    return {
      ...resolved,
      graftignorePatterns: loadProjectGraftignore(this.options.fs, resolved.worktreeRoot),
      resolvePath: createPathResolver(resolved.worktreeRoot),
      capabilityProfile,
      transportSessionId: this.options.transportSessionId,
      warpWriterId: this.options.warpWriterId ?? DEFAULT_WARP_WRITER_ID,
      slice,
      getWarp: () => this.options.warpPool.getOrOpen(
        resolved.repoId,
        resolved.worktreeRoot,
        this.options.warpWriterId ?? DEFAULT_WARP_WRITER_ID,
      ),
    };
  }

  private createSlice(graftDir: string, projectRoot?: string): WorkspaceSlice {
    return {
      sliceId: `slice-${String(++this.sliceIdCounter).padStart(4, "0")}`,
      session: new SessionTracker(),
      cache: new ObservationCache(),
      metrics: new Metrics(),
      graftDir,
      repoState: projectRoot !== undefined ? new RepoStateTracker(projectRoot, this.options.fs, this.options.git) : null,
    };
  }

  private requireBinding(): BoundWorkspace {
    if (this.currentBinding === null) {
      throw new WorkspaceBindingRequiredError("workspace");
    }
    return this.currentBinding;
  }

  private requireRepoState(): RepoStateTracker {
    const repoState = this.currentBinding?.slice.repoState;
    if (repoState === null || repoState === undefined) {
      throw new WorkspaceBindingRequiredError("workspace");
    }
    return repoState;
  }

  private buildCausalContext(
    binding: BoundWorkspace,
    observation: { readonly checkoutEpoch: number },
  ): RuntimeCausalContext {
    return buildRuntimeCausalContext({
      transportSessionId: binding.transportSessionId,
      workspaceSliceId: binding.slice.sliceId,
      repoId: binding.repoId,
      worktreeId: binding.worktreeId,
      checkoutEpoch: observation.checkoutEpoch,
      warpWriterId: binding.warpWriterId,
    });
  }

  private buildPersistedLocalHistoryContext(
    binding: BoundWorkspace,
    observation: import("./repo-state.js").RepoObservation,
  ): PersistedLocalHistoryContext {
    const context = this.options.persistedLocalHistory.buildContext(
      {
        sessionMode: this.options.mode,
        bindState: "bound",
        repoId: binding.repoId,
        worktreeId: binding.worktreeId,
        worktreeRoot: binding.worktreeRoot,
        gitCommonDir: binding.gitCommonDir,
        graftDir: binding.slice.graftDir,
        capabilityProfile: binding.capabilityProfile,
      },
      this.buildCausalContext(binding, observation),
      observation,
    );
    if (context === null) {
      throw new WorkspaceBindingRequiredError("workspace");
    }
    return context;
  }

  private buildPersistedLocalHistoryContextFromExecution(
    execution: WorkspaceExecutionContext,
    observation: import("./repo-state.js").RepoObservation,
  ): PersistedLocalHistoryContext {
    const context = this.options.persistedLocalHistory.buildContext(
      execution.status,
      execution.getCausalContext(),
      observation,
    );
    if (context === null) {
      throw new WorkspaceBindingRequiredError("workspace");
    }
    return context;
  }

  private captureCurrentExecutionContext(): WorkspaceExecutionContext | null {
    if (this.currentBinding === null) {
      return null;
    }
    return this.captureExecutionContext();
  }

  private buildReadObservation(
    execution: WorkspaceExecutionContext,
    toolName: AttributedReadToolName,
    args: Record<string, unknown>,
    result: Record<string, unknown>,
  ): {
    readonly surface: string;
    readonly projection: string;
    readonly sourceLayer: "canonical_structural_truth" | "workspace_overlay";
    readonly reason: string;
    readonly footprint: {
      readonly paths: string[];
      readonly symbols: string[];
      readonly regions: {
        readonly path: string;
        readonly startLine: number;
        readonly endLine: number;
      }[];
    };
  } | null {
    const rawPath = args["path"];
    if (typeof rawPath !== "string") {
      return null;
    }

    const absolutePath = execution.resolvePath(rawPath);
    const relativePath = path.relative(execution.worktreeRoot, absolutePath);
    const footprintPath = relativePath.startsWith("..") ? absolutePath : relativePath;
    const sourceLayer = execution.repoState.getState().workspaceOverlayId === null
      ? "canonical_structural_truth"
      : "workspace_overlay";

    if (toolName === "safe_read") {
      const projection = result["projection"];
      if (
        projection !== "content" &&
        projection !== "outline" &&
        projection !== "cache_hit" &&
        projection !== "diff"
      ) {
        return null;
      }
      return {
        surface: "safe_read",
        projection,
        sourceLayer,
        reason: typeof result["reason"] === "string" ? result["reason"] : "SAFE_READ",
        footprint: {
          paths: [footprintPath],
          symbols: [],
          regions: [],
        },
      };
    }

    if (toolName === "file_outline") {
      if (typeof result["error"] === "string" || result["reason"] === "UNSUPPORTED_LANGUAGE") {
        return null;
      }
      return {
        surface: "file_outline",
        projection: "outline",
        sourceLayer,
        reason: typeof result["reason"] === "string" ? result["reason"] : "FILE_OUTLINE",
        footprint: {
          paths: [footprintPath],
          symbols: [],
          regions: [],
        },
      };
    }

    const startLine = result["startLine"];
    const endLine = result["endLine"];
    if (
      typeof result["content"] !== "string" ||
      typeof startLine !== "number" ||
      typeof endLine !== "number"
    ) {
      return null;
    }
    return {
      surface: "read_range",
      projection: "content",
      sourceLayer,
      reason: typeof result["reason"] === "string" ? result["reason"] : "READ_RANGE",
      footprint: {
        paths: [footprintPath],
        symbols: [],
        regions: [{
          path: footprintPath,
          startLine,
          endLine,
        }],
      },
    };
  }
}
