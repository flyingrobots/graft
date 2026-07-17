import { z } from "zod";

/** UTF-8 byte budgets for bounded activity-view summary strings. */
export const ACTIVITY_SUMMARY_BOUNDS = {
  headRef: 20,
  headline: 104,
  anchor: 96,
  workspace: 48,
  group: 40,
} as const;

/** Strict string contract whose semantic bound is encoded UTF-8 bytes. */
export function utf8ByteBoundedStringSchema(maxBytes: number) {
  return z.string().max(maxBytes).refine(
    (value) => Buffer.byteLength(value, "utf8") <= maxBytes,
    { message: `must encode to at most ${String(maxBytes)} UTF-8 bytes` },
  );
}
