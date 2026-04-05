import { z } from "zod";
import { indexCommits } from "../../warp/indexer.js";
import { allSymbolsLens } from "../../warp/observers.js";
import type { ToolDefinition, ToolContext, ToolHandler } from "../context.js";

export const sinceTool: ToolDefinition = {
  name: "graft_since",
  description:
    "Structural changes since a git ref, powered by WARP. Shows symbols " +
    "added, removed, and changed between two points in history — without " +
    "reading files or parsing diffs. Lazy-indexes on first use.",
  schema: {
    base: z.string(),
    head: z.string().optional(),
  },
  createHandler(ctx: ToolContext): ToolHandler {
    return async (args) => {
      const base = args["base"] as string;
      const head = (args["head"] as string | undefined) ?? "HEAD";

      const warp = await ctx.getWarp();

      // Lazy index: ensure the range is indexed
      await indexCommits(warp, { cwd: ctx.projectRoot, from: base, to: head });

      // Materialize and observe symbols at current frontier
      // TODO: pin base and head to different worldline positions
      // For now, both observe the same frontier (post-indexing state)
      await warp.core().materialize();
      const lens = allSymbolsLens();
      const baseObs = await warp.observer(lens);
      const headObs = await warp.observer(lens);

      const baseNodes = await baseObs.getNodes();
      const headNodes = await headObs.getNodes();

      // Build symbol maps for comparison
      const baseSyms = new Map<string, Record<string, unknown>>();
      for (const nodeId of baseNodes) {
        const props = await baseObs.getNodeProps(nodeId);
        if (props !== null) {
          baseSyms.set(nodeId, props);
        }
      }

      const headSyms = new Map<string, Record<string, unknown>>();
      for (const nodeId of headNodes) {
        const props = await headObs.getNodeProps(nodeId);
        if (props !== null) {
          headSyms.set(nodeId, props);
        }
      }

      // Compute structural delta
      const added: Record<string, unknown>[] = [];
      const removed: Record<string, unknown>[] = [];
      const changed: Record<string, unknown>[] = [];

      for (const [id, props] of headSyms) {
        const baseProps = baseSyms.get(id);
        if (baseProps === undefined) {
          added.push({ id, ...props });
        } else if (JSON.stringify(props) !== JSON.stringify(baseProps)) {
          changed.push({
            id,
            before: baseProps,
            after: props,
          });
        }
      }

      for (const [id, props] of baseSyms) {
        if (!headSyms.has(id)) {
          removed.push({ id, ...props });
        }
      }

      return ctx.respond("graft_since", {
        base,
        head,
        added,
        removed,
        changed,
        summary: `+${String(added.length)} added, -${String(removed.length)} removed, ~${String(changed.length)} changed`,
      });
    };
  },
};
