/**
 * WARP Identity Resolver — creates an IdentityResolver backed by
 * the WARP graph. Reads symbol identityId properties through the
 * observer lens system.
 */

import type { WarpHandle } from "../ports/warp.js";
import type { IdentityResolver } from "../operations/diff-identity.js";
import { fileSymbolsLens, observe } from "./observers.js";

/**
 * Create an IdentityResolver that queries WARP for canonical symbol
 * identities. Each call reads the current frontier snapshot — the
 * resolver is stateless between calls.
 */
export function createWarpIdentityResolver(warp: WarpHandle): IdentityResolver {
  return async (filePath: string) => {
    const lens = fileSymbolsLens(filePath);
    const obs = await observe(warp, lens);
    const nodes = await obs.getNodes();
    const identities = new Map<string, string>();

    for (const nodeId of nodes) {
      const props = await obs.getNodeProps(nodeId);
      if (props === null) continue;
      const name = props["name"];
      const identityId = props["identityId"];
      if (typeof name === "string" && typeof identityId === "string") {
        identities.set(name, identityId);
      }
    }

    return identities;
  };
}
