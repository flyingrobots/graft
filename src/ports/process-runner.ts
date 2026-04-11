// ---------------------------------------------------------------------------
// ProcessRunner port — hexagonal boundary for command execution
// ---------------------------------------------------------------------------

export interface ProcessRunRequest {
  readonly command: string;
  readonly args: readonly string[];
  readonly cwd: string;
  readonly timeoutMs?: number;
  readonly maxBufferBytes?: number;
}

export interface ProcessRunResult {
  readonly status: number | null;
  readonly stdout: string;
  readonly stderr: string;
  readonly error?: Error;
}

export interface ProcessRunner {
  run(request: ProcessRunRequest): ProcessRunResult;
}
