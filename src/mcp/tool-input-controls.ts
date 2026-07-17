import { z } from "zod";
import type { JsonObject } from "../contracts/json-object.js";

/** Public receipt projection requested for an MCP invocation. */
export type ReceiptMode = "compact" | "full";

export const DEFAULT_RECEIPT_MODE: ReceiptMode = "compact";

/** Input controls shared by every public MCP tool. */
export const COMMON_TOOL_INPUT_SCHEMA = Object.freeze({
  receipt: z.enum(["compact", "full"]).optional(),
});

/** Build the strict public input schema for one tool plus common controls. */
export function toolInputSchema(
  toolSchema: Readonly<Record<string, z.ZodType>> | undefined,
): z.ZodObject {
  return z.object({
    ...(toolSchema ?? {}),
    ...COMMON_TOOL_INPUT_SCHEMA,
  }).strict();
}

/** Resolve the requested mode; the composed input schema validates the value separately. */
export function readReceiptMode(args: Readonly<Record<string, unknown>>): ReceiptMode {
  return args["receipt"] === "full" ? "full" : DEFAULT_RECEIPT_MODE;
}

/** Remove transport controls before domain handlers and worker jobs run. */
export function stripCommonToolInputs(args: JsonObject): JsonObject {
  const { receipt: _receipt, ...domainArgs } = args;
  return domainArgs;
}
