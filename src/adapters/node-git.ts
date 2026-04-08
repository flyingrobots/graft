// ---------------------------------------------------------------------------
// NodeGitClient — implements the GitClient port via ProcessRunner
// ---------------------------------------------------------------------------

import type { GitClient, GitRunRequest } from "../ports/git.js";
import type { ProcessRunner } from "../ports/process-runner.js";
import { nodeProcessRunner } from "./node-process-runner.js";

class NodeGitClient implements GitClient {
  constructor(private readonly process: ProcessRunner) {}

  run(request: GitRunRequest) {
    return this.process.run({
      command: "git",
      args: request.args,
      cwd: request.cwd,
      ...(request.timeoutMs !== undefined ? { timeoutMs: request.timeoutMs } : {}),
      ...(request.maxBufferBytes !== undefined ? { maxBufferBytes: request.maxBufferBytes } : {}),
    });
  }
}

export const nodeGit: GitClient = new NodeGitClient(nodeProcessRunner);
