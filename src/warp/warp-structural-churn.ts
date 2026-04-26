// ---------------------------------------------------------------------------
// WARP-based Structural Churn — aggregate-backed graph query
// ---------------------------------------------------------------------------

import type { AggregateResult, QueryResultV1, TickReceipt } from "@git-stunts/git-warp";
import type { WarpContext } from "./context.js";
import { observeGraph } from "./context.js";
import type { ChurnEntry, StructuralChurnResult } from "../operations/structural-churn.js";

/** Options for WARP-based churn analysis. */
export interface WarpChurnOptions {
  readonly limit?: number;
  readonly path?: string;
}

const CHANGE_EDGE_LABELS = ["adds", "changes", "removes"] as const;
type ChangeEdgeLabel = typeof CHANGE_EDGE_LABELS[number];

interface ChurnCandidate {
  readonly id: string;
  readonly symbol: string;
  readonly filePath: string;
  readonly kind: string;
}

interface ChurnDiscovery {
  readonly candidates: readonly ChurnCandidate[];
  readonly receipts: readonly TickReceipt[];
}

/**
 * Compute structural churn entirely from the WARP graph.
 *
 * The count itself is computed with QueryBuilder.aggregate() over
 * commit nodes whose outgoing structural-change edges touch each symbol.
 * This keeps commit enumeration and per-symbol count accumulation inside
 * WARP instead of walking every commit in this operation.
 */
export async function structuralChurnFromGraph(
  ctx: WarpContext,
  options?: WarpChurnOptions,
): Promise<StructuralChurnResult> {
  const limit = options?.limit ?? 20;
  const pathFilter = options?.path;

  const obs = await observeGraph(ctx, {
    match: ["commit:*", "sym:*"],
    expose: ["sha", "tick", "name", "kind"],
  });

  const totalCommitsAnalyzed = await countCommits(obs);
  if (totalCommitsAnalyzed === 0) {
    return { entries: [], totalSymbols: 0, totalCommitsAnalyzed: 0, summary: "No indexed commits." };
  }

  const discovery = await discoverChurnCandidates(ctx, obs, pathFilter);
  const scored = await Promise.all(discovery.candidates.map(async (candidate): Promise<ChurnEntry | null> => {
    const touch = await aggregateTouchesForSymbol(obs, candidate.id, discovery.receipts);
    if (touch.changeCount === 0 || touch.lastChangedTick === null) return null;

    return {
      symbol: candidate.symbol,
      filePath: candidate.filePath,
      kind: candidate.kind,
      changeCount: touch.changeCount,
      lastChangedSha: await shaForTick(obs, touch.lastChangedTick),
      lastChangedDate: "",
    };
  }));

  const sorted = scored
    .filter((entry): entry is ChurnEntry => entry !== null)
    .sort((a, b) => b.changeCount - a.changeCount);

  const entries = sorted.slice(0, limit);
  const top = entries[0];
  const topName = top?.symbol ?? "none";
  const topCount = top?.changeCount ?? 0;
  const summary = entries.length === 0
    ? "No structural changes found."
    : `${String(sorted.length)} symbols across ${String(totalCommitsAnalyzed)} commits. Hottest: ${topName} (${String(topCount)} changes).`;

  return {
    entries,
    totalSymbols: sorted.length,
    totalCommitsAnalyzed,
    summary,
  };
}

async function countCommits(
  obs: Awaited<ReturnType<typeof observeGraph>>,
): Promise<number> {
  const result = await obs.query()
    .match("commit:*")
    .aggregate({ count: true })
    .run() as AggregateResult;
  return result.count ?? 0;
}

async function discoverChurnCandidates(
  ctx: WarpContext,
  obs: Awaited<ReturnType<typeof observeGraph>>,
  pathFilter: string | undefined,
): Promise<ChurnDiscovery> {
  const candidates: ChurnCandidate[] = [];

  const current = await obs.query()
    .match("sym:*")
    .select(["id", "props"])
    .run() as QueryResultV1;

  for (const node of current.nodes) {
    if (node.id === undefined) continue;
    const parsed = parseSymId(node.id);
    if (parsed === null) continue;
    if (!matchesPathFilter(parsed.filePath, pathFilter)) continue;

    candidates.push({
      id: node.id,
      symbol: parsed.symbol,
      filePath: parsed.filePath,
      kind: typeof node.props?.["kind"] === "string" ? node.props["kind"] : "unknown",
    });
  }

  const { receipts } = await ctx.app.core().materialize({ receipts: true });
  for (const symId of removedSymIds(receipts)) {
    if (candidates.some((candidate) => candidate.id === symId)) continue;

    const parsed = parseSymId(symId);
    if (parsed === null) continue;
    if (!matchesPathFilter(parsed.filePath, pathFilter)) continue;

    candidates.push({
      id: symId,
      symbol: parsed.symbol,
      filePath: parsed.filePath,
      kind: await removedSymbolKind(ctx, symId, receipts),
    });
  }

  return { candidates, receipts };
}

