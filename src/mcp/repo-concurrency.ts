import type {
  AttributionSummary,
  CausalEvent,
  RepoConcurrencyAuthority,
  RepoConcurrencyPosture,
} from "../contracts/causal-ontology.js";

export interface RepoConcurrencyTouch {
  readonly contributorKey: string;
  readonly path: string;
}

export interface RepoConcurrencyWorktreeHistory {
  readonly worktreeId: string;
  readonly active: boolean;
  readonly checkoutEpochId: string | null;
  readonly causalSessionIds: readonly string[];
  readonly actorIds: readonly string[];
  readonly contributorKeys: readonly string[];
  readonly explicitHandoff: boolean;
  readonly touches: readonly RepoConcurrencyTouch[];
}

export interface RepoConcurrencySummary {
  readonly posture: RepoConcurrencyPosture;
  readonly authority: RepoConcurrencyAuthority;
  readonly observedWorktreeCount: number;
  readonly observedCausalSessionCount: number;
  readonly observedActorCount: number;
  readonly overlappingPathCount: number;
  readonly summary: string;
}

interface RepoConcurrencyInput {
  readonly currentWorktreeId: string;
  readonly histories: readonly RepoConcurrencyWorktreeHistory[];
}

export interface RepoConcurrencyLiveSession {
  readonly bindState: "bound" | "unbound";
  readonly repoId: string | null;
  readonly worktreeId: string | null;
  readonly causalSessionId: string | null;
  readonly checkoutEpochId: string | null;
}

function countOverlapPaths(touches: readonly RepoConcurrencyTouch[]): number {
  const contributorsByPath = new Map<string, Set<string>>();
  for (const touch of touches) {
    const existing = contributorsByPath.get(touch.path) ?? new Set<string>();
    existing.add(touch.contributorKey);
    contributorsByPath.set(touch.path, existing);
  }

  let count = 0;
  for (const contributors of contributorsByPath.values()) {
    if (contributors.size > 1) {
      count += 1;
    }
  }
  return count;
}

function buildSummary(
  posture: RepoConcurrencyPosture,
  authority: RepoConcurrencyAuthority,
  observedWorktreeCount: number,
  observedCausalSessionCount: number,
  observedActorCount: number,
  overlappingPathCount: number,
  summary: string,
): RepoConcurrencySummary {
  return {
    posture,
    authority,
    observedWorktreeCount,
    observedCausalSessionCount,
    observedActorCount,
    overlappingPathCount,
    summary,
  };
}

function withObservedCounts(
  summary: RepoConcurrencySummary,
  input: {
    readonly observedWorktreeCount: number;
    readonly observedCausalSessionCount: number;
    readonly observedActorCount: number;
  },
): RepoConcurrencySummary {
  return {
    ...summary,
    observedWorktreeCount: Math.max(summary.observedWorktreeCount, input.observedWorktreeCount),
    observedCausalSessionCount: Math.max(summary.observedCausalSessionCount, input.observedCausalSessionCount),
    observedActorCount: Math.max(summary.observedActorCount, input.observedActorCount),
  };
}

export function deriveRepoConcurrencySummary(input: RepoConcurrencyInput): RepoConcurrencySummary {
  const activeHistories = input.histories.filter((history) => history.active);
  const current = activeHistories.find((history) => history.worktreeId === input.currentWorktreeId)
    ?? input.histories.find((history) => history.worktreeId === input.currentWorktreeId)
    ?? null;

  if (current === null) {
    return buildSummary(
      "unknown",
      "unknown",
      0,
      0,
      0,
      0,
      "No lawful same-repo concurrency evidence is available for the current worktree.",
    );
  }

  const observedWorktreeCount = Math.max(1, new Set(activeHistories.map((history) => history.worktreeId)).size);
  const observedCausalSessionCount = new Set(
    activeHistories.flatMap((history) => history.causalSessionIds),
  ).size;
  const observedActorCount = new Set(
    activeHistories.flatMap((history) => history.actorIds),
  ).size;
  const overlappingPathCount = countOverlapPaths(current.touches);
  const otherActiveWorktrees = activeHistories.filter((history) => history.worktreeId !== current.worktreeId);

  if (otherActiveWorktrees.some((history) =>
    history.checkoutEpochId !== null &&
    current.checkoutEpochId !== null &&
    history.checkoutEpochId !== current.checkoutEpochId
  )) {
    return buildSummary(
      "divergent_checkout",
      "active_history_scan",
      observedWorktreeCount,
      observedCausalSessionCount,
      observedActorCount,
      overlappingPathCount,
      "Active same-repo work appears to be split across different checkout epochs or branches.",
    );
  }

  if (current.contributorKeys.length > 1 && overlappingPathCount > 0 && !current.explicitHandoff) {
    return buildSummary(
      "overlapping_actors",
      "footprint_overlap",
      observedWorktreeCount,
      observedCausalSessionCount,
      observedActorCount,
      overlappingPathCount,
      "Multiple contributors appear to touch overlapping paths in the same live worktree without explicit handoff evidence.",
    );
  }

  if (current.explicitHandoff && current.contributorKeys.length > 1 && otherActiveWorktrees.length === 0) {
    return buildSummary(
      "exclusive",
      "explicit_handoff",
      observedWorktreeCount,
      observedCausalSessionCount,
      observedActorCount,
      overlappingPathCount,
      "Explicit attach or handoff evidence keeps the current live worktree on one lawful line of work.",
    );
  }

  if (current.contributorKeys.length > 1) {
    return buildSummary(
      "shared_worktree",
      "active_history_scan",
      observedWorktreeCount,
      observedCausalSessionCount,
      observedActorCount,
      overlappingPathCount,
      "Multiple contributors have been observed on the current live worktree, so ownership stays shared rather than exclusive.",
    );
  }

  if (otherActiveWorktrees.length > 0) {
    return buildSummary(
      "shared_repo_only",
      "repo_identity_only",
      observedWorktreeCount,
      observedCausalSessionCount,
      observedActorCount,
      overlappingPathCount,
      "Other active worktrees share the same canonical repo identity, but not this live worktree footing.",
    );
  }

  return buildSummary(
    "exclusive",
    "active_history_scan",
    observedWorktreeCount,
    observedCausalSessionCount,
    observedActorCount,
    overlappingPathCount,
    "No other active same-repo worktree or overlapping actor evidence is currently visible.",
  );
}

