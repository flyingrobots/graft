import { z } from "zod";
import type { ToolDefinition, ToolContext, ToolHandler } from "../context.js";

export const setBudgetTool: ToolDefinition = {
  name: "set_budget",
  description:
    "Declare a context byte budget for this session. Graft tightens " +
    "read thresholds as the budget drains — no single read may consume " +
    "more than 5% of remaining budget. Call once at session start.",
  schema: { bytes: z.number() },
  createHandler(ctx: ToolContext): ToolHandler {
    return (args) => {
      const bytes = args["bytes"] as number;
      ctx.session.setBudget(bytes);
      return ctx.respond("set_budget", {
        budget: ctx.session.getBudget(),
      });
    };
  },
};
