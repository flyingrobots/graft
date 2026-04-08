import type { GitClient } from "../ports/git.js";

export type WorldlineLayer = "commit_worldline" | "ref_view" | "workspace_overlay";
export type RepoTransitionKind = "checkout" | "reset" | "merge" | "rebase";

export interface RepoTransition {
  readonly kind: RepoTransitionKind;
  readonly fromRef: string | null;
  readonly toRef: string | null;
  readonly fromCommit: string | null;
  readonly toCommit: string | null;
  readonly evidence: {
    readonly reflogSubject: string | null;
  };
}

export interface WorkspaceOverlaySummary {
  readonly dirty: true;
  readonly totalPaths: number;
  readonly stagedPaths: number;
  readonly changedPaths: number;
  readonly untrackedPaths: number;
  readonly actorGuess: "unknown";
  readonly confidence: "low";
  readonly evidence: {
    readonly source: "git status --porcelain";
    readonly reflogSubject: string | null;
    readonly sample: readonly string[];
  };
}

export interface RepoObservation {
  readonly checkoutEpoch: number;
  readonly headRef: string | null;
  readonly headSha: string | null;
  readonly dirty: boolean;
  readonly lastTransition: RepoTransition | null;
  readonly workspaceOverlay: WorkspaceOverlaySummary | null;
}

interface RepoSnapshot {
  readonly headRef: string | null;
  readonly headSha: string | null;
  readonly reflogSubject: string | null;
  readonly statusLines: readonly string[];
  readonly dirty: boolean;
  readonly stagedPaths: number;
  readonly changedPaths: number;
  readonly untrackedPaths: number;
}

function git(gitClient: GitClient, args: readonly string[], cwd: string): string {
  const result = gitClient.run({ args, cwd });
  if (result.error !== undefined || result.status !== 0) {
    throw result.error ?? new Error(result.stderr.trim() || `git exited with status ${String(result.status)}`);
  }
  return result.stdout;
}

function readGit(gitClient: GitClient, args: readonly string[], cwd: string): string | null {
  try {
    const value = git(gitClient, args, cwd).trim();
    return value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

function readGitPorcelain(gitClient: GitClient, args: readonly string[], cwd: string): string | null {
  try {
    const value = git(gitClient, args, cwd).replace(/\r?\n$/, "");
    return value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

function countStatusLines(statusLines: readonly string[]): {
  stagedPaths: number;
  changedPaths: number;
  untrackedPaths: number;
} {
  let stagedPaths = 0;
  let changedPaths = 0;
  let untrackedPaths = 0;

  for (const statusLine of statusLines) {
    const x = statusLine[0] ?? " ";
    const y = statusLine[1] ?? " ";
    if (x === "?" && y === "?") {
      untrackedPaths++;
      continue;
    }
    if (x !== " ") stagedPaths++;
    if (y !== " ") changedPaths++;
  }

  return { stagedPaths, changedPaths, untrackedPaths };
}

function captureSnapshot(cwd: string, gitClient: GitClient): RepoSnapshot {
  const statusOutput = readGitPorcelain(gitClient, ["status", "--porcelain"], cwd) ?? "";
  const statusLines = statusOutput.length === 0 ? [] : statusOutput.split("\n");
  const counts = countStatusLines(statusLines);

  return {
    headRef: readGit(gitClient, ["symbolic-ref", "--quiet", "--short", "HEAD"], cwd),
    headSha: readGit(gitClient, ["rev-parse", "HEAD"], cwd),
    reflogSubject: readGit(gitClient, ["reflog", "-1", "--format=%gs"], cwd),
    statusLines,
    dirty: statusLines.length > 0,
    ...counts,
  };
}

function buildWorkspaceOverlay(snapshot: RepoSnapshot): WorkspaceOverlaySummary | null {
  if (!snapshot.dirty) return null;
  return {
    dirty: true,
    totalPaths: snapshot.statusLines.length,
    stagedPaths: snapshot.stagedPaths,
    changedPaths: snapshot.changedPaths,
    untrackedPaths: snapshot.untrackedPaths,
    actorGuess: "unknown",
    confidence: "low",
    evidence: {
      source: "git status --porcelain",
      reflogSubject: snapshot.reflogSubject,
      sample: snapshot.statusLines.slice(0, 10),
    },
  };
}

function buildObservation(
  snapshot: RepoSnapshot,
  checkoutEpoch: number,
  lastTransition: RepoTransition | null,
): RepoObservation {
  return {
    checkoutEpoch,
    headRef: snapshot.headRef,
    headSha: snapshot.headSha,
    dirty: snapshot.dirty,
    lastTransition,
    workspaceOverlay: buildWorkspaceOverlay(snapshot),
  };
}

function samePosition(a: RepoSnapshot, b: RepoSnapshot): boolean {
  return a.headRef === b.headRef && a.headSha === b.headSha;
}

function detectTransition(previous: RepoSnapshot, current: RepoSnapshot): RepoTransition | null {
  if (samePosition(previous, current)) return null;

  const subject = current.reflogSubject;
  if (subject?.startsWith("reset:") === true) {
    return {
      kind: "reset",
      fromRef: previous.headRef,
      toRef: current.headRef,
      fromCommit: previous.headSha,
      toCommit: current.headSha,
      evidence: { reflogSubject: subject },
    };
  }

  if (/^rebase(?:\b|\s|:|\()/.test(subject ?? "")) {
    return {
      kind: "rebase",
      fromRef: previous.headRef,
      toRef: current.headRef,
      fromCommit: previous.headSha,
      toCommit: current.headSha,
      evidence: { reflogSubject: subject },
    };
  }

  const mergeMatch = subject?.match(/^merge\s+(.+?)(?::|$)/);
  if (mergeMatch !== null && mergeMatch !== undefined) {
    return {
      kind: "merge",
      fromRef: mergeMatch[1] ?? previous.headRef,
      toRef: current.headRef,
      fromCommit: previous.headSha,
      toCommit: current.headSha,
      evidence: { reflogSubject: subject },
    };
  }

  if (subject?.startsWith("checkout:") === true || previous.headRef !== current.headRef) {
    return {
      kind: "checkout",
      fromRef: previous.headRef,
      toRef: current.headRef,
      fromCommit: previous.headSha,
      toCommit: current.headSha,
      evidence: { reflogSubject: subject },
    };
  }

  return null;
}

export class RepoStateTracker {
  private checkoutEpoch = 0;
  private snapshot: RepoSnapshot;
  private observation: RepoObservation;

  constructor(
    private readonly cwd: string,
    private readonly gitClient: GitClient,
  ) {
    this.snapshot = captureSnapshot(cwd, gitClient);
    this.observation = buildObservation(this.snapshot, this.checkoutEpoch, null);
  }

  observe(): RepoObservation {
    const nextSnapshot = captureSnapshot(this.cwd, this.gitClient);
    const transition = detectTransition(this.snapshot, nextSnapshot);
    if (transition !== null) {
      this.checkoutEpoch++;
    }

    this.snapshot = nextSnapshot;
    this.observation = buildObservation(
      nextSnapshot,
      this.checkoutEpoch,
      transition ?? this.observation.lastTransition,
    );
    return this.observation;
  }

  getState(): RepoObservation {
    return this.observation;
  }
}
