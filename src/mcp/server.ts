import * as crypto from "node:crypto";
import * as path from "node:path";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SessionTracker } from "../session/tracker.js";
import { Metrics } from "./metrics.js";
import { ObservationCache } from "./cache.js";
import { buildReceiptResult } from "./receipt.js";
import type { ToolHandler, ToolContext, ToolDefinition } from "./context.js";
import { createPathResolver } from "./context.js";
import type { McpToolResult } from "./receipt.js";
import { nodeFs } from "../adapters/node-fs.js";
import { CanonicalJsonCodec } from "../adapters/canonical-json.js";

// Tool definitions — each file exports a ToolDefinition object
import { safeReadTool } from "./tools/safe-read.js";
import { fileOutlineTool } from "./tools/file-outline.js";
import { readRangeTool } from "./tools/read-range.js";
import { changedSinceTool } from "./tools/changed-since.js";
import { graftDiffTool } from "./tools/graft-diff.js";
import { runCaptureTool } from "./tools/run-capture.js";
import { stateSaveTool, stateLoadTool } from "./tools/state.js";
import { doctorTool } from "./tools/doctor.js";
import { statsTool } from "./tools/stats.js";
import { explainTool } from "./tools/explain.js";

export type { McpToolResult, ToolHandler, ToolContext };

/** All registered tool definitions. Add new tools here. */
const TOOL_REGISTRY: readonly ToolDefinition[] = [
  safeReadTool,
  fileOutlineTool,
  readRangeTool,
  changedSinceTool,
  graftDiffTool,
  runCaptureTool,
  stateSaveTool,
  stateLoadTool,
  doctorTool,
  statsTool,
  explainTool,
];

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
  const codec = new CanonicalJsonCodec();
  const handlers = new Map<string, ToolHandler>();
  const schemas = new Map<string, z.ZodObject>();
  let seq = 0;

  function respond(tool: string, data: Record<string, unknown>): McpToolResult {
    seq++;
    const { result, textBytes } = buildReceiptResult(tool, data, {
      sessionId, seq, codec,
      metrics: metrics.snapshot(),
      tripwires: session.checkTripwires(),
    });
    metrics.addBytesReturned(textBytes);
    return result;
  }

  const ctx: ToolContext = { projectRoot, graftDir, session, cache, metrics, respond, resolvePath: createPathResolver(projectRoot), fs: nodeFs, codec };

  for (const def of TOOL_REGISTRY) {
    const handler = def.createHandler(ctx);
    handlers.set(def.name, handler);

    if (def.schema !== undefined) {
      const zodSchema = z.object(def.schema).strict();
      schemas.set(def.name, zodSchema);
      mcpServer.registerTool(def.name, { description: def.description, inputSchema: def.schema }, async (args) => {
        session.recordMessage();
        session.recordToolCall(def.name);
        const parsed: Record<string, unknown> = zodSchema.parse(args);
        return handler(parsed);
      });
    } else {
      mcpServer.registerTool(def.name, { description: def.description }, async () => {
        session.recordMessage();
        session.recordToolCall(def.name);
        return handler({});
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
      const schema = schemas.get(name);
      const parsed: Record<string, unknown> = schema !== undefined ? schema.parse(args) : args;
      return handler(parsed);
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
