// ---------------------------------------------------------------------------
// Refactor Difficulty — curvature x friction over WARP facts
// ---------------------------------------------------------------------------

import type { AggregateResult, QueryResultV1 } from "@git-stunts/git-warp";
import type { WarpContext } from "./context.js";
import { observeGraph } from "./context.js";
import { symbolTimeline, type SymbolVersion } from "./symbol-timeline.js";
import { countSymbolReferencesFromGraph } from "./warp-reference-count.js";

const CHANGE_EDGE_LABELS = ["adds", "changes", "removes"] as const;

export type RefactorDifficultyRisk = "low" | "medium" | "high";

export type RefactorDifficultyRecommendation =
  | "refactor_freely"
  | "refactor_with_tests"
  | "plan_before_refactor";

export interface RefactorDifficultyOptions {
  readonly symbol: string;
  readonly path?: string | undefined;
  readonly limit?: number | undefined;
}

export interface RefactorDifficultyAxis {
  readonly score: number;
}

export interface RefactorDifficultyCurvature extends RefactorDifficultyAxis {
  readonly changeCount: number;
  readonly signatureChangeCount: number;
}

export interface RefactorDifficultyFriction extends RefactorDifficultyAxis {
  readonly referenceCount: number;
  readonly referencingFiles: readonly string[];
}

export interface RefactorDifficultyEntry {
  readonly symbol: string;
  readonly filePath: string;
  readonly kind: string;
  readonly score: number;
  readonly risk: RefactorDifficultyRisk;
  readonly recommendation: RefactorDifficultyRecommendation;
  readonly curvature: RefactorDifficultyCurvature;
  readonly friction: RefactorDifficultyFriction;
}

export interface RefactorDifficultyResult {
  readonly symbol: string;
  readonly path?: string | undefined;
  readonly entries: readonly RefactorDifficultyEntry[];
  readonly total: number;
  readonly summary: string;
}

interface SymbolCandidate {
  readonly id: string;
  readonly symbol: string;
  readonly filePath: string;
  readonly kind: string;
}

export async function refactorDifficultyFromGraph(
  ctx: WarpContext,
  options: RefactorDifficultyOptions,
): Promise<RefactorDifficultyResult> {
  const symbol = options.symbol.trim();
  if (symbol.length === 0) {
    throw new Error("refactorDifficultyFromGraph: symbol must be non-empty");
  }

  const pathFilter = normalizeOptionalPath(options.path);
  const limit = options.limit ?? 20;
  const candidates = await findSymbolCandidates(ctx, symbol, pathFilter);
  const entries = await Promise.all(
    candidates.map((candidate) => scoreCandidate(ctx, candidate)),
  );

  const sorted = entries.sort(compareDifficultyEntries).slice(0, limit);
  const top = sorted[0];
  const summary = top === undefined
    ? `No indexed symbols matched ${symbol}.`
    : `${String(entries.length)} symbol matches. Highest difficulty: ${top.symbol} in ${top.filePath} (${String(top.score)}).`;

  return {
    symbol,
    ...(pathFilter !== undefined ? { path: pathFilter } : {}),
    entries: sorted,
    total: entries.length,
    summary,
  };
}

async function findSymbolCandidates(
  ctx: WarpContext,
  symbol: string,
  pathFilter: string | undefined,
): Promise<SymbolCandidate[]> {
  const obs = await observeGraph(ctx, {
    match: "sym:*",
    expose: ["name", "kind", "filePath"],
  });

  const result = await obs.query()
    .match("sym:*")
    .where((node) => {
      const parsed = parseSymId(node.id);
      if (parsed === null) return false;
      if (!matchesPathFilter(parsed.filePath, pathFilter)) return false;

      const propName = typeof node.props["name"] === "string" ? node.props["name"] : "";
      return parsed.symbol === symbol || propName === symbol;
    })
    .select(["id", "props"])
    .run() as QueryResultV1;

  const candidates: SymbolCandidate[] = [];
  for (const node of result.nodes) {
    if (node.id === undefined) continue;
    const parsed = parseSymId(node.id);
    if (parsed === null) continue;

    candidates.push({
      id: node.id,
      symbol: parsed.symbol,
      filePath: parsed.filePath,
      kind: typeof node.props?.["kind"] === "string" ? node.props["kind"] : "unknown",
    });
  }
  return candidates;
}

