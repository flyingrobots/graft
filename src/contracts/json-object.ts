import { z } from "zod";

export const jsonObjectSchema = z.object({}).catchall(z.unknown());

export type JsonObject = z.infer<typeof jsonObjectSchema>;

export function parseJsonObject(value: unknown, label: string): JsonObject {
  const parsed = jsonObjectSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error(`${label} was not a JSON object`);
  }
  return parsed.data;
}

export function tryParseJsonObject(value: unknown): JsonObject | null {
  const parsed = jsonObjectSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}