import type { GitClient } from "../ports/git.js";
import type { FileSystem } from "../ports/filesystem.js";
import type { RepoObservation, RepoSnapshot } from "./repo-state-types.js";
import { captureSnapshot } from "./repo-state-git.js";
import { detectTransition } from "./repo-state-transition.js";
import { buildObservation, buildSemanticTransition } from "./repo-state-observation.js";

// Re-export all public types and interfaces for downstream consumers.
export type {
  WorldlineLayer,
  RepoTransitionKind,
  RepoSemanticTransitionKind,
  RepoSemanticTransitionAuthority,
  RepoSemanticTransitionPhase,
  RepoTransition,
  RepoSemanticTransition,
  WorkspaceOverlaySummary,
  RepoObservation,
} from "./repo-state-types.js";

/**
 * Default debounce window in milliseconds for coalescing rapid observe() calls.
 * Set to 0 (disabled) by default — callers opt in via constructor options.
 */
const DEFAULT_OBSERVE_DEBOUNCE_MS = 0;

export class RepoStateTracker {
  private checkoutEpoch = 0;
  private snapshot: RepoSnapshot | null = null;
  private observation: RepoObservation = {
    checkoutEpoch: 0,
    headRef: null,
    headSha: null,
    dirty: false,
    observedAt: new Date(0).toISOString(),
    lastTransition: null,
    semanticTransition: null,
    workspaceOverlayId: null,
    workspaceOverlay: null,
    statusLines: [],
  };
  private initialization: Promise<void> | null = null;
  private readonly startedAtSec = Math.floor(Date.now() / 1000);
  private hasObservedTransition = false;

  /** Pending observe promise used for debounce coalescing. */
  private pendingObserve: Promise<RepoObservation> | null = null;
  /** Timestamp of the last completed observation (ms since epoch). */
  private lastObservedAtMs = 0;

  private readonly debounceMs: number;

  constructor(
    private readonly cwd: string,
    private readonly fs: FileSystem,
    private readonly gitClient: GitClient,
    options?: { debounceMs?: number },
  ) {
    this.debounceMs = options?.debounceMs ?? DEFAULT_OBSERVE_DEBOUNCE_MS;
  }

  /**
   * Observe the current repo state.
   *
   * If another observe() call is already in flight, this returns the same
   * pending result (coalescing). If a previous observation completed within
   * the debounce window, the cached result is returned immediately without
   * spawning new git processes.
   */
  async observe(): Promise<RepoObservation> {
    // Coalesce: reuse an in-flight observation.
    if (this.pendingObserve !== null) {
      return this.pendingObserve;
    }

    // Debounce: return cached result if the last observation is fresh.
    const elapsed = Date.now() - this.lastObservedAtMs;
    if (this.lastObservedAtMs > 0 && elapsed < this.debounceMs) {
      return this.observation;
    }

    this.pendingObserve = this.performObserve();

    try {
      return await this.pendingObserve;
    } finally {
      this.pendingObserve = null;
    }
  }

  async initialize(): Promise<void> {
    if (this.initialization !== null) {
      await this.initialization;
      return;
    }

    this.initialization = (async () => {
      const snapshot = await captureSnapshot(this.cwd, this.fs, this.gitClient);
      this.snapshot = snapshot;
      this.observation = buildObservation(
        snapshot,
        this.checkoutEpoch,
        null,
        buildSemanticTransition(null, snapshot, null),
      );
    })();

    await this.initialization;
  }

  getState(): RepoObservation {
    return this.observation;
  }

  /** Core observation logic, separated from debounce/coalesce control. */
  private async performObserve(): Promise<RepoObservation> {
    await this.initialize();
    const previousSnapshot = this.snapshot;
    if (previousSnapshot === null) {
      return this.observation;
    }
    const nextSnapshot = await captureSnapshot(this.cwd, this.fs, this.gitClient);
    const transition = await detectTransition(
      this.gitClient,
      this.cwd,
      previousSnapshot,
      nextSnapshot,
      this.startedAtSec,
      !this.hasObservedTransition,
    );
    if (transition !== null) {
      this.checkoutEpoch++;
      this.hasObservedTransition = true;
    }

    this.snapshot = nextSnapshot;
    this.observation = buildObservation(
      nextSnapshot,
      this.checkoutEpoch,
      transition ?? this.observation.lastTransition,
      buildSemanticTransition(previousSnapshot, nextSnapshot, transition),
    );
    this.lastObservedAtMs = Date.now();
    return this.observation;
  }
}
