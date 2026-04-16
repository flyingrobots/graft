import { z } from "zod";
import type { JsonObject } from "../contracts/json-object.js";

export const attributedReadArgsSchema = z.object({
  path: z.string(),
}).catchall(z.unknown());

const safeReadObservationResultSchema = z.object({
  projection: z.enum(["content", "outline", "cache_hit", "diff"]),
  reason: z.string().optional(),
}).catchall(z.unknown());

const fileOutlineObservationResultSchema = z.object({
  reason: z.string().optional(),
  error: z.string().optional(),
}).catchall(z.unknown());

const readRangeObservationResultSchema = z.object({
  content: z.string(),
  startLine: z.number().int(),
  endLine: z.number().int(),
  reason: z.string().optional(),
}).catchall(z.unknown());

export type AttributedReadArgs = z.infer<typeof attributedReadArgsSchema>;
export type SafeReadObservationResult = z.infer<typeof safeReadObservationResultSchema>;
export type FileOutlineObservationResult = z.infer<typeof fileOutlineObservationResultSchema>;
export type ReadRangeObservationResult = z.infer<typeof readRangeObservationResultSchema>;

export function parseAttributedReadArgs(args: JsonObject): AttributedReadArgs | null {
  const parsed = attributedReadArgsSchema.safeParse(args);
  return parsed.success ? parsed.data : null;
}

export function parseSafeReadObservationResult(result: JsonObject): SafeReadObservationResult | null {
  const parsed = safeReadObservationResultSchema.safeParse(result);
  return parsed.success ? parsed.data : null;
}

export function parseFileOutlineObservationResult(result: JsonObject): FileOutlineObservationResult | null {
  const parsed = fileOutlineObservationResultSchema.safeParse(result);
  return parsed.success ? parsed.data : null;
}

export function parseReadRangeObservationResult(result: JsonObject): ReadRangeObservationResult | null {
  const parsed = readRangeObservationResultSchema.safeParse(result);
  return parsed.success ? parsed.data : null;
}
