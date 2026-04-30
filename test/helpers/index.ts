/**
 * Shared test helper for indexing HEAD into WARP.
 */

import { indexHead } from "../../src/warp/index-head.js";
import { openWarp } from "../../src/warp/open.js";
import { nodeGit } from "../../src/adapters/node-git.js";
import { nodePathOps } from "../../src/adapters/node-paths.js";
import type { WarpContext } from "../../src/warp/context.js";

/**
 * Open WARP and index HEAD in one call. Convenience for tests that
 * need a single-shot index.
 */
export async function openAndIndexHead(cwd: string): Promise<WarpContext> {
  const app = await openWarp({ cwd });
  const ctx: WarpContext = { app, strandId: null };
  await indexHead({ cwd, git: nodeGit, pathOps: nodePathOps, ctx });
  return ctx;
}

/**
 * Index HEAD into an existing WARP context. Use this when you need
 * multiple index calls (one per commit) to build multi-tick history.
 */
export async function indexHeadInto(ctx: WarpContext, cwd: string): Promise<void> {
  await indexHead({ cwd, git: nodeGit, pathOps: nodePathOps, ctx });
}
