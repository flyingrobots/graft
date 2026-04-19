import { z } from "zod";
import type { ToolDefinition, ToolHandler } from "../context.js";
import {
  structuralBlame,
  structuralBlameToJson,
  type CommitMetaInput,
  type SymbolMetaInput,
} from "../../operations/structural-blame.js";
import { commitsForSymbol, symbolsForCommit } from "../../warp/structural-queries.js";
import { countSymbolReferences } from "../../warp/reference-count.js";
import { getCommitMeta } from "../../warp/indexer-git.js";

export const structuralBlameTool: ToolDefinition = {
  name: "graft_blame",
  description:
    "Symbol-level blame: who last changed a symbol's signature, when " +
    "it was created, and its full change history. Returns creation " +
    "commit, last signature change, change count, reference count, " +
    "and chronological history.",
  schema: {
    symbol: z.string(),
    path: z.string().optional(),
  },
  createHandler(): ToolHandler {
    return async (args, ctx) => {
      const symbol = args["symbol"];
      const rawPath = args["path"];

      if (typeof symbol !== "string" || symbol.trim().length === 0) {
        throw new Error("graft_blame: symbol must be a non-empty string");
      }

      const symbolName = symbol.trim();
      const filePath = typeof rawPath === "string" ? rawPath : undefined;
      const warp = await ctx.getWarp();

      // 1. Get full history from WARP
      const history = await commitsForSymbol(warp, symbolName, filePath);

      // 2. Get commit metadata for all commits
      const commitMeta = new Map<string, CommitMetaInput>();
      await Promise.all(
        history.commits.map(async (c) => {
          const meta = await getCommitMeta(ctx.git, c.sha, ctx.projectRoot);
          commitMeta.set(c.sha, { author: meta.author, date: meta.timestamp, message: meta.message });
        }),
      );

      // 3. Get symbol metadata (kind/exported) from the most recent commit
      let symbolMeta: SymbolMetaInput | undefined;
      if (history.commits.length > 0) {
        // Sort by date descending to find most recent
        const sorted = [...history.commits].sort((a, b) => {
          const dateA = commitMeta.get(a.sha)?.date ?? "";
          const dateB = commitMeta.get(b.sha)?.date ?? "";
          return dateB.localeCompare(dateA);
        });
        const mostRecentSha = sorted[0]?.sha;
        if (mostRecentSha !== undefined) {
          const latestCommitSyms = await symbolsForCommit(warp, mostRecentSha);
          const allSymbols = [...latestCommitSyms.added, ...latestCommitSyms.changed];
          const matchingSym = allSymbols.find((s) => s.name === symbolName);
          if (matchingSym !== undefined) {
            symbolMeta = { kind: matchingSym.kind, exported: matchingSym.exported };
          }
        }
      }

      // 4. Get reference count
      const refOpts: import("../../warp/reference-count.js").ReferenceCountOptions = {
        projectRoot: ctx.projectRoot,
        git: ctx.git,
        process: ctx.process,
        ...(history.filePath !== undefined ? { filePath: history.filePath } : {}),
      };
      const refs = await countSymbolReferences(symbolName, refOpts);

      // 5. Assemble and compute blame
      const result = structuralBlame({
        symbolName,
        filePath: history.filePath,
        commits: history.commits,
        commitMeta,
        symbolMeta,
        referenceCount: refs.referenceCount,
        referencingFiles: refs.referencingFiles,
      });

      return ctx.respond("graft_blame", structuralBlameToJson(result));
    };
  },
};
