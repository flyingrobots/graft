import type WarpApp from "@git-stunts/git-warp";
import {
  type ArtifactFileInput,
  type ClaimTerm,
  type ContentReader,
  type WorldInput,
  attachArtifactFiles,
  encodeClaimTerm,
  ingestWorld,
} from "@flyingrobots/contextual-claims";
import type { WarpContext } from "../warp/context.js";
import { materializeGraph, patchGraph } from "../warp/context.js";

/**
 * ClaimWarp and ClaimWorld (from @flyingrobots/contextual-claims) over Graft's
 * git-warp graph. This file is the only place they meet git-warp; an Echo WARP
 * backend replaces it by providing the same ports.
 */

/** Write each term as one atomic WARP patch. Returns the patch sha. */
export function writeClaimTerm(ctx: WarpContext, termId: string, term: ClaimTerm): Promise<string> {
  return patchGraph(ctx, (patch) => {
    encodeClaimTerm(patch, termId, term);
  });
}

/** Write one ClaimWorld ingest, and any admitted artifact files it carries, as one atomic WARP patch. */
export function writeClaimWorld(ctx: WarpContext, input: WorldInput, files: readonly ArtifactFileInput[] = []): Promise<string> {
  return patchGraph(ctx, async (patch) => {
    ingestWorld(patch, input);
    await attachArtifactFiles(patch, input.receiptId, files);
  });
}

interface Edge { from: string; to: string; label: string; props: Record<string, unknown> }

/**
 * A reader over the materialized state. Nodes and edges are read once and
 * indexed by source and target, rather than queried per node.
 */
export async function gitWarpClaimReader(ctx: WarpContext): Promise<ContentReader> {
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
    getContent: (id) => core.getContent(id),
  };
}
