import { toRepoPolicyPath } from "../adapters/repo-paths.js";
import { createColorfulCliProseProjector } from "../adapters/colorful-cli-prose-projector.js";
import { RepoWorkspace } from "../operations/repo-workspace.js";
import type { ToolContext } from "./context.js";

export function createRepoWorkspaceFromToolContext(
  ctx: Pick<
    ToolContext,
    "projectRoot" | "fs" | "codec" | "graftignorePatterns" | "resolvePath" | "governor" | "cache" | "process"
  >,
): RepoWorkspace {
  return new RepoWorkspace({
    projectRoot: ctx.projectRoot,
    fs: ctx.fs,
    codec: ctx.codec,
    graftignorePatterns: ctx.graftignorePatterns,
    resolvePath: ctx.resolvePath,
    toPolicyPath: (resolvedPath) => toRepoPolicyPath(ctx.projectRoot, resolvedPath),
    governor: ctx.governor,
    cache: ctx.cache,
    proseProjector: createColorfulCliProseProjector({
      processRunner: ctx.process,
      cwd: ctx.projectRoot,
    }),
  });
}
