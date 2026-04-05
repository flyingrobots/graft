import * as path from "node:path";
import { execFileSync } from "node:child_process";
import { z } from "zod";
import type { ToolDefinition, ToolContext, ToolHandler } from "../context.js";

export const runCaptureTool: ToolDefinition = {
  name: "run_capture",
  description:
    "Execute a shell command and return the last N lines of output " +
    "(default 60). Full output saved to .graft/logs/capture.log for " +
    "follow-up read_range calls.",
  schema: { command: z.string(), tail: z.number().optional() },
  createHandler(ctx: ToolContext): ToolHandler {
    return async (args) => {
      const command = args["command"] as string;
      const tail = Math.max(1, Math.floor((args["tail"] as number | undefined) ?? 60));
      // execFileSync is intentional: MCP tool calls are sequential per-session,
      // and synchronous execution simplifies stdout/stderr capture with timeout.
      let output: string;
      try {
        output = execFileSync("sh", ["-c", command], {
          cwd: ctx.projectRoot,
          encoding: "utf-8",
          timeout: 30000,
          stdio: ["pipe", "pipe", "pipe"],
          maxBuffer: 10 * 1024 * 1024,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        const stdout = (err as { stdout?: string }).stdout ?? "";
        const stderr = (err as { stderr?: string }).stderr ?? "";
        // Return whatever stdout was captured before failure
        const tailed = typeof stdout === "string"
          ? stdout.split("\n").slice(-tail).join("\n")
          : "";
        const totalLines = typeof stdout === "string" ? stdout.split("\n").length : 0;
        return ctx.respond("run_capture", {
          error: msg,
          output: tailed,
          totalLines,
          tailedLines: Math.min(tail, totalLines),
          truncated: totalLines > tail,
          stderr: typeof stderr === "string" ? stderr.slice(0, 2000) : "",
        });
      }

      const lines = output.split("\n");
      const tailed = lines.slice(-tail).join("\n");
      const logPath = path.join(ctx.graftDir, "logs", "capture.log");
      let logWriteSucceeded = true;
      try {
        await ctx.fs.mkdir(path.dirname(logPath), { recursive: true });
        await ctx.fs.writeFile(logPath, output, "utf-8");
      } catch {
        // Log persistence failure must not mask a successful command
        logWriteSucceeded = false;
      }
      return ctx.respond("run_capture", {
        output: tailed,
        totalLines: lines.length,
        tailedLines: Math.min(tail, lines.length),
        logPath: logWriteSucceeded ? logPath : null,
        truncated: lines.length > tail,
      });
    };
  },
};
