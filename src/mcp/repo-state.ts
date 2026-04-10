import * as crypto from "node:crypto";
import type { GitClient } from "../ports/git.js";
import type { FileSystem } from "../ports/filesystem.js";

export type WorldlineLayer = "commit_worldline" | "ref_view" | "workspace_overlay";
export type RepoTransitionKind = "checkout" | "reset" | "merge" | "rebase";
export type RepoSemanticTransitionKind =
  | "index_update"
  | "conflict_resolution"
  | "merge_phase"
  | "rebase_phase"
  | "bulk_transition"
  | "unknown";
export type RepoSemanticTransitionAuthority =
  | "authoritative_git_state"
  | "repo_snapshot";
export type RepoSemanticTransitionPhase =
  | "started"
  | "conflicted"
  | "resolved_waiting_commit"
  | "continued"
  | "completed_or_cleared";

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

export interface RepoSemanticTransition {
  readonly kind: RepoSemanticTransitionKind;
  readonly authority: RepoSemanticTransitionAuthority;
  readonly phase: RepoSemanticTransitionPhase | null;
  readonly summary: string;
  readonly evidence: {
    readonly totalPaths: number;
    readonly stagedPaths: number;
    readonly changedPaths: number;
    readonly untrackedPaths: number;
    readonly unmergedPaths: number;
    readonly mergeInProgress: boolean;
    readonly rebaseInProgress: boolean;
    readonly rebaseStep: number | null;
    readonly rebaseTotalSteps: number | null;
    readonly lastTransitionKind: RepoTransitionKind | null;
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
  readonly observedAt: string;
  readonly lastTransition: RepoTransition | null;
  readonly semanticTransition: RepoSemanticTransition | null;
  readonly workspaceOverlayId: string | null;
  readonly workspaceOverlay: WorkspaceOverlaySummary | null;
  readonly statusLines: readonly string[];
}

interface RebaseProgressState {
  readonly inProgress: boolean;
  readonly step: number | null;
  readonly total: number | null;
}

interface RepoSnapshot {
  readonly headRef: string | null;
  readonly headSha: string | null;
  readonly parentShas: readonly string[];
  readonly observedAt: string;
  readonly statusLines: readonly string[];
  readonly dirty: boolean;
  readonly stagedPaths: number;
  readonly changedPaths: number;
  readonly untrackedPaths: number;
  readonly unmergedPaths: number;
  readonly mergeInProgress: boolean;
  readonly rebase: RebaseProgressState;
  readonly headReflog: HeadReflogEntry | null;
}

interface HeadReflogEntry {
  readonly raw: string;
  readonly previousSha: string | null;
  readonly nextSha: string | null;
  readonly timestampSec: number | null;
  readonly subject: string;
}

function stableId(prefix: string, input: string): string {
  return `${prefix}:${crypto.createHash("sha256").update(input).digest("hex").slice(0, 16)}`;
}

async function git(gitClient: GitClient, args: readonly string[], cwd: string): Promise<string> {
  const result = await gitClient.run({ args, cwd });
  if (result.error !== undefined || result.status !== 0) {
    throw result.error ?? new Error(result.stderr.trim() || `git exited with status ${String(result.status)}`);
  }
  return result.stdout;
}

async function readGit(gitClient: GitClient, args: readonly string[], cwd: string): Promise<string | null> {
  try {
    const value = (await git(gitClient, args, cwd)).trim();
    return value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

async function readGitPorcelain(gitClient: GitClient, args: readonly string[], cwd: string): Promise<string | null> {
  try {
    const value = (await git(gitClient, args, cwd)).replace(/\r?\n$/, "");
    return value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

async function readGitLines(gitClient: GitClient, args: readonly string[], cwd: string): Promise<string[]> {
  const value = await readGitPorcelain(gitClient, args, cwd);
  return value === null ? [] : value.split("\n");
}

async function readGitPathText(
  fs: FileSystem,
  gitClient: GitClient,
  cwd: string,
  gitPath: string,
): Promise<string | null> {
  const resolvedPath = await readGit(gitClient, ["rev-parse", "--path-format=absolute", "--git-path", gitPath], cwd);
  if (resolvedPath === null) return null;

  try {
    const content = await fs.readFile(resolvedPath, "utf-8");
    const value = content.trim();
    return value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

function parseOptionalInt(value: string | null): number | null {
  if (value === null) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
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

async function countUnmergedPaths(gitClient: GitClient, cwd: string): Promise<number> {
  const paths = await readGitLines(gitClient, ["diff", "--name-only", "--diff-filter=U", "--"], cwd);
  return new Set(paths.filter((value) => value.length > 0)).size;
}

function mergeStatusLines(
  stagedLines: readonly string[],
  changedLines: readonly string[],
  untrackedLines: readonly string[],
): readonly string[] {
  const merged = new Map<string, { x: string; y: string }>();

  for (const line of stagedLines) {
    const parts = line.split("\t");
    const rawStatus = parts[0] ?? "";
    const filePath = parts.at(-1) ?? "";
    if (filePath.length === 0) continue;
    const existing = merged.get(filePath) ?? { x: " ", y: " " };
    existing.x = rawStatus[0] ?? "M";
    merged.set(filePath, existing);
  }

  for (const line of changedLines) {
    const parts = line.split("\t");
    const rawStatus = parts[0] ?? "";
    const filePath = parts.at(-1) ?? "";
    if (filePath.length === 0) continue;
    const existing = merged.get(filePath) ?? { x: " ", y: " " };
    existing.y = rawStatus[0] ?? "M";
    merged.set(filePath, existing);
  }

  for (const filePath of untrackedLines) {
    if (filePath.length === 0) continue;
    merged.set(filePath, { x: "?", y: "?" });
  }

  return [...merged.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([filePath, status]) => `${status.x}${status.y} ${filePath}`);
}

async function readParentShas(gitClient: GitClient, cwd: string, headSha: string | null): Promise<readonly string[]> {
  if (headSha === null) return [];
  const raw = await readGit(gitClient, ["show", "-s", "--format=%P", headSha], cwd);
  if (raw === null || raw.trim().length === 0) return [];
  return raw.trim().split(/\s+/).filter((sha) => sha.length > 0);
}

async function readMergeInProgress(
  fs: FileSystem,
  gitClient: GitClient,
  cwd: string,
): Promise<boolean> {
  return (await readGitPathText(fs, gitClient, cwd, "MERGE_HEAD")) !== null;
}

async function readRebaseProgressState(
  fs: FileSystem,
  gitClient: GitClient,
  cwd: string,
): Promise<RebaseProgressState> {
  const mergeHead = await readGitPathText(fs, gitClient, cwd, "rebase-merge/head-name");
  if (mergeHead !== null) {
    return {
      inProgress: true,
      step: parseOptionalInt(await readGitPathText(fs, gitClient, cwd, "rebase-merge/msgnum")),
      total: parseOptionalInt(await readGitPathText(fs, gitClient, cwd, "rebase-merge/end")),
    };
  }

  const applyHead = await readGitPathText(fs, gitClient, cwd, "rebase-apply/head-name");
  if (applyHead !== null) {
    return {
      inProgress: true,
      step: parseOptionalInt(await readGitPathText(fs, gitClient, cwd, "rebase-apply/next")),
      total: parseOptionalInt(await readGitPathText(fs, gitClient, cwd, "rebase-apply/last")),
    };
  }

  const rebaseHead = await readGitPathText(fs, gitClient, cwd, "REBASE_HEAD");
  return {
    inProgress: rebaseHead !== null,
    step: null,
    total: null,
  };
}

async function readHeadReflog(fs: FileSystem, gitClient: GitClient, cwd: string): Promise<HeadReflogEntry | null> {
  const reflogPath = await readGit(gitClient, ["rev-parse", "--path-format=absolute", "--git-path", "logs/HEAD"], cwd);
  if (reflogPath === null) return null;

  try {
    const content = await fs.readFile(reflogPath, "utf-8");
    const lines = content.split(/\r?\n/).map((line) => line.trimEnd());
    let raw: string | null = null;
    for (let index = lines.length - 1; index >= 0; index--) {
      const line = lines[index];
      if (line !== undefined && line.length > 0) {
        raw = line;
        break;
      }
    }
    if (raw === null) return null;
    const [meta = "", subject = ""] = raw.split("\t");
    const tokens = meta.split(" ");
    const previousSha = tokens[0] ?? null;
    const nextSha = tokens[1] ?? null;
    const timestampToken = tokens.length >= 2 ? tokens[tokens.length - 2] : undefined;
    const timestampSec = timestampToken !== undefined ? Number.parseInt(timestampToken, 10) : Number.NaN;

    return {
      raw,
      previousSha: previousSha !== null && /^[0-9a-f]{40}$/i.test(previousSha) ? previousSha : null,
      nextSha: nextSha !== null && /^[0-9a-f]{40}$/i.test(nextSha) ? nextSha : null,
      timestampSec: Number.isFinite(timestampSec) ? timestampSec : null,
      subject,
    };
  } catch {
    return null;
  }
}

async function isAncestor(
  gitClient: GitClient,
  cwd: string,
  possibleAncestor: string | null,
  possibleDescendant: string | null,
): Promise<boolean> {
  if (possibleAncestor === null || possibleDescendant === null) {
    return false;
  }
  const result = await gitClient.run({
    args: ["merge-base", "--is-ancestor", possibleAncestor, possibleDescendant],
    cwd,
  });
  return result.status === 0;
}

async function captureSnapshot(cwd: string, fs: FileSystem, gitClient: GitClient): Promise<RepoSnapshot> {
  const headSha = await readGit(gitClient, ["rev-parse", "HEAD"], cwd);
  const statusLines = mergeStatusLines(
    headSha === null ? [] : await readGitLines(gitClient, ["diff-index", "--cached", "--find-renames", "--name-status", headSha, "--"], cwd),
    await readGitLines(gitClient, ["diff-files", "--find-renames", "--name-status", "--"], cwd),
    await readGitLines(gitClient, ["ls-files", "--others", "--exclude-standard"], cwd),
  );
  const counts = countStatusLines(statusLines);
  const unmergedPaths = await countUnmergedPaths(gitClient, cwd);
  const mergeInProgress = await readMergeInProgress(fs, gitClient, cwd);
  const rebase = await readRebaseProgressState(fs, gitClient, cwd);

  return {
    headRef: await readGit(gitClient, ["symbolic-ref", "--quiet", "--short", "HEAD"], cwd),
    headSha,
    parentShas: await readParentShas(gitClient, cwd, headSha),
    observedAt: new Date().toISOString(),
    statusLines,
    dirty: statusLines.length > 0,
    ...counts,
    unmergedPaths,
    mergeInProgress,
    rebase,
    headReflog: await readHeadReflog(fs, gitClient, cwd),
  };
}

function buildWorkspaceOverlayId(snapshot: RepoSnapshot, checkoutEpoch: number): string | null {
  if (!snapshot.dirty) return null;
  return stableId("overlay", `${String(checkoutEpoch)}\n${snapshot.statusLines.join("\n")}`);
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
      reflogSubject: null,
      sample: snapshot.statusLines.slice(0, 10),
    },
  };
}

function buildSemanticTransitionEvidence(
  snapshot: RepoSnapshot,
  lastTransition: RepoTransition | null,
): RepoSemanticTransition["evidence"] {
  return {
    totalPaths: snapshot.statusLines.length,
    stagedPaths: snapshot.stagedPaths,
    changedPaths: snapshot.changedPaths,
    untrackedPaths: snapshot.untrackedPaths,
    unmergedPaths: snapshot.unmergedPaths,
    mergeInProgress: snapshot.mergeInProgress,
    rebaseInProgress: snapshot.rebase.inProgress,
    rebaseStep: snapshot.rebase.step,
    rebaseTotalSteps: snapshot.rebase.total,
    lastTransitionKind: lastTransition?.kind ?? null,
    reflogSubject: lastTransition?.evidence.reflogSubject ?? snapshot.headReflog?.subject ?? null,
  };
}

function buildSemanticTransitionSummary(
  kind: RepoSemanticTransitionKind,
  evidence: RepoSemanticTransition["evidence"],
  phase: RepoSemanticTransitionPhase | null,
): string {
  switch (kind) {
    case "merge_phase":
      switch (phase) {
        case "conflicted":
          return `Merge is in conflict across ${String(evidence.unmergedPaths)} path(s).`;
        case "resolved_waiting_commit":
          return "Merge conflicts are cleared and the merge is waiting for commit/admission.";
        case "completed_or_cleared":
          return "Merge transition completed or merge state has cleared.";
        case "started":
          return "Merge started and is now inspectable as active repo state.";
        case "continued":
          return "Merge progressed and remains active.";
        default:
          return "Merge state is active.";
      }
    case "rebase_phase":
      switch (phase) {
        case "conflicted":
          return `Rebase is in conflict across ${String(evidence.unmergedPaths)} path(s).`;
        case "continued":
          return evidence.rebaseStep !== null && evidence.rebaseTotalSteps !== null
            ? `Rebase continued at step ${String(evidence.rebaseStep)} of ${String(evidence.rebaseTotalSteps)}.`
            : "Rebase continued and remains active.";
        case "completed_or_cleared":
          return "Rebase transition completed or rebase state has cleared.";
        case "started":
          return "Rebase started and is now inspectable as active repo state.";
        case "resolved_waiting_commit":
          return "Rebase conflicts are cleared and the rebase is waiting for the next step.";
        default:
          return "Rebase state is active.";
      }
    case "conflict_resolution":
      return evidence.unmergedPaths > 0
        ? `Conflict posture is active across ${String(evidence.unmergedPaths)} path(s).`
        : "Conflict posture cleared after an explicit conflict-resolution movement.";
    case "index_update":
      return evidence.totalPaths > 1
        ? `Index/staging boundary changed across ${String(evidence.totalPaths)} path(s).`
        : "Index/staging boundary changed.";
    case "bulk_transition":
      if (
        evidence.stagedPaths === evidence.totalPaths
        && evidence.changedPaths === 0
        && evidence.untrackedPaths === 0
      ) {
        return `Bulk staging spans ${String(evidence.totalPaths)} path(s) at the index boundary.`;
      }
      if (
        evidence.changedPaths === evidence.totalPaths
        && evidence.stagedPaths === 0
        && evidence.untrackedPaths === 0
      ) {
        return `Bulk edit sweep spans ${String(evidence.totalPaths)} unstaged path(s).`;
      }
      return `Bulk transition movement spans ${String(evidence.totalPaths)} path(s) with ${String(evidence.stagedPaths)} staged and ${String(evidence.changedPaths)} unstaged changes.`;
    case "unknown":
      return "Repo/workspace movement is inspectable, but the semantic transition meaning remains unknown.";
  }
}

function buildSemanticTransition(
  previous: RepoSnapshot | null,
  current: RepoSnapshot,
  lastTransition: RepoTransition | null,
): RepoSemanticTransition | null {
  const evidence = buildSemanticTransitionEvidence(current, lastTransition);

  if (current.mergeInProgress) {
    return {
      kind: "merge_phase",
      authority: "authoritative_git_state",
      phase: current.unmergedPaths > 0 ? "conflicted" : "resolved_waiting_commit",
      summary: buildSemanticTransitionSummary(
        "merge_phase",
        evidence,
        current.unmergedPaths > 0 ? "conflicted" : "resolved_waiting_commit",
      ),
      evidence,
    };
  }

  if (current.rebase.inProgress) {
    const phase: RepoSemanticTransitionPhase = current.unmergedPaths > 0
      ? "conflicted"
      : ((current.rebase.step ?? 1) > 1 ? "continued" : "started");
    return {
      kind: "rebase_phase",
      authority: "authoritative_git_state",
      phase,
      summary: buildSemanticTransitionSummary("rebase_phase", evidence, phase),
      evidence,
    };
  }

  const unmergedChanged = previous !== null && previous.unmergedPaths !== current.unmergedPaths;
  if (current.unmergedPaths > 0 || unmergedChanged) {
    return {
      kind: "conflict_resolution",
      authority: "authoritative_git_state",
      phase: null,
      summary: buildSemanticTransitionSummary("conflict_resolution", evidence, null),
      evidence,
    };
  }

  if (lastTransition?.kind === "merge") {
    return {
      kind: "merge_phase",
      authority: "repo_snapshot",
      phase: "completed_or_cleared",
      summary: buildSemanticTransitionSummary("merge_phase", evidence, "completed_or_cleared"),
      evidence,
    };
  }

  if (lastTransition?.kind === "rebase") {
    return {
      kind: "rebase_phase",
      authority: "repo_snapshot",
      phase: "completed_or_cleared",
      summary: buildSemanticTransitionSummary("rebase_phase", evidence, "completed_or_cleared"),
      evidence,
    };
  }

  if (current.statusLines.length >= 8) {
    return {
      kind: "bulk_transition",
      authority: "repo_snapshot",
      phase: null,
      summary: buildSemanticTransitionSummary("bulk_transition", evidence, null),
      evidence,
    };
  }

  if (current.stagedPaths > 0) {
    return {
      kind: "index_update",
      authority: "repo_snapshot",
      phase: null,
      summary: buildSemanticTransitionSummary("index_update", evidence, null),
      evidence,
    };
  }

  if (current.statusLines.length > 0) {
    return {
      kind: "unknown",
      authority: "repo_snapshot",
      phase: null,
      summary: buildSemanticTransitionSummary("unknown", evidence, null),
      evidence,
    };
  }

  return null;
}

function buildObservation(
  snapshot: RepoSnapshot,
  checkoutEpoch: number,
  lastTransition: RepoTransition | null,
  semanticTransition: RepoSemanticTransition | null,
): RepoObservation {
  return {
    checkoutEpoch,
    headRef: snapshot.headRef,
    headSha: snapshot.headSha,
    dirty: snapshot.dirty,
    observedAt: snapshot.observedAt,
    lastTransition,
    semanticTransition,
    workspaceOverlayId: buildWorkspaceOverlayId(snapshot, checkoutEpoch),
    workspaceOverlay: buildWorkspaceOverlay(snapshot),
    statusLines: snapshot.statusLines,
  };
}

function samePosition(a: RepoSnapshot, b: RepoSnapshot): boolean {
  return a.headRef === b.headRef && a.headSha === b.headSha;
}

async function detectTransition(
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

  constructor(
    private readonly cwd: string,
    private readonly fs: FileSystem,
    private readonly gitClient: GitClient,
  ) {}

  async observe(): Promise<RepoObservation> {
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
    return this.observation;
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
}
