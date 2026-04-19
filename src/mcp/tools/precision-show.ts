import type { ToolContext } from "../context.js";
import { listProjectFiles } from "./git-files.js";
import {
  getIndexedCommitCeilings,
  searchWarpSymbols,
} from "./precision-warp.js";
import {
  listTrackedFilesAtRef,
  requireRepoPath,
  resolveGitRef,
} from "./precision-paths.js";
import {
  searchLiveSymbols,
} from "./precision-live.js";
import { PrecisionSearchRequest } from "./precision-query.js";
import type { PrecisionSymbolMatch } from "./precision-match.js";

export interface CodeShowResolution {
  readonly layer: "commit_worldline" | "ref_view" | "workspace_overlay";
  readonly source: "warp" | "live";
  readonly resolvedRef?: string | undefined;
  readonly locations: PrecisionSymbolMatch[];
}

export async function resolveCodeShowLocations(
  ctx: ToolContext,
  input: {
    symbolName: string;
    targetPath?: string | undefined;
    ref?: string | undefined;
    allowWarp: boolean;
  },
): Promise<CodeShowResolution> {
  const repoState = ctx.getRepoState();
  const layer = input.ref !== undefined
    ? "commit_worldline"
    : repoState.dirty
      ? "workspace_overlay"
      : "ref_view";

  let resolvedRef: string | undefined;
  if (input.ref !== undefined) {
    resolvedRef = await resolveGitRef(input.ref, ctx.git, ctx.projectRoot);
  }

  if (resolvedRef !== undefined) {
    const repoPath = input.targetPath !== undefined
      ? requireRepoPath(ctx.projectRoot, input.targetPath)
      : undefined;

    if (input.allowWarp) {
      const warp = await ctx.getWarp();
      const ceilings = await getIndexedCommitCeilings(warp);
      const ceiling = ceilings.get(resolvedRef);
      if (ceiling !== undefined) {
        const locations = await searchWarpSymbols(warp, new PrecisionSearchRequest({
          exactName: input.symbolName,
          ...(repoPath !== undefined ? { filePath: repoPath } : {}),
          ceiling,
        }));
        return { layer, source: "warp", resolvedRef, locations };
      }
    }

    const filePaths = repoPath !== undefined
      ? [repoPath]
      : await listTrackedFilesAtRef("", ctx.git, ctx.projectRoot, resolvedRef);
    const locations = await searchLiveSymbols(
      ctx,
      filePaths,
      new PrecisionSearchRequest({ exactName: input.symbolName }),
      resolvedRef,
    );
    return { layer, source: "live", resolvedRef, locations };
  }

  const filePaths = input.targetPath !== undefined
    ? [input.targetPath]
    : await listProjectFiles("", ctx.projectRoot, ctx.git);
  const locations = await searchLiveSymbols(
    ctx,
    filePaths,
    new PrecisionSearchRequest({ exactName: input.symbolName }),
  );
  return { layer, source: "live", locations };
}
