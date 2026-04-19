import type { WarpHandle } from "../../ports/warp.js";
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

export async function getIndexedCommitCeilings(warp: WarpHandle): Promise<ReadonlyMap<string, number>> {
  const ceilings = new Map<string, number>();
  const observer = await warp.observer(commitsLens());
  const nodeIds = await observer.getNodes();

  for (const nodeId of nodeIds) {
    const props = await observer.getNodeProps(nodeId);
    const sha = typeof props?.["sha"] === "string" ? props["sha"] : null;
    const tick = typeof props?.["tick"] === "number" ? props["tick"] : null;
    if (sha !== null && tick !== null) {
      ceilings.set(sha, tick);
    }
  }

  return ceilings;
}

export async function searchWarpSymbols(
  warp: WarpHandle,
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

  const observer = await warp.observer(
    lens,
    request.ceiling !== undefined ? { source: { kind: "live", ceiling: request.ceiling } } : undefined,
  );
  const nodeIds = await observer.getNodes();

  const matches = await Promise.all(nodeIds.map(async (nodeId) => {
    const props = await observer.getNodeProps(nodeId);
    if (props === null) return null;
    const match = toMatch(nodeId, props);
    if (match === null) return null;
    return request.rank(match);
  }));

  const visibleMatches = matches.filter((match): match is RankedPrecisionSymbolMatch => match !== null);
  return request.sort(visibleMatches);
}
