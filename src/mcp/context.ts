// ---------------------------------------------------------------------------
// ToolContext — shared dependencies injected into every tool handler
// ---------------------------------------------------------------------------

import * as path from "node:path";
import type { ObservationCache } from "./cache.js";
import type { Metrics } from "./metrics.js";
import type { SessionTracker } from "../session/tracker.js";
import type { McpToolResult } from "./receipt.js";
import type { FileSystem } from "../ports/filesystem.js";
import type { JsonCodec } from "../ports/codec.js";

import type { z } from "zod";

export type ToolHandler = (args: Record<string, unknown>) => McpToolResult | Promise<McpToolResult>;

export interface ToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly schema?: Record<string, z.ZodType>;
  readonly policyCheck?: boolean;
  readonly createHandler: (ctx: ToolContext) => ToolHandler;
}

export interface ToolContext {
  readonly projectRoot: string;
  readonly graftDir: string;
  readonly session: SessionTracker;
  readonly cache: ObservationCache;
  readonly metrics: Metrics;
  readonly fs: FileSystem;
  readonly codec: JsonCodec;
  respond(tool: string, data: Record<string, unknown>): McpToolResult;
  resolvePath(relative: string): string;
}

/**
 * Resolve a user-provided path against projectRoot with traversal guard.
 * Absolute paths pass through unchanged. Relative paths that escape the
 * project root via ".." are rejected.
 */
export function createPathResolver(projectRoot: string): (input: string) => string {
  return (input: string): string => {
    if (path.isAbsolute(input)) return input;
    const resolved = path.resolve(projectRoot, input);
    const rel = path.relative(projectRoot, resolved);
    if (rel.startsWith("..")) {
      throw new Error(`Path traversal blocked: ${input}`);
    }
    return resolved;
  };
}
