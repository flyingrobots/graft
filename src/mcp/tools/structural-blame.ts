import { z } from "zod";
import type { ToolDefinition, ToolHandler } from "../context.js";
import { structuralBlameFromGraph } from "../../warp/warp-structural-blame.js";
import { toJsonObject } from "../../operations/result-dto.js";

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

      const blame = await structuralBlameFromGraph(
        warp,
        symbolName,
        filePath ?? "",
      );

      ctx.recordFootprint({ symbols: [symbolName] });

      return ctx.respond("graft_blame", toJsonObject({
        symbol: blame.symbol,
        filePath: blame.filePath,
        changeCount: blame.changeCount,
        createdInCommit: blame.createdInCommit ?? null,
        lastSignatureChange: blame.lastSignatureChange ?? null,
        referenceCount: blame.referenceCount,
        history: blame.history.map((v) => ({
          sha: v.sha,
          tick: v.tick,
          changeKind: v.changeKind,
          present: v.present,
          signature: v.signature ?? null,
        })),
      }));
    };
  },
};
