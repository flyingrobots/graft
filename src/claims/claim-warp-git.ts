import type WarpApp from "@git-stunts/git-warp";
import type { ClaimTerm } from "@flyingrobots/contextual-claims";
import type { WarpContext } from "../warp/context.js";
import { materializeGraph, patchGraph } from "../warp/context.js";
import { encodeClaimTerm } from "./claim-warp.js";
import { type WorldInput, type WorldReader, ingestWorld } from "./claim-world.js";

/**
 * ClaimWarp and ClaimWorld over Graft's git-warp graph. This file is the only
 * place they meet git-warp; an Echo WARP backend replaces it by providing the
 * same ports.
 */

/** Write each term as one atomic WARP patch. Returns the patch sha. */
export function writeClaimTerm(ctx: WarpContext, termId: string, term: ClaimTerm): Promise<string> {
  return patchGraph(ctx, (patch) => {
    encodeClaimTerm(patch, termId, term);
  });
}

/** Write one ClaimWorld ingest as one atomic WARP patch. Returns the patch sha. */
export function writeClaimWorld(ctx: WarpContext, input: WorldInput): Promise<string> {
  return patchGraph(ctx, (patch) => {
    ingestWorld(patch, input);
  });
}

interface Edge { from: string; to: string; label: string; props: Record<string, unknown> }

/**
 * A reader over the materialized state. Nodes and edges are read once and
 * indexed by source and target, rather than queried per node.
 */
export async function gitWarpClaimReader(ctx: WarpContext): Promise<WorldReader> {
  await materializeGraph(ctx);
  const core: ReturnType<WarpApp["core"]> = ctx.app.core();
  const bySource = new Map<string, Edge[]>();
  const byTarget = new Map<string, Edge[]>();
  for (const edge of await core.getEdges()) {
    bySource.set(edge.from, [...(bySource.get(edge.from) ?? []), edge]);
    byTarget.set(edge.to, [...(byTarget.get(edge.to) ?? []), edge]);
  }
  const nodes = (await core.getNodes()).sort();
  return {
    getNodeProps: (id) => core.getNodeProps(id),
    outgoing: (id) => Promise.resolve(bySource.get(id) ?? []),
    incoming: (id) => Promise.resolve(byTarget.get(id) ?? []),
    nodeIds: (prefix) => Promise.resolve(nodes.filter((n) => n.startsWith(prefix))),
  };
}
