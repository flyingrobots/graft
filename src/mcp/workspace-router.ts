import * as path from "node:path";
import { ObservationCache } from "./cache.js";
import { Metrics } from "./metrics.js";
import {
  type PersistedLocalActivityWindow,
  PersistedLocalHistoryAttachUnavailableError,
  PersistedLocalHistoryStore,
  type PersistedLocalHistoryAttachDeclaration,
  type PersistedLocalHistoryContext,
  type RepoConcurrencySummary,
  type PersistedLocalHistorySummary,
} from "./persisted-local-history.js";
import { type PersistedLocalHistoryGraphContext } from "./persisted-local-history-graph.js";
import { RepoStateTracker, type RepoObservation } from "./repo-state.js";
import type { RuntimeCausalContext } from "./runtime-causal-context.js";
import { buildRuntimeStagedTarget } from "./runtime-staged-target.js";
import {
  buildRuntimeWorkspaceOverlayFooting,
  type RuntimeWorkspaceOverlayFooting,
} from "./runtime-workspace-overlay.js";
import { buildWorkspaceReadObservation, type AttributedReadToolName } from "./workspace-read-observation.js";
import {
  DEFAULT_REPO_LOCAL_CAPABILITY_PROFILE,
  WorkspaceBindingRequiredError,
  type CausalAttachResult,
  type ResolvedWorkspace,
  type WorkspaceActionResult,
  type WorkspaceAuthorizationPolicy,
  type WorkspaceBindAction,
  type WorkspaceBindRequest,
  type WorkspaceCapabilityProfile,
  type WorkspaceExecutionContext,
  type WorkspaceMode,
  type WorkspaceSharedAttachPolicy,
  type WorkspaceStatus,
} from "./workspace-router-model.js";
import { resolveWorkspaceRequest, stableWorkspaceId } from "./workspace-router-resolution.js";
import type { FileSystem } from "../ports/filesystem.js";
import type { GitClient } from "../ports/git.js";
import type { WarpHandle } from "../ports/warp.js";
import type { JsonObject } from "../contracts/json-object.js";
import type { WarpPool } from "./warp-pool.js";
import { DEFAULT_WARP_WRITER_ID } from "../warp/writer-id.js";
import { GovernorTracker } from "../session/tracker.js";
import {
  type BoundWorkspace,
  type WorkspaceSlice,
  boundWorkspaceStatus,
  buildPersistedLocalHistoryContext,
  buildPersistedLocalHistoryContextFromExecution,
  buildPersistedLocalHistoryGraphContext,
  buildWorkspaceCausalContext,
  createBoundWorkspace,
  createWorkspaceSlice,
  nextBindingSliceDir,
  resolveCheckoutBoundaryHookEvent,
  unboundWorkspaceStatus,
} from "./workspace-router-runtime.js";
export {
  DEFAULT_DAEMON_CAPABILITY_PROFILE,
  DEFAULT_REPO_LOCAL_CAPABILITY_PROFILE,
  WorkspaceBindingRequiredError,
  WorkspaceCapabilityDeniedError,
  type CausalAttachResult,
  type ResolvedWorkspace,
  type WorkspaceActionResult,
  type WorkspaceAuthorizationPolicy,
  type WorkspaceBindAction,
  type WorkspaceBindRequest,
  type WorkspaceCapabilityProfile,
  type WorkspaceExecutionContext,
  type WorkspaceMode,
  type WorkspaceSharedAttachPolicy,
  type WorkspaceStatus,
} from "./workspace-router-model.js";
export { resolveWorkspaceRequest } from "./workspace-router-resolution.js";

interface WorkspaceRouterOptions {
  readonly mode: WorkspaceMode;
  readonly fs: FileSystem;
  readonly git: GitClient;
  readonly graftDir: string;
  readonly projectRoot?: string | undefined;
  readonly warpPool: WarpPool;
  readonly transportSessionId: string;
  readonly warpWriterId?: string | undefined;
  readonly authorizationPolicy?: WorkspaceAuthorizationPolicy | undefined;
  readonly sharedAttachPolicy?: WorkspaceSharedAttachPolicy | undefined;
  readonly persistedLocalHistory: PersistedLocalHistoryStore;
}

export class WorkspaceRouter {
  private bindingCounter = 0;
  private sliceIdCounter = 0;
  private currentSlice: WorkspaceSlice;
  private currentBinding: BoundWorkspace | null = null;
  private initialization: Promise<void> | null = null;

