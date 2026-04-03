import * as fs from "node:fs";
import * as crypto from "node:crypto";
import * as path from "node:path";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { SessionTracker } from "../session/tracker.js";
import { safeRead } from "../operations/safe-read.js";
import { fileOutline } from "../operations/file-outline.js";
import { readRange } from "../operations/read-range.js";
import { stateSave, stateLoad } from "../operations/state.js";
import type { OutlineEntry, JumpEntry } from "../parser/types.js";

export type McpToolResult = CallToolResult;

type ToolHandler = (args: Record<string, unknown>) => Promise<McpToolResult>;

function textResult(data: unknown): McpToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data) }] };
}

// ---------------------------------------------------------------------------
// Observation cache
// ---------------------------------------------------------------------------

interface Observation {
  contentHash: string;
  outline: OutlineEntry[];
  jumpTable: JumpEntry[];
  actual: { lines: number; bytes: number };
  readCount: number;
  firstReadAt: string;
  lastReadAt: string;
}

function hashContent(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

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
  const projectRoot = process.cwd();
  const graftDir = path.join(projectRoot, ".graft");

  const handlers = new Map<string, ToolHandler>();
  const observations = new Map<string, Observation>();

  let totalReads = 0;
  let totalOutlines = 0;
  let totalRefusals = 0;
  let totalCacheHits = 0;
  let totalBytesAvoidedByCache = 0;

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

  function recordObservation(
    filePath: string,
    contentHash: string,
    outline: OutlineEntry[],
    jumpTable: JumpEntry[],
    actual: { lines: number; bytes: number },
  ): void {
    const existing = observations.get(filePath);
    const now = new Date().toISOString();
    observations.set(filePath, {
      contentHash,
      outline,
      jumpTable,
      actual,
      readCount: (existing?.readCount ?? 0) + 1,
      firstReadAt: existing?.firstReadAt ?? now,
      lastReadAt: now,
    });
  }

  function checkCache(filePath: string, currentContent: string): Observation | null {
    const obs = observations.get(filePath);
    if (obs === undefined) return null;
    if (obs.contentHash === hashContent(currentContent)) return obs;
    // Hash mismatch — invalidate
    observations.delete(filePath);
    return null;
  }

  // --- safe_read ---
  registerTool(
    "safe_read",
    { path: z.string(), intent: z.string().optional() },
    async (args) => {
      const filePath = path.resolve(projectRoot, args["path"] as string);

      // Try to read the file for cache check
      let rawContent: string | null = null;
      try {
        rawContent = fs.readFileSync(filePath, "utf-8");
      } catch {
        // File doesn't exist or can't be read — proceed to safeRead for error handling
      }

      // Check cache if we could read the file
      if (rawContent !== null) {
        const cached = checkCache(filePath, rawContent);
        if (cached !== null) {
          const now = new Date().toISOString();
          cached.readCount++;
          cached.lastReadAt = now;
          totalCacheHits++;
          totalBytesAvoidedByCache += cached.actual.bytes;
          return textResult(withTripwires({
            path: filePath,
            projection: "cache_hit",
            reason: "REREAD_UNCHANGED",
            outline: cached.outline,
            jumpTable: cached.jumpTable,
            actual: cached.actual,
            readCount: cached.readCount,
            estimatedBytesAvoided: cached.actual.bytes,
            lastReadAt: now,
          }));
        }
      }

      // Fresh read
      const result = await safeRead(filePath, {
        intent: args["intent"] as string | undefined,
        sessionDepth: session.getSessionDepth(),
      });

      if (result.projection === "content") totalReads++;
      if (result.projection === "outline") totalOutlines++;
      if (result.projection === "refused") totalRefusals++;

      // Record observation for content and outline projections (not refusals/errors)
      if (rawContent !== null && (result.projection === "content" || result.projection === "outline")) {
        const outlineResult = await fileOutline(filePath);
        recordObservation(
          filePath,
          hashContent(rawContent),
          outlineResult.outline,
          outlineResult.jumpTable,
          result.actual as { lines: number; bytes: number },
        );
      }

      return textResult(withTripwires(result as unknown as Record<string, unknown>));
    },
  );

  // --- file_outline ---
  registerTool("file_outline", { path: z.string() }, async (args) => {
    const filePath = path.resolve(projectRoot, args["path"] as string);

    // Check cache
    let rawContent: string | null = null;
    try {
      rawContent = fs.readFileSync(filePath, "utf-8");
    } catch {
      // proceed to fileOutline for error handling
    }

    if (rawContent !== null) {
      const cached = checkCache(filePath, rawContent);
      if (cached !== null) {
        cached.readCount++;
        cached.lastReadAt = new Date().toISOString();
        return textResult(withTripwires({
          path: filePath,
          outline: cached.outline,
          jumpTable: cached.jumpTable,
          cacheHit: true,
        }));
      }
    }

    const result = await fileOutline(filePath);
    totalOutlines++;

    // Record observation
    if (rawContent !== null) {
      recordObservation(
        filePath,
        hashContent(rawContent),
        result.outline,
        result.jumpTable,
        { lines: rawContent.split("\n").length, bytes: Buffer.byteLength(rawContent) },
      );
    }

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
      totalCacheHits,
      totalBytesAvoidedByCache,
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
