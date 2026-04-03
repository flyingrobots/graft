import * as fs from "node:fs";
import { execFileSync } from "node:child_process";
import * as crypto from "node:crypto";
import * as path from "node:path";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { SessionTracker } from "../session/tracker.js";
import { safeRead } from "../operations/safe-read.js";
import { fileOutline } from "../operations/file-outline.js";
import { evaluatePolicy } from "../policy/evaluate.js";
import { RefusedResult } from "../policy/types.js";
import { readRange } from "../operations/read-range.js";
import { stateSave, stateLoad } from "../operations/state.js";
import { extractOutline } from "../parser/outline.js";
import { diffOutlines } from "../parser/diff.js";
import { detectLang } from "../parser/lang.js";
import { graftDiff } from "../operations/graft-diff.js";
import { Metrics } from "./metrics.js";
import { ObservationCache, hashContent } from "./cache.js";
import { buildReceiptResult } from "./receipt.js";

export type McpToolResult = CallToolResult;

type ToolHandler = (args: Record<string, unknown>) => Promise<McpToolResult>;


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

  const handlers = new Map<string, ToolHandler>();
  const cache = new ObservationCache();

  const metrics = new Metrics();
  let seq = 0;

  function registerTool(
    name: string,
    opts: { schema?: Record<string, z.ZodType> | undefined; description?: string | undefined },
    handler: ToolHandler,
  ): void {
    handlers.set(name, handler);
    const desc = opts.description ?? "";
    if (opts.schema !== undefined) {
      mcpServer.registerTool(name, { description: desc, inputSchema: opts.schema }, async (args) => {
        session.recordMessage();
        session.recordToolCall(name);
        return handler(args as Record<string, unknown>);
      });
    } else {
      mcpServer.registerTool(name, { description: desc }, async () => {
        session.recordMessage();
        session.recordToolCall(name);
        return handler({});
      });
    }
  }

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

  // --- safe_read ---
  registerTool(
    "safe_read",
    {
      schema: { path: z.string(), intent: z.string().optional() },
      description: "Policy-enforced file read. Returns full content for small files, structural outline with jump table for large files, or refusal with reason code for banned files. Detects re-reads and returns cached outlines or structural diffs.",
    },
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
        const cacheResult = cache.check(filePath, rawContent);
        if (cacheResult.hit) {
          const now = new Date().toISOString();
          cacheResult.obs.readCount++;
          cacheResult.obs.lastReadAt = now;
          metrics.recordCacheHit(cacheResult.obs.actual.bytes);
          return respond("safe_read", {
            path: filePath,
            projection: "cache_hit",
            reason: "REREAD_UNCHANGED",
            outline: cacheResult.obs.outline,
            jumpTable: cacheResult.obs.jumpTable,
            actual: cacheResult.obs.actual,
            readCount: cacheResult.obs.readCount,
            estimatedBytesAvoided: cacheResult.obs.actual.bytes,
            lastReadAt: now,
          });
        }

        // File changed since last observation — compute structural diff
        if (cacheResult.stale !== null) {
          // Defense: re-check policy before returning structural data.
          // If the file should now be refused (e.g., path became banned),
          // return the refusal instead of a diff.
          const actual = {
            lines: rawContent.split("\n").length,
            bytes: Buffer.byteLength(rawContent),
          };
          const policy = evaluatePolicy(
            { path: filePath, lines: actual.lines, bytes: actual.bytes },
            { sessionDepth: session.getSessionDepth() },
          );
          if (policy instanceof RefusedResult) {
            metrics.recordRefusal();
            return respond("safe_read", {
              path: filePath,
              projection: "refused",
              reason: policy.reason,
              reasonDetail: policy.reasonDetail,
              next: [...policy.next],
              actual,
            });
          }

          // Use extractOutline with rawContent directly to avoid snapshot race —
          // fileOutline re-reads the file, which could differ from rawContent.
          const newOutlineResult = extractOutline(rawContent, detectLang(filePath) ?? "ts");
          const diff = diffOutlines(cacheResult.stale.outline, newOutlineResult.entries);
          const newReadCount = cacheResult.stale.readCount + 1;
          // Update observation cache with new state
          cache.record(
            filePath,
            hashContent(rawContent),
            newOutlineResult.entries,
            newOutlineResult.jumpTable ?? [],
            actual,
          );
          // Use the updated observation's lastReadAt (set by recordObservation)
          const updatedObs = cache.get(filePath);
          return respond("safe_read", {
            path: filePath,
            projection: "diff",
            reason: "CHANGED_SINCE_LAST_READ",
            diff,
            outline: newOutlineResult.entries,
            jumpTable: newOutlineResult.jumpTable ?? [],
            actual,
            readCount: newReadCount,
            lastReadAt: updatedObs?.lastReadAt ?? new Date().toISOString(),
          });
        }
      }

      // First read — no previous observation
      const result = await safeRead(filePath, {
        intent: args["intent"] as string | undefined,
        sessionDepth: session.getSessionDepth(),
      });

      if (result.projection === "content") metrics.recordRead();
      if (result.projection === "outline") metrics.recordOutline();
      if (result.projection === "refused") metrics.recordRefusal();

      // Record observation for content and outline projections (not refusals/errors)
      if (rawContent !== null && (result.projection === "content" || result.projection === "outline")) {
        const outlineResult = await fileOutline(filePath);
        cache.record(
          filePath,
          hashContent(rawContent),
          outlineResult.outline,
          outlineResult.jumpTable,
          result.actual as { lines: number; bytes: number },
        );
      }

      return respond("safe_read", result as unknown as Record<string, unknown>);
    },
  );

  // --- file_outline ---
  registerTool("file_outline", {
    schema: { path: z.string() },
    description: "Structural skeleton of a file — function signatures, class shapes, exports. Includes a jump table mapping each symbol to its line range for targeted read_range follow-ups.",
  }, async (args) => {
    const filePath = path.resolve(projectRoot, args["path"] as string);

    // Check cache
    let rawContent: string | null = null;
    try {
      rawContent = fs.readFileSync(filePath, "utf-8");
    } catch {
      // proceed to fileOutline for error handling
    }

    if (rawContent !== null) {
      const cacheResult = cache.check(filePath, rawContent);
      if (cacheResult.hit) {
        cacheResult.obs.readCount++;
        cacheResult.obs.lastReadAt = new Date().toISOString();
        return respond("file_outline", {
          path: filePath,
          outline: cacheResult.obs.outline,
          jumpTable: cacheResult.obs.jumpTable,
          cacheHit: true,
        });
      }
      // If stale, fall through to fresh parse (no diff for file_outline)
    }

    const result = await fileOutline(filePath);
    metrics.recordOutline();

    // Record observation
    if (rawContent !== null) {
      cache.record(
        filePath,
        hashContent(rawContent),
        result.outline,
        result.jumpTable,
        { lines: rawContent.split("\n").length, bytes: Buffer.byteLength(rawContent) },
      );
    }

    return respond("file_outline", result as unknown as Record<string, unknown>);
  });

  // --- read_range ---
  registerTool(
    "read_range",
    {
      schema: { path: z.string(), start: z.number(), end: z.number() },
      description: "Read a bounded range of lines from a file. Maximum 250 lines. Use jump table entries from file_outline or safe_read to target specific symbols.",
    },
    async (args) => {
      const filePath = path.resolve(projectRoot, args["path"] as string);
      const result = await readRange(filePath, args["start"] as number, args["end"] as number);
      metrics.recordRead();
      return respond("read_range", result as unknown as Record<string, unknown>);
    },
  );

  // --- changed_since ---
  // Peek by default: returns the diff without updating the observation cache.
  // With consume: true, updates the cache so the next safe_read sees cache_hit.
  // Semantics: safe_read = always consumes. changed_since = peek unless told otherwise.
  registerTool("changed_since", {
    schema: { path: z.string(), consume: z.boolean().optional() },
    description: "Check if a file changed since it was last read. Returns structural diff (added/removed/changed symbols) or 'unchanged'. Peek mode by default; pass consume: true to update the observation cache.",
  }, (args) => {
    const filePath = path.resolve(projectRoot, args["path"] as string);
    const consume = (args["consume"] as boolean | undefined) === true;

    // Policy check: refuse banned files even via changed_since.
    // Read the file first to get dimensions for policy evaluation.
    let rawContent: string;
    try {
      rawContent = fs.readFileSync(filePath, "utf-8");
    } catch {
      return Promise.resolve(respond("changed_since", { status: "file_not_found" }));
    }

    const actual = {
      lines: rawContent.split("\n").length,
      bytes: Buffer.byteLength(rawContent),
    };
    const policy = evaluatePolicy(
      { path: filePath, lines: actual.lines, bytes: actual.bytes },
      { sessionDepth: session.getSessionDepth() },
    );
    if (policy instanceof RefusedResult) {
      return Promise.resolve(respond("changed_since", { status: "refused", reason: policy.reason }));
    }

    const obs = cache.get(filePath);
    if (obs === undefined) {
      return Promise.resolve(respond("changed_since", { status: "no_previous_observation" }));
    }

    if (obs.contentHash === hashContent(rawContent)) {
      return Promise.resolve(respond("changed_since", { status: "unchanged" }));
    }

    // Use extractOutline with rawContent directly to avoid snapshot race.
    const newOutlineResult = extractOutline(rawContent, detectLang(filePath) ?? "ts");
    const diff = diffOutlines(obs.outline, newOutlineResult.entries);

    if (consume) {
      const actual = {
        lines: rawContent.split("\n").length,
        bytes: Buffer.byteLength(rawContent),
      };
      cache.record(
        filePath,
        hashContent(rawContent),
        newOutlineResult.entries,
        newOutlineResult.jumpTable ?? [],
        actual,
      );
    }

    return Promise.resolve(respond("changed_since", { diff, consumed: consume }));
  });

  // --- graft_diff ---
  registerTool(
    "graft_diff",
    {
      schema: { base: z.string().optional(), head: z.string().optional(), path: z.string().optional() },
      description: "Structural diff between two git refs. Shows added, removed, and changed symbols per file — not line hunks. Defaults to working tree vs HEAD.",
    },
    (args) => {
      const result = graftDiff({
        cwd: projectRoot,
        base: args["base"] as string | undefined,
        head: args["head"] as string | undefined,
        path: args["path"] as string | undefined,
      });
      return Promise.resolve(respond("graft_diff", result as unknown as Record<string, unknown>));
    },
  );

  // --- run_capture ---
  registerTool(
    "run_capture",
    {
      schema: { command: z.string(), tail: z.number().optional() },
      description: "Execute a shell command and return the last N lines of output (default 60). Full output saved to .graft/logs/capture.log for follow-up read_range calls.",
    },
    (args) => {
      const command = args["command"] as string;
      const tail = (args["tail"] as number | undefined) ?? 60;
      try {
        const output = execFileSync("sh", ["-c", command], {
          cwd: projectRoot,
          encoding: "utf-8",
          timeout: 30000,
          stdio: ["pipe", "pipe", "pipe"],
          maxBuffer: 10 * 1024 * 1024,
        });
        const lines = output.split("\n");
        const tailed = lines.slice(-tail).join("\n");
        // Write full output to log for follow-up read_range
        const logPath = path.join(graftDir, "logs", "capture.log");
        fs.mkdirSync(path.dirname(logPath), { recursive: true });
        fs.writeFileSync(logPath, output);
        return Promise.resolve(respond("run_capture", {
          output: tailed,
          totalLines: lines.length,
          tailedLines: Math.min(tail, lines.length),
          logPath,
          truncated: lines.length > tail,
        }));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        const stdout = (err as { stdout?: string }).stdout ?? "";
        const stderr = (err as { stderr?: string }).stderr ?? "";
        // Return whatever stdout was captured before failure
        const tailed = typeof stdout === "string"
          ? stdout.split("\n").slice(-tail).join("\n")
          : "";
        return Promise.resolve(respond("run_capture", {
          error: msg,
          output: tailed,
          stderr: typeof stderr === "string" ? stderr.slice(0, 2000) : "",
        }));
      }
    },
  );

  // --- state_save ---
  registerTool("state_save", {
    schema: { content: z.string() },
    description: "Save session working state (max 8 KB). Use for session bookmarks: current task, files modified, next planned actions.",
  }, async (args) => {
    const result = await stateSave(args["content"] as string, { graftDir });
    return respond("state_save", result as Record<string, unknown>);
  });

  // --- state_load ---
  registerTool("state_load", {
    description: "Load previously saved session state. Returns null if no state has been saved.",
  }, async () => {
    const result = await stateLoad({ graftDir });
    return respond("state_load", result as Record<string, unknown>);
  });

  // --- doctor ---
  registerTool("doctor", {
    description: "Runtime health check. Shows project root, parser status, active thresholds, session depth, and message count.",
  }, () => {
    return Promise.resolve(respond("doctor", {
      projectRoot,
      parserHealthy: true,
      thresholds: { lines: 150, bytes: 12288 },
      sessionDepth: session.getSessionDepth(),
      totalMessages: session.getMessageCount(),
    }));
  });

  // --- stats ---
  registerTool("stats", {
    description: "Decision metrics for the current session. Total reads, outlines, refusals, cache hits, and bytes avoided.",
  }, () => {
    return Promise.resolve(respond("stats", {
      totalReads: metrics.snapshot().reads,
      totalOutlines: metrics.snapshot().outlines,
      totalRefusals: metrics.snapshot().refusals,
      totalCacheHits: metrics.snapshot().cacheHits,
      totalBytesAvoidedByCache: metrics.snapshot().bytesAvoided,
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
