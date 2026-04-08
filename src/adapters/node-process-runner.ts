// ---------------------------------------------------------------------------
// NodeProcessRunner — implements the ProcessRunner port
// ---------------------------------------------------------------------------

import { spawnSync } from "node:child_process";
import type { ProcessRunRequest, ProcessRunResult, ProcessRunner } from "../ports/process-runner.js";

class NodeProcessRunner implements ProcessRunner {
  run(request: ProcessRunRequest): ProcessRunResult {
    const result = spawnSync(request.command, [...request.args], {
      cwd: request.cwd,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      ...(request.timeoutMs !== undefined ? { timeout: request.timeoutMs } : {}),
      ...(request.maxBufferBytes !== undefined ? { maxBuffer: request.maxBufferBytes } : {}),
    });

    return {
      status: result.status,
      stdout: typeof result.stdout === "string" ? result.stdout : "",
      stderr: typeof result.stderr === "string" ? result.stderr : "",
      ...(result.error !== undefined ? { error: result.error } : {}),
    };
  }
}

export const nodeProcessRunner: ProcessRunner = new NodeProcessRunner();
