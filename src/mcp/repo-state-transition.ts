import type { GitClient } from "../ports/git.js";
import type { RepoSnapshot, RepoTransition } from "./repo-state-types.js";
import { isAncestor } from "./repo-state-git.js";

function samePosition(a: RepoSnapshot, b: RepoSnapshot): boolean {
  return a.headRef === b.headRef && a.headSha === b.headSha;
}

function parseCheckoutTarget(value: string): string | null {
  if (/^[0-9a-f]{7,40}$/i.test(value)) {
    return null;
  }
  return value;
}

function parseTransitionFromReflog(
  previous: RepoSnapshot,
  current: RepoSnapshot,
  bootstrapTimestampSec: number,
  allowBootstrap: boolean,
): RepoTransition | null {
  const entry = current.headReflog;
  if (entry === null) {
    return null;
  }
  const hasFreshReflog = previous.headReflog?.raw !== entry.raw;
  const bootstrapEligible = allowBootstrap && entry.timestampSec !== null && entry.timestampSec >= bootstrapTimestampSec;
  if (!hasFreshReflog && !bootstrapEligible) {
    return null;
  }

  const checkout = /^checkout: moving from (.+) to (.+)$/.exec(entry.subject);
  if (checkout !== null) {
    const fromRef = checkout[1];
    const toTarget = checkout[2];
    if (fromRef === undefined || toTarget === undefined) {
      return null;
    }
    const toRef = parseCheckoutTarget(toTarget);
    return {
      kind: "checkout",
      fromRef,
      toRef,
      fromCommit: entry.previousSha,
      toCommit: entry.nextSha ?? current.headSha,
      evidence: { reflogSubject: entry.subject },
    };
  }

  const merge = /^merge ([^:]+):/.exec(entry.subject);
  if (merge !== null) {
    const fromRef = merge[1];
    if (fromRef === undefined) {
      return null;
    }
    return {
      kind: "merge",
      fromRef,
      toRef: current.headRef,
      fromCommit: entry.previousSha,
      toCommit: entry.nextSha ?? current.headSha,
      evidence: { reflogSubject: entry.subject },
    };
  }

  if (entry.subject.startsWith("reset: ")) {
    return {
      kind: "reset",
      fromRef: previous.headRef,
      toRef: current.headRef,
      fromCommit: entry.previousSha,
      toCommit: entry.nextSha ?? current.headSha,
      evidence: { reflogSubject: entry.subject },
    };
  }

  if (entry.subject.startsWith("rebase (")) {
    return {
      kind: "rebase",
      fromRef: previous.headRef,
      toRef: current.headRef,
      fromCommit: entry.previousSha,
      toCommit: entry.nextSha ?? current.headSha,
      evidence: { reflogSubject: entry.subject },
    };
  }

  return null;
}

export async function detectTransition(
  gitClient: GitClient,
  cwd: string,
  previous: RepoSnapshot,
  current: RepoSnapshot,
  bootstrapTimestampSec: number,
  allowBootstrap: boolean,
): Promise<RepoTransition | null> {
  const reflogTransition = parseTransitionFromReflog(previous, current, bootstrapTimestampSec, allowBootstrap);
  if (reflogTransition !== null) {
    return reflogTransition;
  }

  if (samePosition(previous, current)) return null;

  if (previous.headRef !== current.headRef) {
    return {
      kind: "checkout",
      fromRef: previous.headRef,
      toRef: current.headRef,
      fromCommit: previous.headSha,
      toCommit: current.headSha,
      evidence: { reflogSubject: null },
    };
  }

  if (current.parentShas.length > 1 && previous.headSha !== null && current.parentShas.includes(previous.headSha)) {
    return {
      kind: "merge",
      fromRef: previous.headRef,
      toRef: current.headRef,
      fromCommit: previous.headSha,
      toCommit: current.headSha,
      evidence: { reflogSubject: null },
    };
  }

  if (await isAncestor(gitClient, cwd, current.headSha, previous.headSha)) {
    return {
      kind: "reset",
      fromRef: previous.headRef,
      toRef: current.headRef,
      fromCommit: previous.headSha,
      toCommit: current.headSha,
      evidence: { reflogSubject: null },
    };
  }

  if (!(await isAncestor(gitClient, cwd, previous.headSha, current.headSha))) {
    return {
      kind: "rebase",
      fromRef: previous.headRef,
      toRef: current.headRef,
      fromCommit: previous.headSha,
      toCommit: current.headSha,
      evidence: { reflogSubject: null },
    };
  }

  return null;
}
