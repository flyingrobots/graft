// ---------------------------------------------------------------------------
// ToolContext — shared dependencies injected into every tool handler
// ---------------------------------------------------------------------------

import type { ObservationCache } from "./cache.js";
import type { Metrics } from "./metrics.js";
import type { SessionTracker } from "../session/tracker.js";
import type { McpToolResult } from "./receipt.js";

export type ToolHandler = (args: Record<string, unknown>) => Promise<McpToolResult>;

export interface ToolContext {
  readonly projectRoot: string;
  readonly graftDir: string;
  readonly session: SessionTracker;
  readonly cache: ObservationCache;
  readonly metrics: Metrics;
  respond(tool: string, data: Record<string, unknown>): McpToolResult;
}
