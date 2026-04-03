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
import { createSafeReadHandler, SAFE_READ_DESCRIPTION } from "./tools/safe-read.js";
import { createFileOutlineHandler, FILE_OUTLINE_DESCRIPTION } from "./tools/file-outline.js";
import { createReadRangeHandler, READ_RANGE_DESCRIPTION } from "./tools/read-range.js";
import { createChangedSinceHandler, CHANGED_SINCE_DESCRIPTION } from "./tools/changed-since.js";
import { createGraftDiffHandler, GRAFT_DIFF_DESCRIPTION } from "./tools/graft-diff.js";
import { createRunCaptureHandler, RUN_CAPTURE_DESCRIPTION } from "./tools/run-capture.js";
import {
  createStateSaveHandler, createStateLoadHandler,
  STATE_SAVE_DESCRIPTION, STATE_LOAD_DESCRIPTION,
} from "./tools/state.js";
import { createDoctorHandler, DOCTOR_DESCRIPTION } from "./tools/doctor.js";
import { createStatsHandler, STATS_DESCRIPTION } from "./tools/stats.js";

export type { McpToolResult, ToolHandler, ToolContext };

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
      sessionId, seq,
      metrics: metrics.snapshot(),
      tripwires: session.checkTripwires(),
    });
    metrics.addBytesReturned(textBytes);
    return result;
  }

  const ctx: ToolContext = { projectRoot, graftDir, session, cache, metrics, respond };

  const toolDefs: { name: string; schema?: Record<string, z.ZodType>; desc: string; handler: ToolHandler }[] = [
    { name: "safe_read", schema: { path: z.string(), intent: z.string().optional() }, desc: SAFE_READ_DESCRIPTION, handler: createSafeReadHandler(ctx) },
    { name: "file_outline", schema: { path: z.string() }, desc: FILE_OUTLINE_DESCRIPTION, handler: createFileOutlineHandler(ctx) },
    { name: "read_range", schema: { path: z.string(), start: z.number(), end: z.number() }, desc: READ_RANGE_DESCRIPTION, handler: createReadRangeHandler(ctx) },
    { name: "changed_since", schema: { path: z.string(), consume: z.boolean().optional() }, desc: CHANGED_SINCE_DESCRIPTION, handler: createChangedSinceHandler(ctx) },
    { name: "graft_diff", schema: { base: z.string().optional(), head: z.string().optional(), path: z.string().optional() }, desc: GRAFT_DIFF_DESCRIPTION, handler: createGraftDiffHandler(ctx) },
    { name: "run_capture", schema: { command: z.string(), tail: z.number().optional() }, desc: RUN_CAPTURE_DESCRIPTION, handler: createRunCaptureHandler(ctx) },
    { name: "state_save", schema: { content: z.string() }, desc: STATE_SAVE_DESCRIPTION, handler: createStateSaveHandler(ctx) },
    { name: "state_load", desc: STATE_LOAD_DESCRIPTION, handler: createStateLoadHandler(ctx) },
    { name: "doctor", desc: DOCTOR_DESCRIPTION, handler: createDoctorHandler(ctx) },
    { name: "stats", desc: STATS_DESCRIPTION, handler: createStatsHandler(ctx) },
  ];

  for (const def of toolDefs) {
    handlers.set(def.name, def.handler);
    if (def.schema !== undefined) {
      mcpServer.registerTool(def.name, { description: def.desc, inputSchema: def.schema }, async (args) => {
        session.recordMessage();
        session.recordToolCall(def.name);
        return def.handler(args as Record<string, unknown>);
      });
    } else {
      mcpServer.registerTool(def.name, { description: def.desc }, async () => {
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
