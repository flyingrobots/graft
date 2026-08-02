import { toRepoPolicyPath } from "../adapters/repo-paths.js";
import { FilesystemWorkspaceReadView } from "../operations/workspace-read-view.js";
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
    // Still the live filesystem, now named rather than ambient. Replacing
    // this with a settled observation is the remaining work in #228; until
    // then the authority is the same, but a reader can see which kind it is.
    readView: new FilesystemWorkspaceReadView(ctx.fs, ctx.projectRoot),
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
