import { evaluatePolicy } from "../policy/evaluate.js";
import { ContentResult, RefusedResult } from "../policy/types.js";
import type { SessionDepth } from "../policy/types.js";
import { extractOutline } from "../parser/outline.js";
import type { OutlineEntry, JumpEntry } from "../parser/types.js";
import type { FileSystem } from "../ports/filesystem.js";

export interface SafeReadResult {
  [key: string]: unknown;
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
  sessionDepth?: SessionDepth | undefined;
}

export interface SafeReadOptions {
  fs: FileSystem;
  content?: string | undefined;
  intent?: string | undefined;
  sessionDepth?: SessionDepth | undefined;
}

export async function safeRead(
  filePath: string,
  options: SafeReadOptions,
): Promise<SafeReadResult> {
  let content: string;
  let bytes: number;

  if (options.content !== undefined) {
    content = options.content;
    bytes = Buffer.byteLength(content, "utf-8");
  } else {
    let raw: Buffer;
    try {
      raw = await options.fs.readFile(filePath);
    } catch {
      return {
        path: filePath,
        projection: "error",
        reason: "NOT_FOUND",
      };
    }
    content = raw.toString("utf-8");
    bytes = raw.byteLength;
  }

  const lines = content.split("\n").length;

  const policy = evaluatePolicy(
    { path: filePath, lines, bytes },
    { sessionDepth: options.sessionDepth },
  );

  const base: SafeReadResult = {
    path: filePath,
    projection: policy.projection,
    reason: policy.reason,
    actual: policy.actual,
    thresholds: policy.thresholds,
    ...(policy.sessionDepth !== undefined ? { sessionDepth: policy.sessionDepth } : {}),
  };

  if (policy instanceof ContentResult) {
    return { ...base, content };
  }

  if (policy instanceof RefusedResult) {
    return {
      ...base,
      next: [...policy.next],
    };
  }

  // projection === "outline"
  const outlineResult = extractOutline(content);
  const outlineJson = JSON.stringify(outlineResult);
  const estimatedBytesAvoided = bytes - Buffer.byteLength(outlineJson, "utf-8");

  return {
    ...base,
    outline: outlineResult.entries,
    jumpTable: outlineResult.jumpTable,
    estimatedBytesAvoided: estimatedBytesAvoided > 0 ? estimatedBytesAvoided : 0,
  };
}
