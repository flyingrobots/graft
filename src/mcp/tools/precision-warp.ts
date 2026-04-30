import type { QueryResultV1 } from "@git-stunts/git-warp";
import type { WarpContext } from "../../warp/context.js";
import { observeGraph } from "../../warp/context.js";
import { allSymbolsLens, commitsLens, fileSymbolsLens, symbolByNameLens } from "../../warp/observers.js";
import type { RankedPrecisionSymbolMatch } from "./precision-query.js";
import { PrecisionSearchRequest } from "./precision-query.js";
import { PrecisionSymbolMatch } from "./precision-match.js";

function decodeSymbolPath(nodeId: string): string | null {
  if (!nodeId.startsWith("sym:")) return null;
  const lastColon = nodeId.lastIndexOf(":");
  if (lastColon <= "sym:".length) return null;
  return nodeId.slice("sym:".length, lastColon);
}

function toMatch(
  nodeId: string,
  props: Record<string, unknown>,
): PrecisionSymbolMatch | null {
  const name = props["name"];
  const kind = props["kind"];
  const path = decodeSymbolPath(nodeId);
  if (typeof name !== "string" || typeof kind !== "string" || path === null) {
    return null;
  }

  return new PrecisionSymbolMatch({
    name,
    kind,
    path,
    ...(typeof props["identityId"] === "string" ? { identityId: props["identityId"] } : {}),
    ...(typeof props["signature"] === "string" ? { signature: props["signature"] } : {}),
    exported: props["exported"] === true,
    ...(typeof props["startLine"] === "number" ? { startLine: props["startLine"] } : {}),
    ...(typeof props["endLine"] === "number" ? { endLine: props["endLine"] } : {}),
  });
}

export async function getIndexedCommitCeilings(ctx: WarpContext): Promise<ReadonlyMap<string, number>> {
  const ceilings = new Map<string, number>();
  const observer = await observeGraph(ctx, commitsLens());

  // Slice-first: use query API instead of getNodes() + per-node getNodeProps()
  const result = await observer.query()
    .match("commit:*")
    .select(["id", "props"])
    .run() as QueryResultV1;

  for (const node of result.nodes) {
    const props = node.props ?? {};
    const sha = typeof props["sha"] === "string" ? props["sha"] : null;
    const tick = typeof props["tick"] === "number" ? props["tick"] : null;
    if (sha !== null && tick !== null) {
      ceilings.set(sha, tick);
    }
  }

  return ceilings;
}

export async function searchWarpSymbols(
  ctx: WarpContext,
  request: PrecisionSearchRequest,
): Promise<PrecisionSymbolMatch[]> {
  const lensMode = request.selectLens();
  let lens;
  if (lensMode === "file") {
    if (request.filePath === undefined) {
      throw new Error("PrecisionSearchRequest selected file lens without filePath");
    }
    lens = fileSymbolsLens(request.filePath);
  } else if (lensMode === "exact") {
    if (request.exactName === undefined) {
      throw new Error("PrecisionSearchRequest selected exact lens without exactName");
    }
    lens = symbolByNameLens(request.exactName);
  } else {
    lens = allSymbolsLens();
  }

  const observer = await observeGraph(ctx, 
    lens,
    request.ceiling !== undefined ? { source: { kind: "live", ceiling: request.ceiling } } : undefined,
  );
  // Slice-first: use query API instead of getNodes() + per-node getNodeProps()
  const queryResult = await observer.query()
    .match("*")
    .select(["id", "props"])
    .run() as QueryResultV1;

  const matches = queryResult.nodes.map((node) => {
    const props = node.props ?? {};
    if (node.id === undefined) return null;
    const match = toMatch(node.id, props);
    if (match === null) return null;
    return request.rank(match);
  });

  const visibleMatches = matches.filter((match): match is RankedPrecisionSymbolMatch => match !== null);
  return request.sort(visibleMatches);
}
