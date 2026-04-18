import * as path from "node:path";
import { z } from "zod";
import type { ToolDefinition, ToolContext, ToolHandler } from "../context.js";
import { scrubSecrets } from "../secret-scrub.js";

const RUN_CAPTURE_POLICY_BOUNDARY = {
  kind: "shell_escape_hatch",
  boundedReadContract: false,
  policyEnforced: false,
} as const;

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

function renderCaptureError(result: {
  readonly status: number | null;
  readonly stderr: string;
  readonly error?: Error;
}): string {
  if (result.error !== undefined) {
    return result.error.message;
  }
  const stderr = result.stderr.trim();
  if (stderr.length > 0) {
    return stderr;
  }
  return `Command exited with status ${String(result.status)}`;
}

async function persistCaptureLog(ctx: ToolContext, output: string): Promise<{
  readonly logPath: string | null;
  readonly logRedactions: number;
}> {
  if (!ctx.runCapture.persistLogs) {
    return { logPath: null, logRedactions: 0 };
  }

  const logPath = path.join(ctx.graftDir, "logs", "capture.log");
  const persisted = ctx.runCapture.redactLogs ? scrubSecrets(output) : { value: output, redactions: 0 };

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
      const result = ctx.process.run({
        command: "sh",
        args: ["-c", command],
        cwd: ctx.projectRoot,
        timeoutMs: 30000,
        maxBufferBytes: 10 * 1024 * 1024,
      });

      if (result.error !== undefined || result.status !== 0) {
        const tailedOutput = tailOutput(result.stdout, tail);
        return ctx.respond("run_capture", {
          error: renderCaptureError(result),
          output: tailedOutput.tailed,
          totalLines: tailedOutput.totalLines,
          tailedLines: Math.min(tail, tailedOutput.totalLines),
          logPath: null,
          logRedactions: 0,
          logPersistenceEnabled: ctx.runCapture.persistLogs,
          truncated: tailedOutput.totalLines > tail,
          stderr: result.stderr.slice(0, 2000),
          policyBoundary: RUN_CAPTURE_POLICY_BOUNDARY,
        });
      }

      const output = result.stdout;
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
