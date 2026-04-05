/**
 * WARP graph initialization — opens the graft-ast graph backed by
 * the repo's own .git directory.
 *
 * Single entry point. Returns a WarpApp instance ready for patch
 * writes and observer reads.
 */

import WarpApp, { GitGraphAdapter } from "@git-stunts/git-warp";
import GitPlumbing from "@git-stunts/plumbing";

const GRAPH_NAME = "graft-ast";
const WRITER_ID = "graft";

export interface OpenWarpOptions {
  readonly cwd: string;
}

export async function openWarp(options: OpenWarpOptions): Promise<WarpApp> {
  // createDefault() wires the ShellRunnerFactory (required port)
  const plumbing = GitPlumbing.createDefault({ cwd: options.cwd });
  const persistence = new GitGraphAdapter({ plumbing });

  return WarpApp.open({
    persistence,
    graphName: GRAPH_NAME,
    writerId: WRITER_ID,
    onDeleteWithData: "cascade",
    timeoutMs: 30_000,
  });
}
