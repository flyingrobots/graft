import type WarpApp from "@git-stunts/git-warp";
import type { ClaimTerm } from "@flyingrobots/contextual-claims";
import type { WarpContext } from "../warp/context.js";
import { materializeGraph, patchGraph } from "../warp/context.js";
import { type ClaimGraphReader, CLAIM_CHILD, encodeClaimTerm } from "./claim-warp.js";

/**
 * ClaimWarp over Graft's git-warp graph. This file is the only place ClaimWarp
 * meets git-warp; an Echo WARP backend replaces it by providing the same two
 * ports.
 */

/** Write each term as one atomic WARP patch. Returns the patch sha. */
export function writeClaimTerm(ctx: WarpContext, termId: string, term: ClaimTerm): Promise<string> {
  return patchGraph(ctx, (patch) => {
    encodeClaimTerm(patch, termId, term);
  });
}

/**
 * A reader over the materialized state. Edges are read once and grouped by
 * source, rather than queried per node.
 */
export async function gitWarpClaimReader(ctx: WarpContext): Promise<ClaimGraphReader> {
  await materializeGraph(ctx);
  const core: ReturnType<WarpApp["core"]> = ctx.app.core();
  const bySource = new Map<string, { to: string; label: string; props: Record<string, unknown> }[]>();
  for (const edge of await core.getEdges()) {
    if (edge.label !== CLAIM_CHILD) continue;
    const list = bySource.get(edge.from) ?? [];
    list.push({ to: edge.to, label: edge.label, props: edge.props });
    bySource.set(edge.from, list);
  }
  return {
    getNodeProps: (id) => core.getNodeProps(id),
    outgoing: (id) => Promise.resolve(bySource.get(id) ?? []),
  };
}
