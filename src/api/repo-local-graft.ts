import * as path from "node:path";
import {
  createGraftServer,
  type CreateGraftServerOptions,
  type GraftServer,
} from "../mcp/server.js";

export interface CreateRepoLocalGraftOptions extends Omit<CreateGraftServerOptions, "mode" | "projectRoot" | "graftDir"> {
  readonly cwd?: string | undefined;
  readonly graftDir?: string | undefined;
}

export function createRepoLocalGraft(options: CreateRepoLocalGraftOptions = {}): GraftServer {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  return createGraftServer({
    ...options,
    mode: "repo_local",
    projectRoot: cwd,
    graftDir: options.graftDir ?? path.join(cwd, ".graft"),
  });
}
