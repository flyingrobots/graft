import type { RuntimeCausalContext } from "../runtime-causal-context.js";
import type { WorkspaceStatus } from "../workspace-router.js";
import { cloneCapabilityProfile } from "./authz-storage.js";
import type {
  DaemonSessionView,
  RegisteredTransport,
  SharedAttachSource,
} from "./types.js";

// ---------------------------------------------------------------------------
// Session view projection
// ---------------------------------------------------------------------------

export function toDaemonSessionView(
  session: RegisteredTransport,
  readWorkspaceStatus: (s: RegisteredTransport) => WorkspaceStatus,
  readRuntimeCausalContext: (s: RegisteredTransport) => RuntimeCausalContext | null,
): DaemonSessionView {
  const status = readWorkspaceStatus(session);
  const causalContext = readRuntimeCausalContext(session);
  return {
    sessionId: session.sessionId,
    sessionMode: "daemon",
    bindState: status.bindState,
    repoId: status.repoId,
    worktreeId: status.worktreeId,
    worktreeRoot: status.worktreeRoot,
    causalSessionId: causalContext?.causalSessionId ?? null,
    checkoutEpochId: causalContext?.checkoutEpochId ?? null,
    capabilityProfile: status.capabilityProfile === null ? null : cloneCapabilityProfile(status.capabilityProfile),
    startedAt: session.startedAt,
    lastActivityAt: session.lastActivityAt,
  };
}

// ---------------------------------------------------------------------------
// Workspace status & causal context safe readers
// ---------------------------------------------------------------------------

export function readWorkspaceStatus(session: RegisteredTransport): WorkspaceStatus {
  try {
    return session.getWorkspaceStatus();
  } catch {
    return {
      sessionMode: "daemon",
      bindState: "unbound",
      repoId: null,
      worktreeId: null,
      worktreeRoot: null,
      gitCommonDir: null,
      graftDir: null,
      capabilityProfile: null,
    };
  }
}

export function readRuntimeCausalContext(session: RegisteredTransport): RuntimeCausalContext | null {
  try {
    return session.getRuntimeCausalContext();
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Shared attach resolution
// ---------------------------------------------------------------------------

export function resolveSharedAttachSource(
  sessions: ReadonlyMap<string, RegisteredTransport>,
  input: {
    readonly sessionId: string;
    readonly repoId: string;
    readonly worktreeId: string;
  },
): SharedAttachSource | null {
  const candidates = [...sessions.values()]
    .filter((session) => session.sessionId !== input.sessionId)
    .flatMap((session) => {
      const status = readWorkspaceStatus(session);
      if (
        status.bindState !== "bound" ||
        status.repoId !== input.repoId ||
        status.worktreeId !== input.worktreeId
      ) {
        return [];
      }
      const causalContext = readRuntimeCausalContext(session);
      if (causalContext === null) {
        return [];
      }
      return [{
        sourceSessionId: session.sessionId,
        causalSessionId: causalContext.causalSessionId,
        strandId: causalContext.strandId,
        lastActivityAt: session.lastActivityAt,
      }];
    })
    .sort((left, right) => right.lastActivityAt.localeCompare(left.lastActivityAt));

  if (candidates.length !== 1) {
    return null;
  }

  const [source] = candidates;
  if (source === undefined) {
    return null;
  }

  return {
    sourceSessionId: source.sourceSessionId,
    causalSessionId: source.causalSessionId,
    strandId: source.strandId,
  };
}
