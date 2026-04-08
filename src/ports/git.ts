// ---------------------------------------------------------------------------
// GitClient port — hexagonal boundary for git command execution
// ---------------------------------------------------------------------------

import type { ProcessRunResult } from "./process-runner.js";

export interface GitRunRequest {
  readonly args: readonly string[];
  readonly cwd: string;
  readonly timeoutMs?: number;
  readonly maxBufferBytes?: number;
}

export interface GitClient {
  run(request: GitRunRequest): ProcessRunResult;
}