export function mergeRepoConcurrencySummaryWithLiveSessions(input: {
  readonly currentSummary: RepoConcurrencySummary;
  readonly currentRepoId: string;
  readonly currentWorktreeId: string;
  readonly currentCheckoutEpochId: string | null;
  readonly sessions: readonly RepoConcurrencyLiveSession[];
}): RepoConcurrencySummary {
  const liveRepoSessions = input.sessions.filter((session) =>
    session.bindState === "bound" &&
    session.repoId === input.currentRepoId &&
    session.worktreeId !== null
  );

  if (liveRepoSessions.length === 0) {
    return input.currentSummary;
  }

  const observedWorktreeCount = new Set(liveRepoSessions.map((session) => session.worktreeId)).size;
  const observedCausalSessionCount = new Set(
    liveRepoSessions
      .map((session) => session.causalSessionId)
      .filter((sessionId): sessionId is string => sessionId !== null),
  ).size;
  const summaryWithCounts = withObservedCounts(input.currentSummary, {
    observedWorktreeCount: Math.max(1, observedWorktreeCount),
    observedCausalSessionCount,
    observedActorCount: input.currentSummary.observedActorCount,
  });

  const currentWorktreeSessions = liveRepoSessions.filter((session) => session.worktreeId === input.currentWorktreeId);
  const otherWorktreeSessions = liveRepoSessions.filter((session) => session.worktreeId !== input.currentWorktreeId);

  if (
    otherWorktreeSessions.some((session) =>
      session.checkoutEpochId !== null &&
      input.currentCheckoutEpochId !== null &&
      session.checkoutEpochId !== input.currentCheckoutEpochId
    )
  ) {
    return {
      ...summaryWithCounts,
      posture: "divergent_checkout",
      authority: "daemon_live_sessions",
      summary: "Active same-repo daemon sessions are split across different checkout epochs or branches.",
    };
  }

  if (summaryWithCounts.posture === "overlapping_actors") {
    return summaryWithCounts;
  }

  if (currentWorktreeSessions.length > 1) {
    if (
      summaryWithCounts.posture === "exclusive" &&
      summaryWithCounts.authority === "explicit_handoff" &&
      otherWorktreeSessions.length === 0
    ) {
      return summaryWithCounts;
    }
    return {
      ...summaryWithCounts,
      posture: "shared_worktree",
      authority: "daemon_live_sessions",
      summary:
        "Multiple active daemon sessions share the current live worktree, so ownership stays shared rather than exclusive.",
    };
  }

  if (otherWorktreeSessions.length > 0) {
    return {
      ...summaryWithCounts,
      posture: "shared_repo_only",
      authority: "daemon_live_sessions",
      summary: "Other active daemon sessions share the same canonical repo identity, but not this live worktree footing.",
    };
  }

  return summaryWithCounts;
}

export function buildRepoConcurrencyContributorKey(input: {
  readonly actorId: string | null;
  readonly attribution: AttributionSummary;
  readonly causalSessionId: string | null;
  readonly transportSessionId: string | null;
}): string | null {
  if (input.actorId !== null && input.attribution.actor.actorKind !== "unknown") {
    return `actor:${input.actorId}`;
  }
  if (input.causalSessionId !== null) {
    return `causal:${input.causalSessionId}`;
  }
  if (input.transportSessionId !== null) {
    return `transport:${input.transportSessionId}`;
  }
  return null;
}

export function buildRepoConcurrencyTouches(events: readonly CausalEvent[]): RepoConcurrencyTouch[] {
  const touches: RepoConcurrencyTouch[] = [];
  for (const event of events) {
    const contributorKey = buildRepoConcurrencyContributorKey({
      actorId: event.actorId,
      attribution: event.attribution,
      causalSessionId: event.causalSessionId,
      transportSessionId: event.transportSessionId,
    });
    if (contributorKey === null) {
      continue;
    }
    for (const path of event.footprint.paths) {
      touches.push({ contributorKey, path });
    }
  }
  return touches;
}
