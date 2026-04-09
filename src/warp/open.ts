/**
 * WARP graph initialization — opens the graft-ast graph backed by
 * the repo's own .git directory.
 *
 * Single entry point. Returns a WarpApp instance ready for patch
 * writes and observer reads.
 */

import WarpApp, { GitGraphAdapter } from "@git-stunts/git-warp";
import GitPlumbing from "@git-stunts/plumbing";
import { DEFAULT_WARP_WRITER_ID } from "./writer-id.js";

export const GRAPH_NAME = "graft-ast";

export interface OpenWarpOptions {
  readonly cwd: string;
  readonly writerId?: string;
}

export async function openWarp(options: OpenWarpOptions): Promise<WarpApp> {
  // createDefault() wires the ShellRunnerFactory (required port)
  const plumbing = GitPlumbing.createDefault({ cwd: options.cwd });
  const persistence = new GitGraphAdapter({ plumbing });

  return WarpApp.open({
    persistence,
    graphName: GRAPH_NAME,
    writerId: options.writerId ?? DEFAULT_WARP_WRITER_ID,
    onDeleteWithData: "cascade",
  });
}
