import type { PersistedLocalHistoryContext } from "../../src/mcp/persisted-local-history.js";

const DEFAULTS: PersistedLocalHistoryContext = {
  repoId: "repo:one",
  worktreeId: "worktree:one",
  transportSessionId: "transport:one",
  workspaceSliceId: "slice-0001",
  causalSessionId: "causal:one",
  strandId: "strand:one",
  checkoutEpochId: "epoch:one",
  workspaceOverlayId: null,
  observedAt: "2026-04-10T01:00:00.000Z",
  warpWriterId: "graft",
  transitionKind: null,
  transitionReflogSubject: null,
  hookTransitionName: null,
  hookTransitionArgs: null,
  hookTransitionObservedAt: null,
};

export function createCausalContext(
  overrides: Partial<PersistedLocalHistoryContext> = {},
): PersistedLocalHistoryContext {
  return { ...DEFAULTS, ...overrides };
}
