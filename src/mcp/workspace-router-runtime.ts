import * as path from "node:path";
import { createRepoPathResolver } from "../adapters/repo-paths.js";
import type { FileSystem } from "../ports/filesystem.js";
import type { GitClient } from "../ports/git.js";
import type { WarpContext } from "../warp/context.js";
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
import type {
  WarpResidentLease,
  WarpResidentPool,
} from "./warp-pool.js";

export interface WorkspaceSlice {
  readonly sliceId: string;
  readonly governor: GovernorTracker;
  readonly cache: ObservationCache;
  readonly metrics: Metrics;
  readonly graftDir: string;
  readonly repoState: RepoStateTracker | null;
}

export interface WorkspaceWarpLease {
  getWarp(): Promise<WarpContext>;
  hasAcquiredResident(): boolean;
  release(): Promise<void>;
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
  readonly warpLease: WorkspaceWarpLease;
  readonly transportSessionId: string;
  readonly slice: WorkspaceSlice;
  readonly getWarp: () => Promise<WarpContext>;
}

export function createWorkspaceWarpLease(input: {
  readonly repoId: string;
  readonly worktreeRoot: string;
  readonly writerId: string;
  readonly ownerId: string;
  readonly warpPool: WarpResidentPool;
}): WorkspaceWarpLease {
  let leasePromise: Promise<WarpResidentLease> | null = null;
  let releasePromise: Promise<void> | null = null;
  let acquiredResident = false;
  const releaseHasStarted = (): boolean => releasePromise !== null;

  return {
    async getWarp(): Promise<WarpContext> {
      if (releaseHasStarted()) {
        throw new Error("workspace WARP lease has already been released");
      }
      const currentLease = leasePromise ?? input.warpPool.acquire({
        key: { repoId: input.repoId, writerId: input.writerId },
        worktreeRoot: input.worktreeRoot,
        ownerId: input.ownerId,
      });
      leasePromise = currentLease;
      try {
        const lease = await currentLease;
        if (releaseHasStarted()) {
          await lease.release();
          throw new Error("workspace WARP lease was released while opening");
        }
        acquiredResident = true;
        return { app: lease.app, strandId: null };
      } catch (error) {
        if (leasePromise === currentLease) {
          leasePromise = null;
          acquiredResident = false;
        }
        throw error;
      }
    },
    hasAcquiredResident(): boolean {
      return acquiredResident && !releaseHasStarted();
    },
    release(): Promise<void> {
      if (releasePromise !== null) return releasePromise;
      releasePromise = (async () => {
        const currentLease = leasePromise;
        if (currentLease === null) return;
        const lease = await currentLease.catch(() => null);
        await lease?.release();
      })();
      return releasePromise;
    },
  };
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
  readonly warpLeaseOwnerId: string;
  readonly warpLease?: WorkspaceWarpLease | undefined;
  readonly warpPool: WarpResidentPool;
}): Promise<BoundWorkspace> {
  if (input.actionName !== undefined) {
    input.slice.governor.recordMessage();
    input.slice.governor.recordToolCall(input.actionName);
  }

  const warpWriterId = input.warpWriterId ?? DEFAULT_WARP_WRITER_ID;
  const warpLease = input.warpLease ?? createWorkspaceWarpLease({
    repoId: input.resolved.repoId,
    worktreeRoot: input.resolved.worktreeRoot,
    writerId: warpWriterId,
    ownerId: input.warpLeaseOwnerId,
    warpPool: input.warpPool,
  });
  return {
    ...input.resolved,
    graftignorePatterns: await loadProjectGraftignore(input.fs, input.resolved.worktreeRoot),
    resolvePath: createRepoPathResolver(input.resolved.worktreeRoot),
    capabilityProfile: input.capabilityProfile,
    transportSessionId: input.transportSessionId,
    warpWriterId,
    warpLease,
    slice: input.slice,
    getWarp: () => warpLease.getWarp(),
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
  readonly hookEvent?: GitTransitionHookEvent | null;
}): PersistedLocalHistoryContext {
  const context = input.persistedLocalHistory.buildContext(
    input.execution.status,
    input.execution.getCausalContext(input.observation),
    input.observation,
    input.hookEvent ?? null,
  );
  if (context === null) {
    throw new Error("persisted local history context unavailable for execution");
  }
  return context;
}

export async function resolveCheckoutBoundaryHookEvent(input: {
  readonly fs: FileSystem;
  readonly git: GitClient;
  readonly binding: Pick<BoundWorkspace, "worktreeRoot" | "gitCommonDir">;
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
  getWarp: () => Promise<WarpContext>,
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
