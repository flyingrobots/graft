import * as path from "node:path";
import { createRepoPathResolver } from "../adapters/repo-paths.js";
import type { FileSystem } from "../ports/filesystem.js";
import type { GitClient } from "../ports/git.js";
import type { WarpHandle } from "../ports/warp.js";
import { DEFAULT_WARP_WRITER_ID } from "../warp/writer-id.js";
import { GovernorTracker } from "../session/tracker.js";
import { ObservationCache } from "./cache.js";
import { Metrics } from "./metrics.js";
import { loadProjectGraftignore } from "./policy.js";
import {
  type PersistedLocalHistoryContext,
  type PersistedLocalHistoryStore,
} from "./persisted-local-history.js";
import type { PersistedLocalHistoryGraphContext } from "./persisted-local-history-graph.js";
import { RepoStateTracker, type RepoObservation } from "./repo-state.js";
import { buildRuntimeCausalContext, type RuntimeCausalContext } from "./runtime-causal-context.js";
import {
  buildRuntimeWorkspaceOverlayFooting,
  type GitTransitionHookEvent,
} from "./runtime-workspace-overlay.js";
import type {
  ResolvedWorkspace,
  WorkspaceCapabilityProfile,
  WorkspaceExecutionContext,
  WorkspaceMode,
  WorkspaceStatus,
} from "./workspace-router-model.js";
import type { WarpPool } from "./warp-pool.js";

export interface WorkspaceSlice {
  readonly sliceId: string;
  readonly governor: GovernorTracker;
  readonly cache: ObservationCache;
  readonly metrics: Metrics;
  readonly graftDir: string;
  readonly repoState: RepoStateTracker | null;
}

export interface BoundWorkspace {
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
  readonly getWarp: () => Promise<WarpHandle>;
}

export function createWorkspaceSlice(input: {
  readonly graftDir: string;
  readonly projectRoot?: string;
  readonly fs: FileSystem;
  readonly git: GitClient;
  readonly nextSliceId: string;
}): WorkspaceSlice {
  return {
    sliceId: input.nextSliceId,
    governor: new GovernorTracker(),
    cache: new ObservationCache(),
    metrics: new Metrics(),
    graftDir: input.graftDir,
    repoState: input.projectRoot !== undefined
      ? new RepoStateTracker(input.projectRoot, input.fs, input.git)
      : null,
  };
}

export async function createBoundWorkspace(input: {
  readonly resolved: ResolvedWorkspace;
  readonly graftDir: string;
  readonly capabilityProfile: WorkspaceCapabilityProfile;
  readonly actionName?: string | undefined;
  readonly slice: WorkspaceSlice;
  readonly fs: FileSystem;
  readonly transportSessionId: string;
  readonly warpWriterId?: string | undefined;
  readonly warpPool: WarpPool;
}): Promise<BoundWorkspace> {
  if (input.actionName !== undefined) {
    input.slice.governor.recordMessage();
    input.slice.governor.recordToolCall(input.actionName);
  }

  return {
    ...input.resolved,
    graftignorePatterns: await loadProjectGraftignore(input.fs, input.resolved.worktreeRoot),
    resolvePath: createRepoPathResolver(input.resolved.worktreeRoot),
    capabilityProfile: input.capabilityProfile,
    transportSessionId: input.transportSessionId,
    warpWriterId: input.warpWriterId ?? DEFAULT_WARP_WRITER_ID,
    slice: input.slice,
    getWarp: () => input.warpPool.getOrOpen(
      input.resolved.repoId,
      input.resolved.worktreeRoot,
      input.warpWriterId ?? DEFAULT_WARP_WRITER_ID,
    ),
  };
}

export function buildWorkspaceCausalContext(
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

export function buildPersistedLocalHistoryContext(input: {
  readonly persistedLocalHistory: PersistedLocalHistoryStore;
  readonly mode: WorkspaceMode;
  readonly binding: BoundWorkspace;
  readonly observation: RepoObservation;
  readonly hookEvent?: GitTransitionHookEvent | null;
}): PersistedLocalHistoryContext {
  const context = input.persistedLocalHistory.buildContext(
    {
      sessionMode: input.mode,
      bindState: "bound",
      repoId: input.binding.repoId,
      worktreeId: input.binding.worktreeId,
      worktreeRoot: input.binding.worktreeRoot,
      gitCommonDir: input.binding.gitCommonDir,
      graftDir: input.binding.slice.graftDir,
      capabilityProfile: input.binding.capabilityProfile,
    },
    buildWorkspaceCausalContext(input.binding, input.observation),
    input.observation,
    input.hookEvent ?? null,
  );
  if (context === null) {
    throw new Error("persisted local history context unavailable for bound workspace");
  }
  return context;
}

export function buildPersistedLocalHistoryContextFromExecution(input: {
  readonly persistedLocalHistory: PersistedLocalHistoryStore;
  readonly execution: WorkspaceExecutionContext;
  readonly observation: RepoObservation;
}): PersistedLocalHistoryContext {
  const context = input.persistedLocalHistory.buildContext(
    input.execution.status,
    input.execution.getCausalContext(),
    input.observation,
  );
  if (context === null) {
    throw new Error("persisted local history context unavailable for execution");
  }
  return context;
}

export async function resolveCheckoutBoundaryHookEvent(input: {
  readonly fs: FileSystem;
  readonly git: GitClient;
  readonly binding: BoundWorkspace;
  readonly previousObservedAt: string;
  readonly observation: RepoObservation;
}): Promise<GitTransitionHookEvent | null> {
  const footing = await buildRuntimeWorkspaceOverlayFooting(
    input.fs,
    input.git,
    input.binding.worktreeRoot,
    input.binding.gitCommonDir,
    input.observation,
  );
  const latestHookEvent = footing.latestHookEvent;
  if (latestHookEvent === null) {
    return null;
  }

  const previousObservedAtMs = Date.parse(input.previousObservedAt);
  const hookObservedAtMs = Date.parse(latestHookEvent.observedAt);
  if (
    Number.isFinite(previousObservedAtMs) &&
    Number.isFinite(hookObservedAtMs) &&
    hookObservedAtMs < previousObservedAtMs
  ) {
    return null;
  }
  return latestHookEvent;
}

export async function buildPersistedLocalHistoryGraphContext(
  worktreeRoot: string,
  getWarp: () => Promise<WarpHandle>,
): Promise<PersistedLocalHistoryGraphContext | null> {
  try {
    return {
      warp: await getWarp(),
      worktreeRoot,
    };
  } catch {
    return null;
  }
}

export function boundWorkspaceStatus(
  mode: WorkspaceMode,
  binding: BoundWorkspace,
): WorkspaceStatus {
  return {
    sessionMode: mode,
    bindState: "bound",
    repoId: binding.repoId,
    worktreeId: binding.worktreeId,
    worktreeRoot: binding.worktreeRoot,
    gitCommonDir: binding.gitCommonDir,
    graftDir: binding.slice.graftDir,
    capabilityProfile: binding.capabilityProfile,
  };
}

export function unboundWorkspaceStatus(mode: WorkspaceMode): WorkspaceStatus {
  return {
    sessionMode: mode,
    bindState: "unbound",
    repoId: null,
    worktreeId: null,
    worktreeRoot: null,
    gitCommonDir: null,
    graftDir: null,
    capabilityProfile: null,
  };
}

export function nextBindingSliceDir(graftDir: string, nextBindingCounter: number): string {
  return path.join(
    graftDir,
    "bindings",
    `slice-${String(nextBindingCounter).padStart(4, "0")}`,
  );
}
