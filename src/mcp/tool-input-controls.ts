import { z } from "zod";
import type { JsonObject } from "../contracts/json-object.js";

export const receiptModeSchema = z.enum(["full", "compact"]);
export type ReceiptMode = z.infer<typeof receiptModeSchema>;

export const COMMON_TOOL_INPUT_SCHEMA = Object.freeze({
  receipt: receiptModeSchema.optional(),
});

export function readReceiptMode(args: JsonObject): ReceiptMode {
  return args["receipt"] === "compact" ? "compact" : "full";
}

export function toolInputSchema(
  schema: Record<string, z.ZodType> | undefined,
): z.ZodObject {
  return z.object({
    ...(schema ?? {}),
    ...COMMON_TOOL_INPUT_SCHEMA,
  }).strict();
}