function removedSymIds(receipts: readonly TickReceipt[]): string[] {
  const ids: string[] = [];
  for (const receipt of receipts) {
    for (const op of receipt.ops) {
      if (op.op !== "NodeTombstone" || op.result !== "applied" || !op.target.startsWith("sym:")) continue;
      if (!ids.includes(op.target)) {
        ids.push(op.target);
      }
    }
  }
  return ids;
}

async function removedSymbolKind(
  ctx: WarpContext,
  symId: string,
  receipts: readonly TickReceipt[],
): Promise<string> {
  const removalTicks = receipts
    .filter((receipt) => receipt.ops.some((op) =>
      op.op === "NodeTombstone" &&
      op.result === "applied" &&
      op.target === symId,
    ))
    .map((receipt) => receipt.lamport)
    .sort((a, b) => b - a);

  const lastRemovalTick = removalTicks[0];
  if (lastRemovalTick === undefined || lastRemovalTick <= 1) return "unknown";

  const beforeRemoval = await observeGraph(
    ctx,
    { match: symId, expose: ["kind"] },
    { source: { kind: "live", ceiling: lastRemovalTick - 1 } },
  );
  const props = await beforeRemoval.getNodeProps(symId);
  return typeof props?.["kind"] === "string" ? props["kind"] : "unknown";
}

async function aggregateTouchesForSymbol(
  obs: Awaited<ReturnType<typeof observeGraph>>,
  symId: string,
  receipts: readonly TickReceipt[],
): Promise<{ changeCount: number; lastChangedTick: number | null }> {
  const aggregates = await Promise.all(
    CHANGE_EDGE_LABELS.map((label) => aggregateTouchesForLabel(obs, symId, label)),
  );

  const changeCount = aggregates.reduce((sum, result) => sum + result.count, 0);
  const lastChangedTick = aggregates.reduce<number | null>((latest, result) => {
    if (result.maxTick === null) return latest;
    if (latest === null || result.maxTick > latest) return result.maxTick;
    return latest;
  }, null);

  if (changeCount > 0) {
    return { changeCount, lastChangedTick };
  }

  // QueryBuilder starts from live node sets; a tombstoned sym can be
  // discovered from tick receipts but cannot be matched as a live node.
  // Use the receipt edge-add outcomes as the WARP-native fallback for
  // symbols whose final state is removed.
  return receiptTouchesForSymbol(symId, receipts);
}

async function aggregateTouchesForLabel(
  obs: Awaited<ReturnType<typeof observeGraph>>,
  symId: string,
  label: ChangeEdgeLabel,
): Promise<{ count: number; maxTick: number | null }> {
  const result = await obs.query()
    .match("commit:*")
    .where((node) => node.edgesOut.some((edge) => edge.label === label && edge.to === symId))
    .aggregate({ count: true, max: "tick" })
    .run() as AggregateResult;

  return {
    count: result.count ?? 0,
    maxTick: typeof result.max === "number" && result.max > 0 ? result.max : null,
  };
}

async function shaForTick(
  obs: Awaited<ReturnType<typeof observeGraph>>,
  tick: number,
): Promise<string> {
  const result = await obs.query()
    .match("commit:*")
    .where({ tick })
    .select(["id", "props"])
    .run() as QueryResultV1;

  const commit = result.nodes[0];
  if (commit === undefined) return "";
  return typeof commit.props?.["sha"] === "string"
    ? commit.props["sha"]
    : commit.id?.slice("commit:".length) ?? "";
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

function matchesPathFilter(filePath: string, pathFilter: string | undefined): boolean {
  return pathFilter === undefined || filePath.startsWith(pathFilter);
}

function receiptTouchesForSymbol(
  symId: string,
  receipts: readonly TickReceipt[],
): { changeCount: number; lastChangedTick: number | null } {
  let changeCount = 0;
  let lastChangedTick: number | null = null;

  for (const receipt of receipts) {
    for (const op of receipt.ops) {
      if (op.op !== "EdgeAdd" || op.result !== "applied") continue;
      if (!isChangeEdgeToSymbol(op.target, symId)) continue;

      changeCount++;
      if (lastChangedTick === null || receipt.lamport > lastChangedTick) {
        lastChangedTick = receipt.lamport;
      }
    }
  }

  return { changeCount, lastChangedTick };
}

function isChangeEdgeToSymbol(edgeKey: string, symId: string): boolean {
  const [from, to, label] = edgeKey.split("\0");
  return from?.startsWith("commit:") === true &&
    to === symId &&
    isChangeEdgeLabel(label);
}

function isChangeEdgeLabel(label: string | undefined): label is ChangeEdgeLabel {
  return CHANGE_EDGE_LABELS.some((candidate) => candidate === label);
}
