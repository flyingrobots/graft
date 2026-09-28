import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type WarpApp from "@git-stunts/git-warp";
import {
  InMemoryWarpPool,
  type WarpPoolOptions,
  type WarpPoolWorkspace,
  type WarpResidentAcquireInput,
} from "../../src/mcp/warp-pool.js";
import type { WarpSidecarOpenOptions } from "../../src/warp/sidecar.js";

/**
 * Graph root for pools whose opener is a fake: nothing is ever created here.
 * The temp directory is canonicalized because sidecar location resolution
 * refuses a symlink-aliased graph root (macOS aliases /var and /tmp).
 */
export const FIXTURE_WARP_GRAPH_ROOT = path.join(
  fs.realpathSync.native(os.tmpdir()),
  "graft-warp-pool-fixture-graphs",
);

/** A workspace identity for a single-worktree repository rooted at `worktreeRoot`. */
export function fixtureWarpWorkspace(
  repoId: string,
  worktreeRoot: string,
  worktreeId = `${repoId}:worktree:${worktreeRoot}`,
): WarpPoolWorkspace {
  return {
    repoId,
    worktreeId,
    worktreeRoot,
    gitCommonDir: path.join(worktreeRoot, ".git"),
  };
}

export function fixtureAcquireInput(input: {
  readonly repoId: string;
  readonly writerId: string;
  readonly worktreeRoot: string;
  readonly ownerId: string;
  readonly worktreeId?: string;
}): WarpResidentAcquireInput {
  return {
    workspace: fixtureWarpWorkspace(input.repoId, input.worktreeRoot, input.worktreeId),
    writerId: input.writerId,
    ownerId: input.ownerId,
  };
}

/** A pool over a fake sidecar opener rooted at the fixture graph root. */
export function fakeSidecarWarpPool(
  openSidecar: (options: WarpSidecarOpenOptions) => Promise<WarpApp>,
  options: WarpPoolOptions = {},
): InMemoryWarpPool {
  return new InMemoryWarpPool({ graphRoot: FIXTURE_WARP_GRAPH_ROOT, openSidecar, ...options });
}

/** A fresh, private, canonical graph root for a real sidecar-backed pool. The caller removes it. */
export function createTestWarpGraphRoot(prefix = "graft-test-graphs-"): string {
  return fs.mkdtempSync(path.join(fs.realpathSync.native(os.tmpdir()), prefix));
}

/**
 * Whether a sidecar path belongs to the worktree rooted at `worktreeRoot`.
 * Sidecar worktree directories are named `<basename slug>--<identity hash>`;
 * this matches on the slug, which is exact for the lowercase-safe temp
 * repository names the tests create.
 */
export function sidecarServesWorktree(sidecarRepo: string, worktreeRoot: string): boolean {
  const worktreeDir = path.basename(path.dirname(path.dirname(sidecarRepo)));
  return worktreeDir.startsWith(`${path.basename(worktreeRoot).toLowerCase()}--`);
}
