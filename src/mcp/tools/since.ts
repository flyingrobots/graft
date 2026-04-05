import { z } from "zod";
import { indexCommits } from "../../warp/indexer.js";
import { allSymbolsLens } from "../../warp/observers.js";
import type { ToolDefinition, ToolContext, ToolHandler } from "../context.js";
import { execFileSync } from "node:child_process";

/**
 * Resolve a git ref to a full SHA.
 */
function resolveRef(ref: string, cwd: string): string {
  return execFileSync("git", ["rev-parse", ref], { cwd, encoding: "utf-8" }).trim();
}

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

      const baseSha = resolveRef(base, ctx.projectRoot);
      const headSha = resolveRef(head, ctx.projectRoot);

      const warp = await ctx.getWarp();

      // Lazy index: ensure the full range is indexed (from root to head)
      const result = await indexCommits(warp, { cwd: ctx.projectRoot, to: headSha });

      // Find tick numbers for base and head commits
      const baseTick = result.commitTicks.get(baseSha);
      const headTick = result.commitTicks.get(headSha);

      // Materialize to populate state
      await warp.core().materialize();

      // Create observers at different worldline positions using ceiling
      const lens = allSymbolsLens();

      if (baseTick === undefined) {
        return ctx.respond("graft_since", {
          error: `Commit ${base} (${baseSha}) was not indexed — it may have no structural changes or fall outside the indexed range.`,
        });
      }
      if (headTick === undefined) {
        return ctx.respond("graft_since", {
          error: `Commit ${head} (${headSha}) was not indexed — it may have no structural changes or fall outside the indexed range.`,
        });
      }

      const baseObs = await warp.observer(lens, { source: { kind: "live", ceiling: baseTick } });
      const headObs = await warp.observer(lens, { source: { kind: "live", ceiling: headTick } });

      // Read symbol maps from each observer
      const baseSyms = new Map<string, Record<string, unknown>>();
      for (const nodeId of await baseObs.getNodes()) {
        const props = await baseObs.getNodeProps(nodeId);
        if (props !== null) baseSyms.set(nodeId, props);
      }

      const headSyms = new Map<string, Record<string, unknown>>();
      for (const nodeId of await headObs.getNodes()) {
        const props = await headObs.getNodeProps(nodeId);
        if (props !== null) headSyms.set(nodeId, props);
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
          changed.push({ id, before: baseProps, after: props });
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