async function scoreCandidate(
  ctx: WarpContext,
  candidate: SymbolCandidate,
): Promise<RefactorDifficultyEntry> {
  const [changeCount, timeline, references] = await Promise.all([
    countSymbolTouches(ctx, candidate.id),
    symbolTimeline(ctx, candidate.symbol, candidate.filePath),
    countSymbolReferencesFromGraph(ctx, candidate.symbol, candidate.filePath),
  ]);

  const signatureChangeCount = countSignatureChanges(timeline.versions);
  const curvatureScore = changeCount + signatureChangeCount;
  const frictionScore = references.referenceCount;
  const score = curvatureScore * frictionScore;

  return {
    symbol: candidate.symbol,
    filePath: candidate.filePath,
    kind: candidate.kind,
    score,
    risk: riskForScore(score),
    recommendation: recommendationForScore(score),
    curvature: {
      changeCount,
      signatureChangeCount,
      score: curvatureScore,
    },
    friction: {
      referenceCount: references.referenceCount,
      referencingFiles: references.referencingFiles,
      score: frictionScore,
    },
  };
}

async function countSymbolTouches(
  ctx: WarpContext,
  symId: string,
): Promise<number> {
  const obs = await observeGraph(ctx, {
    match: ["commit:*", "sym:*"],
    expose: ["tick"],
  });

  const counts = await Promise.all(CHANGE_EDGE_LABELS.map(async (label): Promise<number> => {
    const result = await obs.query()
      .match("commit:*")
      .where((node) => node.edgesOut.some((edge) => edge.label === label && edge.to === symId))
      .aggregate({ count: true })
      .run() as AggregateResult;
    return result.count ?? 0;
  }));

  return counts.reduce((sum, count) => sum + count, 0);
}

function countSignatureChanges(versions: readonly SymbolVersion[]): number {
  let lastSignature: string | undefined;
  let changes = 0;

  for (const version of versions) {
    if (version.signature === undefined) continue;
    if (lastSignature === undefined) {
      lastSignature = version.signature;
      continue;
    }
    if (version.signature !== lastSignature) {
      changes++;
      lastSignature = version.signature;
    }
  }

  return changes;
}

function riskForScore(score: number): RefactorDifficultyRisk {
  if (score >= 12) return "high";
  if (score >= 4) return "medium";
  return "low";
}

function recommendationForScore(score: number): RefactorDifficultyRecommendation {
  if (score >= 12) return "plan_before_refactor";
  if (score >= 4) return "refactor_with_tests";
  return "refactor_freely";
}

function compareDifficultyEntries(
  left: RefactorDifficultyEntry,
  right: RefactorDifficultyEntry,
): number {
  return right.score - left.score ||
    right.curvature.score - left.curvature.score ||
    right.friction.score - left.friction.score ||
    left.filePath.localeCompare(right.filePath) ||
    left.symbol.localeCompare(right.symbol);
}

function parseSymId(symId: string): { filePath: string; symbol: string } | null {
  if (!symId.startsWith("sym:")) return null;

  const withoutPrefix = symId.slice("sym:".length);
  const lastColon = withoutPrefix.lastIndexOf(":");
  if (lastColon === -1) return null;

  return {
    filePath: withoutPrefix.slice(0, lastColon),
    symbol: withoutPrefix.slice(lastColon + 1),
  };
}

function normalizeOptionalPath(path: string | undefined): string | undefined {
  if (path === undefined) return undefined;
  const trimmed = path.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function matchesPathFilter(filePath: string, pathFilter: string | undefined): boolean {
  return pathFilter === undefined ||
    filePath === pathFilter ||
    filePath.startsWith(`${pathFilter}/`);
}
