import * as crypto from "node:crypto";
import * as path from "node:path";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SessionTracker } from "../session/tracker.js";
import { Metrics } from "./metrics.js";
import { ObservationCache } from "./cache.js";
import { buildReceiptResult } from "./receipt.js";
import type { ToolHandler, ToolContext } from "./context.js";
import type { McpToolResult } from "./receipt.js";
import { createSafeReadHandler } from "./tools/safe-read.js";
import { createFileOutlineHandler } from "./tools/file-outline.js";
import { createReadRangeHandler } from "./tools/read-range.js";
import { createChangedSinceHandler } from "./tools/changed-since.js";
import { createGraftDiffHandler } from "./tools/graft-diff.js";
import { createRunCaptureHandler } from "./tools/run-capture.js";
import { createStateSaveHandler, createStateLoadHandler } from "./tools/state.js";
import { createDoctorHandler } from "./tools/doctor.js";
import { createStatsHandler } from "./tools/stats.js";

export type { McpToolResult, ToolHandler, ToolContext };

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

export interface GraftServer {
  getRegisteredTools(): string[];
  callTool(name: string, args: Record<string, unknown>): Promise<McpToolResult>;
  injectSessionMessages(count: number): void;
  getMcpServer(): McpServer;
}

export function createGraftServer(): GraftServer {
  const mcpServer = new McpServer({ name: "graft", version: "0.0.0" });
  const session = new SessionTracker();
  const sessionId = crypto.randomUUID();
  const projectRoot = process.cwd();
  const graftDir = path.join(projectRoot, ".graft");
  const metrics = new Metrics();
  const cache = new ObservationCache();
  const handlers = new Map<string, ToolHandler>();

  let seq = 0;

  function respond(tool: string, data: Record<string, unknown>): McpToolResult {
    seq++;
    const { result, textBytes } = buildReceiptResult(tool, data, {
      sessionId,
      seq,
      metrics: metrics.snapshot(),
      tripwires: session.checkTripwires(),
    });
    metrics.addBytesReturned(textBytes);
    return result;
  }

  const ctx: ToolContext = { projectRoot, graftDir, session, cache, metrics, respond };

  // Tool definitions: name, schema, description, handler factory
  const toolDefs: {
    name: string;
    schema?: Record<string, z.ZodType>;
    description: string;
    handler: ToolHandler;
  }[] = [
    { name: "safe_read", schema: { path: z.string(), intent: z.string().optional() }, description: "Policy-enforced file read. Returns full content for small files, structural outline with jump table for large files, or refusal with reason code for banned files. Detects re-reads and returns cached outlines or structural diffs.", handler: createSafeReadHandler(ctx) },
    { name: "file_outline", schema: { path: z.string() }, description: "Structural skeleton of a file — function signatures, class shapes, exports. Includes a jump table mapping each symbol to its line range for targeted read_range follow-ups.", handler: createFileOutlineHandler(ctx) },
    { name: "read_range", schema: { path: z.string(), start: z.number(), end: z.number() }, description: "Read a bounded range of lines from a file. Maximum 250 lines. Use jump table entries from file_outline or safe_read to target specific symbols.", handler: createReadRangeHandler(ctx) },
    { name: "changed_since", schema: { path: z.string(), consume: z.boolean().optional() }, description: "Check if a file changed since it was last read. Returns structural diff (added/removed/changed symbols) or 'unchanged'. Peek mode by default; pass consume: true to update the observation cache.", handler: createChangedSinceHandler(ctx) },
    { name: "graft_diff", schema: { base: z.string().optional(), head: z.string().optional(), path: z.string().optional() }, description: "Structural diff between two git refs. Shows added, removed, and changed symbols per file — not line hunks. Defaults to working tree vs HEAD.", handler: createGraftDiffHandler(ctx) },
    { name: "run_capture", schema: { command: z.string(), tail: z.number().optional() }, description: "Execute a shell command and return the last N lines of output (default 60). Full output saved to .graft/logs/capture.log for follow-up read_range calls.", handler: createRunCaptureHandler(ctx) },
    { name: "state_save", schema: { content: z.string() }, description: "Save session working state (max 8 KB). Use for session bookmarks: current task, files modified, next planned actions.", handler: createStateSaveHandler(ctx) },
    { name: "state_load", description: "Load previously saved session state. Returns null if no state has been saved.", handler: createStateLoadHandler(ctx) },
    { name: "doctor", description: "Runtime health check. Shows project root, parser status, active thresholds, session depth, and message count.", handler: createDoctorHandler(ctx) },
    { name: "stats", description: "Decision metrics for the current session. Total reads, outlines, refusals, cache hits, and bytes avoided.", handler: createStatsHandler(ctx) },
  ];

  for (const def of toolDefs) {
    handlers.set(def.name, def.handler);
    if (def.schema !== undefined) {
      mcpServer.registerTool(def.name, { description: def.description, inputSchema: def.schema }, async (args) => {
        session.recordMessage();
        session.recordToolCall(def.name);
        return def.handler(args as Record<string, unknown>);
      });
    } else {
      mcpServer.registerTool(def.name, { description: def.description }, async () => {
        session.recordMessage();
        session.recordToolCall(def.name);
        return def.handler({});
      });
    }
  }

  return {
    getRegisteredTools(): string[] {
      return [...handlers.keys()];
    },

    async callTool(name: string, args: Record<string, unknown>): Promise<McpToolResult> {
      const handler = handlers.get(name);
      if (handler === undefined) {
        throw new Error(`Unknown tool: ${name}`);
      }
      session.recordMessage();
      session.recordToolCall(name);
      return handler(args);
    },

    injectSessionMessages(count: number): void {
      for (let i = 0; i < count; i++) {
        session.recordMessage();
      }
    },

    getMcpServer(): McpServer {
      return mcpServer;
    },
  };
}
