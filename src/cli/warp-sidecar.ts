import * as path from "node:path";
import type WarpApp from "@git-stunts/git-warp";
import { nodeGit } from "../adapters/node-git.js";
import type { ResolvedWorkspace } from "../mcp/workspace-router-model.js";
import { resolveWorkspaceRequest } from "../mcp/workspace-router-resolution.js";
import {
  defaultWarpGraphRoot,
  openWarpSidecar,
  resolveWarpSidecarLocation,
  type WarpSidecarLocation,
} from "../warp/sidecar.js";
import { buildSessionWarpWriterId } from "../warp/writer-id.js";

export const CLI_WARP_SESSION_ID = "cli";
export const CLI_WARP_WRITER_ID = buildSessionWarpWriterId(CLI_WARP_SESSION_ID);

export interface OpenCliWarpOptions {
  readonly cwd: string;
  readonly graphRoot?: string | undefined;
}

export interface OpenedCliWarp {
  readonly app: WarpApp;
  readonly workspace: ResolvedWorkspace;
  readonly location: WarpSidecarLocation;
}

export async function openCliWarp(options: OpenCliWarpOptions): Promise<OpenedCliWarp> {
  const workspace = await resolveWorkspaceRequest(nodeGit, { cwd: options.cwd });
  if ("code" in workspace) {
    throw new Error(workspace.message);
  }
  const graphRoot = path.resolve(options.graphRoot ?? defaultWarpGraphRoot());
  const location = resolveWarpSidecarLocation(graphRoot, {
    ...workspace,
    writerId: CLI_WARP_WRITER_ID,
  });
  const app = await openWarpSidecar({
    sidecarRepo: location.repoPath,
    graphRoot,
    writerId: CLI_WARP_WRITER_ID,
  });
  return { app, workspace, location };
}
