import * as path from "node:path";
import { execFileSync } from "node:child_process";
import { z } from "zod";
import type { ToolDefinition, ToolContext, ToolHandler } from "../context.js";

const RUN_CAPTURE_POLICY_BOUNDARY = {
  kind: "shell_escape_hatch",
  boundedReadContract: false,
  policyEnforced: false,
} as const;

const PRIVATE_KEY_BLOCK_RE = /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g;
const SECRET_ASSIGNMENT_RE = /(\b(?:api[_-]?key|access[_-]?token|auth(?:orization)?|bearer|token|secret|password|passwd|private[_-]?key|client[_-]?secret|session[_-]?key)\b\s*[:=]\s*)([^\r\n]+)/gi;
const BEARER_TOKEN_RE = /(\bbearer\s+)([A-Za-z0-9._~+/=-]{8,})/gi;

function tailOutput(output: string, tail: number): {
  readonly tailed: string;
  readonly totalLines: number;
} {
  const lines = output.split("\n");
  return {
    tailed: lines.slice(-tail).join("\n"),
    totalLines: lines.length,
  };
}

function redactForLog(output: string): {
  readonly value: string;
  readonly redactions: number;
} {
  let redactions = 0;
  let value = output.replace(PRIVATE_KEY_BLOCK_RE, () => {
    redactions++;
    return "[REDACTED PRIVATE KEY BLOCK]";
  });
  value = value.replace(SECRET_ASSIGNMENT_RE, (_match, prefix: string) => {
    redactions++;
    return `${prefix}[REDACTED]`;
  });
  value = value.replace(BEARER_TOKEN_RE, (_match, prefix: string) => {
    redactions++;
    return `${prefix}[REDACTED]`;
  });
  return { value, redactions };
}

async function persistCaptureLog(ctx: ToolContext, output: string): Promise<{
  readonly logPath: string | null;
  readonly logRedactions: number;
}> {
  if (!ctx.runCapture.persistLogs) {
    return { logPath: null, logRedactions: 0 };
  }

  const logPath = path.join(ctx.graftDir, "logs", "capture.log");
  const persisted = ctx.runCapture.redactLogs ? redactForLog(output) : { value: output, redactions: 0 };

  try {
    await ctx.fs.mkdir(path.dirname(logPath), { recursive: true });
    await ctx.fs.writeFile(logPath, persisted.value, "utf-8");
    return {
      logPath,
      logRedactions: persisted.redactions,
    };
  } catch {
    return { logPath: null, logRedactions: 0 };
  }
}

export const runCaptureTool: ToolDefinition = {
  name: "run_capture",
  description:
    "Execute a shell command and return the last N lines of output " +
    "(default 60). Responses include an explicit policy boundary. " +
    "Persisted logs can be disabled and obvious secrets are redacted " +
    "before writing to .graft/logs/capture.log.",
  schema: { command: z.string(), tail: z.number().optional() },
  createHandler(ctx: ToolContext): ToolHandler {
    return async (args) => {
      const command = args["command"] as string;
      const tail = Math.max(1, Math.floor((args["tail"] as number | undefined) ?? 60));
      if (!ctx.runCapture.enabled) {
        return ctx.respond("run_capture", {
          output: "",
          totalLines: 0,
          tailedLines: 0,
          logPath: null,
          logRedactions: 0,
          logPersistenceEnabled: false,
          truncated: false,
          disabled: true,
          error: "run_capture is disabled by configuration",
          policyBoundary: RUN_CAPTURE_POLICY_BOUNDARY,
        });
      }
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
        const tailedOutput = typeof stdout === "string" ? tailOutput(stdout, tail) : { tailed: "", totalLines: 0 };
        return ctx.respond("run_capture", {
          error: msg,
          output: tailedOutput.tailed,
          totalLines: tailedOutput.totalLines,
          tailedLines: Math.min(tail, tailedOutput.totalLines),
          logPath: null,
          logRedactions: 0,
          logPersistenceEnabled: ctx.runCapture.persistLogs,
          truncated: tailedOutput.totalLines > tail,
          stderr: typeof stderr === "string" ? stderr.slice(0, 2000) : "",
          policyBoundary: RUN_CAPTURE_POLICY_BOUNDARY,
        });
      }

      const tailedOutput = tailOutput(output, tail);
      const persisted = await persistCaptureLog(ctx, output);
      return ctx.respond("run_capture", {
        output: tailedOutput.tailed,
        totalLines: tailedOutput.totalLines,
        tailedLines: Math.min(tail, tailedOutput.totalLines),
        logPath: persisted.logPath,
        logRedactions: persisted.logRedactions,
        logPersistenceEnabled: ctx.runCapture.persistLogs,
        truncated: tailedOutput.totalLines > tail,
        policyBoundary: RUN_CAPTURE_POLICY_BOUNDARY,
      });
    };
  },
};
