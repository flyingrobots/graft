import { evaluatePolicy } from "../policy/evaluate.js";
import { ContentResult, RefusedResult } from "../policy/types.js";
import type { GovernorDepth } from "../policy/types.js";
import { extractOutlineForFileAsync } from "../parser/outline.js";
import type { OutlineEntry, JumpEntry } from "../parser/types.js";
import { observedActual, type ObservedFile } from "./workspace-read-view.js";
import type { JsonCodec } from "../ports/codec.js";
import type { ProseProjection, ProseProjectionProvider } from "./colorful-prose-projection.js";

export interface SafeReadResult {
  path: string;
  projection: "content" | "outline" | "refused" | "error";
  reason: string;
  content?: string | undefined;
  outline?: OutlineEntry[] | undefined;
  jumpTable?: JumpEntry[] | undefined;
  estimatedBytesAvoided?: number | undefined;
  next?: string[] | undefined;
  actual?: { lines: number; bytes: number } | undefined;
  thresholds?: { lines: number; bytes: number } | undefined;
  sessionDepth?: GovernorDepth | undefined;
}

export interface SafeReadOptions {
  codec: JsonCodec;
  policyPath?: string | undefined;
  graftignorePatterns?: string[] | undefined;
  sessionDepth?: GovernorDepth | undefined;
  budgetRemaining?: number | undefined;
  proseProjector?: ProseProjectionProvider | undefined;
}

/**
 * Applies read policy to bytes already observed.
 *
 * Takes the observation rather than a filesystem: the content this returns is
 * necessarily the content the policy decision was made about.
 */
export async function safeRead(
  file: ObservedFile,
  options: SafeReadOptions,
): Promise<SafeReadResult> {
  const filePath = file.path;
  const { lines, bytes } = observedActual(file);

  const policy = evaluatePolicy(
    { path: options.policyPath ?? filePath, lines, bytes },
    {
      graftignorePatterns: options.graftignorePatterns,
      sessionDepth: options.sessionDepth,
      budgetRemaining: options.budgetRemaining,
    },
  );

  const base: SafeReadResult = {
    path: filePath,
    projection: policy.projection,
    reason: policy.reason,
    actual: policy.actual,
    thresholds: policy.thresholds,
    ...(policy.sessionDepth !== undefined ? { sessionDepth: policy.sessionDepth } : {}),
  };

  if (policy instanceof RefusedResult) {
    return {
      ...base,
      next: [...policy.next],
    };
  }

  // Below here the projection returns text, so the bytes have to have one.
  // Refused rather than decoded leniently: the previous path read raw bytes
  // and called Buffer.toString("utf-8"), which substitutes U+FFFD for invalid
  // sequences, returning content the observation never settled under the
  // identity of content it did.
  //
  // After the policy decision, not before it. A banned or binary path is
  // refused for being banned or binary whatever its encoding, and reporting
  // that as an encoding problem would lose the reason the caller needs.
  if (file.utf8 === null) {
    return {
      ...base,
      projection: "refused",
      reason: "INVALID_UTF8",
      next: [
        "This file is not valid UTF-8, so it has no faithful text projection.",
        "Read it as bytes if you need its contents.",
      ],
    };
  }
  const content = file.utf8;

  if (policy instanceof ContentResult) {
    return { ...base, content };
  }

  // projection === "outline"
  const outlineResult = await extractOutlineForFileAsync(filePath, content);
  if (outlineResult === null) {
    let proseProjection: ProseProjection | null;
    try {
      proseProjection = options.proseProjector?.project({ path: filePath, content }) ?? null;
    } catch {
      proseProjection = null;
    }
    if (proseProjection !== null) {
      const outlineJson = options.codec.encode({
        entries: proseProjection.outline,
        jumpTable: proseProjection.jumpTable,
      });
      const estimatedBytesAvoided = bytes - Buffer.byteLength(outlineJson, "utf-8");

      return {
        ...base,
        outline: [...proseProjection.outline],
        jumpTable: [...proseProjection.jumpTable],
        estimatedBytesAvoided: estimatedBytesAvoided > 0 ? estimatedBytesAvoided : 0,
      };
    }

    const emptyOutlineJson = options.codec.encode({ entries: [], jumpTable: [] });
    const estimatedBytesAvoided = bytes - Buffer.byteLength(emptyOutlineJson, "utf-8");

    return {
      ...base,
      reason: "UNSUPPORTED_LANGUAGE",
      outline: [],
      jumpTable: [],
      estimatedBytesAvoided: estimatedBytesAvoided > 0 ? estimatedBytesAvoided : 0,
      next: [
        "No parser-backed outline is available for this file type.",
        "Use read_range for targeted reads if you know the section you need.",
      ],
    };
  }

  const outlineJson = options.codec.encode(outlineResult);
  const estimatedBytesAvoided = bytes - Buffer.byteLength(outlineJson, "utf-8");

  return {
    ...base,
    outline: outlineResult.entries,
    jumpTable: outlineResult.jumpTable,
    estimatedBytesAvoided: estimatedBytesAvoided > 0 ? estimatedBytesAvoided : 0,
  };
}
