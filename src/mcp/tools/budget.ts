import { z } from "zod";
import type { ToolDefinition, ToolHandler } from "../context.js";
import { toJsonObject } from "../../operations/result-dto.js";
import type { SetBudgetResponse } from "./diagnostic-models.js";

export const setBudgetTool: ToolDefinition = {
  name: "set_budget",
  description:
    "Declare a context byte budget for this session. Graft tightens " +
    "read thresholds as the budget drains — no single read may consume " +
    "more than 5% of remaining budget. Call once at session start.",
  schema: { bytes: z.number() },
  createHandler(): ToolHandler {
    return (args, ctx) => {
      const bytes = args["bytes"] as number;
      ctx.governor.setBudget(bytes);
      const response: SetBudgetResponse = {
        budget: ctx.governor.getBudget(),
      };
      return ctx.respond("set_budget", toJsonObject(response));
    };
  },
};
