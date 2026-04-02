import * as path from "node:path";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { SessionTracker } from "../session/tracker.js";
import { safeRead } from "../operations/safe-read.js";
import { fileOutline } from "../operations/file-outline.js";
import { readRange } from "../operations/read-range.js";
import { stateSave, stateLoad } from "../operations/state.js";

export type McpToolResult = CallToolResult;

type ToolHandler = (args: Record<string, unknown>) => Promise<McpToolResult>;

function textResult(data: unknown): McpToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data) }] };
}

export interface GraftServer {
  getRegisteredTools(): string[];
  callTool(name: string, args: Record<string, unknown>): Promise<McpToolResult>;
  injectSessionMessages(count: number): void;
  getMcpServer(): McpServer;
}

export function createGraftServer(): GraftServer {
  const mcpServer = new McpServer({ name: "graft", version: "0.0.0" });
  const session = new SessionTracker();
  const projectRoot = process.cwd();
  const graftDir = path.join(projectRoot, ".graft");

  const handlers = new Map<string, ToolHandler>();

  let totalReads = 0;
  let totalOutlines = 0;
  let totalRefusals = 0;

  function registerTool(
    name: string,
    schema: Record<string, z.ZodType> | undefined,
    handler: ToolHandler,
  ): void {
    handlers.set(name, handler);
    if (schema !== undefined) {
      mcpServer.registerTool(name, { inputSchema: schema }, async (args) => {
        session.recordMessage();
        session.recordToolCall(name);
        return handler(args as Record<string, unknown>);
      });
    } else {
      mcpServer.registerTool(name, {}, async () => {
        session.recordMessage();
        session.recordToolCall(name);
        return handler({});
      });
    }
  }

  function withTripwires(data: Record<string, unknown>): Record<string, unknown> {
    const wires = session.checkTripwires();
    if (wires.length > 0) {
      return { ...data, tripwire: wires };
    }
    return data;
  }

  // --- safe_read ---
  registerTool(
    "safe_read",
    { path: z.string(), intent: z.string().optional() },
    async (args) => {
      const filePath = path.resolve(projectRoot, args["path"] as string);
      const result = await safeRead(filePath, {
        intent: args["intent"] as string | undefined,
        sessionDepth: session.getSessionDepth(),
      });
      if (result.projection === "content") totalReads++;
      if (result.projection === "outline") totalOutlines++;
      if (result.projection === "refused") totalRefusals++;
      return textResult(withTripwires(result as unknown as Record<string, unknown>));
    },
  );

  // --- file_outline ---
  registerTool("file_outline", { path: z.string() }, async (args) => {
    const filePath = path.resolve(projectRoot, args["path"] as string);
    const result = await fileOutline(filePath);
    totalOutlines++;
    return textResult(withTripwires(result as unknown as Record<string, unknown>));
  });

  // --- read_range ---
  registerTool(
    "read_range",
    { path: z.string(), start: z.number(), end: z.number() },
    async (args) => {
      const filePath = path.resolve(projectRoot, args["path"] as string);
      const result = await readRange(filePath, args["start"] as number, args["end"] as number);
      totalReads++;
      return textResult(withTripwires(result as unknown as Record<string, unknown>));
    },
  );

  // --- run_capture ---
  registerTool(
    "run_capture",
    { command: z.string(), tail: z.number().optional() },
    () => Promise.resolve(textResult({ message: "not yet implemented" })),
  );

  // --- state_save ---
  registerTool("state_save", { content: z.string() }, async (args) => {
    const result = await stateSave(args["content"] as string, { graftDir });
    return textResult(result);
  });

  // --- state_load ---
  registerTool("state_load", undefined, async () => {
    const result = await stateLoad({ graftDir });
    return textResult(result);
  });

  // --- doctor ---
  registerTool("doctor", undefined, () => {
    return Promise.resolve(textResult({
      projectRoot,
      parserHealthy: true,
      thresholds: { lines: 150, bytes: 12288 },
      sessionDepth: session.getSessionDepth(),
      totalMessages: session.getMessageCount(),
    }));
  });

  // --- stats ---
  registerTool("stats", undefined, () => {
    return Promise.resolve(textResult({
      totalReads,
      totalOutlines,
      totalRefusals,
    }));
  });

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
