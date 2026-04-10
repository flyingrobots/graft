import { z } from "zod";
import { buildRuntimeStagedTarget } from "../runtime-staged-target.js";
import type { ToolDefinition, ToolContext, ToolHandler } from "../context.js";

const actorKindSchema = z.enum(["human", "agent"]);

export const causalAttachTool: ToolDefinition = {
  name: "causal_attach",
  description:
    "Explicitly declare lawful continuation or handoff for the current causal workspace.",
  schema: {
    actor_kind: actorKindSchema,
    actor_id: z.string().min(1).optional(),
    from_actor_id: z.string().min(1).optional(),
    note: z.string().min(1).optional(),
  },
  createHandler(ctx: ToolContext): ToolHandler {
    return async (args) => {
      const result = await ctx.declareCausalAttach({
        actorKind: actorKindSchema.parse(args["actor_kind"]),
        actorId: typeof args["actor_id"] === "string" ? args["actor_id"] : undefined,
        fromActorId: typeof args["from_actor_id"] === "string" ? args["from_actor_id"] : undefined,
        note: typeof args["note"] === "string" ? args["note"] : undefined,
      });

      const workspaceStatus = ctx.getWorkspaceStatus();
      const activeCausalWorkspace = workspaceStatus.bindState === "bound"
        ? {
            causalContext: ctx.getCausalContext(),
            attribution: result.persistedLocalHistory.attribution,
            checkoutEpoch: ctx.getRepoState().checkoutEpoch,
            lastTransition: ctx.getRepoState().lastTransition,
            workspaceOverlayId: ctx.getRepoState().workspaceOverlayId,
            workspaceOverlay: ctx.getRepoState().workspaceOverlay,
            stagedTarget: buildRuntimeStagedTarget(
              workspaceStatus,
              ctx.getCausalContext(),
              ctx.getRepoState(),
            ),
          }
        : null;

      return ctx.respond("causal_attach", {
        ...result,
        activeCausalWorkspace,
        nextAction: result.persistedLocalHistory.nextAction,
      });
    };
  },
};