  constructor(private readonly options: WorkspaceRouterOptions) {
    const initialProjectRoot = options.mode === "repo_local" ? options.projectRoot : undefined;
    this.currentSlice = createWorkspaceSlice({
      graftDir: options.mode === "repo_local" ? options.graftDir : path.join(options.graftDir, "unbound"),
      fs: options.fs,
      git: options.git,
      nextSliceId: `slice-${String(++this.sliceIdCounter).padStart(4, "0")}`,
      ...(initialProjectRoot !== undefined ? { projectRoot: initialProjectRoot } : {}),
    });
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
            repoId: stableWorkspaceId("repo", projectRoot),
            worktreeId: stableWorkspaceId("worktree", projectRoot),
            worktreeRoot: projectRoot,
            gitCommonDir: projectRoot,
          }
        : {
            repoId: resolved.repoId,
            worktreeId: stableWorkspaceId("worktree", projectRoot),
            worktreeRoot: projectRoot,
            gitCommonDir: resolved.gitCommonDir,
          };
      const currentBinding = await this.createBoundWorkspace(
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
        currentGraph: await this.buildPersistedLocalHistoryGraphContext(currentBinding),
      });
      this.currentBinding = currentBinding;
    })();

    await this.initialization;
  }

  get mode(): WorkspaceMode {
    return this.options.mode;
  }

  get governor(): GovernorTracker {
    return this.currentSlice.governor;
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

  getWarp(): Promise<WarpHandle> {
    return this.requireBinding().getWarp();
  }

  async observeRepoState(): Promise<void> {
    const binding = this.requireBinding();
    const repoState = this.requireRepoState();
    const previousObservation = repoState.getState();
    const nextObservation = await repoState.observe();
    const checkoutBoundaryHookEvent = previousObservation.checkoutEpoch !== nextObservation.checkoutEpoch
      ? await this.resolveCheckoutBoundaryHookEvent(binding, previousObservation.observedAt, nextObservation)
      : null;
    const previousContext = this.buildPersistedLocalHistoryContext(binding, previousObservation);
    const nextContext = this.buildPersistedLocalHistoryContext(
      binding,
      nextObservation,
      checkoutBoundaryHookEvent,
    );
    if (previousContext.checkoutEpochId !== nextContext.checkoutEpochId) {
      await this.options.persistedLocalHistory.noteCheckoutBoundary({
        previous: previousContext,
        current: nextContext,
        graph: await this.buildPersistedLocalHistoryGraphContext(binding),
      });
    }
  }

  getRepoState() {
    return this.requireRepoState().getState();
  }

  getStatus(): WorkspaceStatus {
    if (this.currentBinding === null) {
      return unboundWorkspaceStatus(this.options.mode);
    }
    return boundWorkspaceStatus(this.options.mode, this.currentBinding);
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
        latestTransitionEvent: null,
        preserves: [
          "continuity_operations",
          "read_events",
          "stage_events",
          "transition_events",
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
    const graph = await this.buildPersistedLocalHistoryGraphContext(binding);
    let summary = await this.options.persistedLocalHistory.summarize(status, causalContext, graph);

    if (repoState.semanticTransition !== null) {
      await this.options.persistedLocalHistory.noteSemanticTransitionObservation({
        current: this.buildPersistedLocalHistoryContext(binding, repoState),
        semanticTransition: repoState.semanticTransition,
        transition: repoState.lastTransition,
        attribution: summary.attribution,
        graph,
      });
      summary = await this.options.persistedLocalHistory.summarize(status, causalContext, graph);
    }

    const stagedTarget = buildRuntimeStagedTarget(status, causalContext, repoState, summary.attribution);

    if (stagedTarget.availability === "full_file") {
      await this.options.persistedLocalHistory.noteStageObservation({
        current: this.buildPersistedLocalHistoryContext(binding, repoState),
        stagedTarget,
        attribution: summary.attribution,
        graph,
      });
      return this.options.persistedLocalHistory.summarize(status, causalContext, graph);
    }

    return summary;
  }

  async getRepoConcurrencySummary(): Promise<RepoConcurrencySummary | null> {
    const binding = this.currentBinding;
    if (binding?.slice.repoState === null || binding === null) {
      return null;
    }
    return this.options.persistedLocalHistory.summarizeRepoConcurrency(
      this.getStatus(),
      await this.buildPersistedLocalHistoryGraphContext(binding),
    );
  }

  async getPersistedLocalActivityWindow(limit: number): Promise<PersistedLocalActivityWindow> {
    const binding = this.currentBinding;
    if (binding?.slice.repoState === null || binding === null) {
      return {
        historyPath: null,
        limit,
        totalMatchingItems: 0,
        truncated: false,
        items: [],
      };
    }

    await this.getPersistedLocalHistorySummary();

    const status = this.getStatus();
    const repoState = binding.slice.repoState.getState();
    const causalContext = this.buildCausalContext(binding, repoState);
    const graph = await this.buildPersistedLocalHistoryGraphContext(binding);
    return this.options.persistedLocalHistory.listRecentActivity(
      status,
      causalContext,
      limit,
      graph,
    );
  }

  getWorkspaceOverlayFooting(): Promise<RuntimeWorkspaceOverlayFooting | null> {
    const binding = this.currentBinding;
    if (binding?.slice.repoState === null || binding === null) {
      return Promise.resolve(null);
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
    args: JsonObject,
    result: JsonObject,
    execution?: WorkspaceExecutionContext | null,
  ): Promise<void> {
    const active = execution ?? this.captureCurrentExecutionContext();
    if (active === null) {
      return;
    }

    const readObservation = buildWorkspaceReadObservation(active, toolName, args, result);
    if (readObservation === null) {
      return;
    }

    const summary = await this.options.persistedLocalHistory.summarize(
      active.status,
      active.getCausalContext(),
      await this.buildPersistedLocalHistoryGraphContextFromExecution(active),
    );

    await this.options.persistedLocalHistory.noteReadObservation({
      current: this.buildPersistedLocalHistoryContextFromExecution(active, active.repoState.getState()),
      attribution: summary.attribution,
      graph: await this.buildPersistedLocalHistoryGraphContextFromExecution(active),
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
      status: boundWorkspaceStatus(this.options.mode, binding),
      governor: binding.slice.governor,
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
        graph: await this.buildPersistedLocalHistoryGraphContext(binding),
      });
    } catch (error) {
      if (error instanceof PersistedLocalHistoryAttachUnavailableError) {
        const sharedAttachSource = this.options.sharedAttachPolicy?.resolveSharedAttachSource({
          sessionId: this.options.transportSessionId,
          repoId: binding.repoId,
          worktreeId: binding.worktreeId,
        }) ?? null;
        if (sharedAttachSource !== null) {
          await this.options.persistedLocalHistory.declareSharedAttach({
            current: this.buildPersistedLocalHistoryContext(binding, binding.slice.repoState.getState()),
            declaration,
            source: sharedAttachSource,
            graph: await this.buildPersistedLocalHistoryGraphContext(binding),
          });
          return {
            ok: true,
            action: "attach",
            ...this.getStatus(),
            persistedLocalHistory: await this.getPersistedLocalHistorySummary(),
          };
        }
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

    const sliceDir = nextBindingSliceDir(this.options.graftDir, ++this.bindingCounter);
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

    const nextBinding = await this.createBoundWorkspace(resolved, sliceDir, capabilityProfile, actionName);
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
      currentGraph: await this.buildPersistedLocalHistoryGraphContext(nextBinding),
      previousGraph: previousBinding === null
        ? null
        : await this.buildPersistedLocalHistoryGraphContext(previousBinding),
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

  private async createBoundWorkspace(
    resolved: ResolvedWorkspace,
    graftDir: string,
    capabilityProfile: WorkspaceCapabilityProfile,
    actionName: string | undefined,
    sliceOverride?: WorkspaceSlice,
  ): Promise<BoundWorkspace> {
    const slice = sliceOverride ?? createWorkspaceSlice({
      graftDir,
      projectRoot: resolved.worktreeRoot,
      fs: this.options.fs,
      git: this.options.git,
      nextSliceId: `slice-${String(++this.sliceIdCounter).padStart(4, "0")}`,
    });
    return createBoundWorkspace({
      resolved,
      graftDir,
      capabilityProfile,
      ...(actionName !== undefined ? { actionName } : {}),
      slice,
      fs: this.options.fs,
      transportSessionId: this.options.transportSessionId,
      warpWriterId: this.options.warpWriterId ?? DEFAULT_WARP_WRITER_ID,
      warpPool: this.options.warpPool,
    });
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
    return buildWorkspaceCausalContext(binding, observation);
  }

  private buildPersistedLocalHistoryContext(
    binding: BoundWorkspace,
    observation: RepoObservation,
    hookEvent: import("./runtime-workspace-overlay.js").GitTransitionHookEvent | null = null,
  ): PersistedLocalHistoryContext {
    return buildPersistedLocalHistoryContext({
      persistedLocalHistory: this.options.persistedLocalHistory,
      mode: this.options.mode,
      binding,
      observation,
      hookEvent,
    });
  }

  private buildPersistedLocalHistoryContextFromExecution(
    execution: WorkspaceExecutionContext,
    observation: RepoObservation,
  ): PersistedLocalHistoryContext {
    return buildPersistedLocalHistoryContextFromExecution({
      persistedLocalHistory: this.options.persistedLocalHistory,
      execution,
      observation,
    });
  }

  private async resolveCheckoutBoundaryHookEvent(
    binding: BoundWorkspace,
    previousObservedAt: string,
    observation: RepoObservation,
  ): Promise<import("./runtime-workspace-overlay.js").GitTransitionHookEvent | null> {
    return resolveCheckoutBoundaryHookEvent({
      fs: this.options.fs,
      git: this.options.git,
      binding,
      previousObservedAt,
      observation,
    });
  }

  private captureCurrentExecutionContext(): WorkspaceExecutionContext | null {
    if (this.currentBinding === null) {
      return null;
    }
    return this.captureExecutionContext();
  }

  private async buildPersistedLocalHistoryGraphContext(
    binding: BoundWorkspace,
  ): Promise<PersistedLocalHistoryGraphContext | null> {
    return buildPersistedLocalHistoryGraphContext(binding.worktreeRoot, binding.getWarp);
  }

  private async buildPersistedLocalHistoryGraphContextFromExecution(
    execution: WorkspaceExecutionContext,
  ): Promise<PersistedLocalHistoryGraphContext | null> {
    return buildPersistedLocalHistoryGraphContext(execution.worktreeRoot, execution.getWarp);
  }
}
