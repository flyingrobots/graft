// ---------------------------------------------------------------------------
// NodeGitClient — implements the GitClient port via GitPlumbing
// ---------------------------------------------------------------------------

import GitPlumbing from "@git-stunts/plumbing";
import type { GitClient, GitRunRequest } from "../ports/git.js";

class NodeGitClient implements GitClient {
  private readonly clients = new Map<string, Promise<GitPlumbing>>();

  private async resolveClient(cwd: string): Promise<GitPlumbing> {
    const cached = this.clients.get(cwd);
    if (cached !== undefined) return await cached;
    const created = GitPlumbing.createDefault({ cwd });
    this.clients.set(cwd, created);
    try {
      return await created;
    } catch (error: unknown) {
      if (this.clients.get(cwd) === created) this.clients.delete(cwd);
      throw error;
    }
  }

  async run(request: GitRunRequest) {
    try {
      const plumbing = await this.resolveClient(request.cwd);
      const stream = await plumbing.executeStream({ args: [...request.args] });
      const stdout = await stream.collect({
        asString: true,
        ...(request.maxBufferBytes !== undefined ? { maxBytes: request.maxBufferBytes } : {}),
      });
      const finished = await stream.finished;
      const error = "error" in finished && finished.error instanceof Error ? finished.error : undefined;
      return {
        status: finished.code,
        stdout: typeof stdout === "string" ? stdout : new TextDecoder().decode(stdout),
        stderr: finished.stderr,
        ...(error !== undefined ? { error } : {}),
      };
    } catch (error: unknown) {
      const normalized = error instanceof Error ? error : new Error(String(error));
      return {
        status: 1,
        stdout: "",
        stderr: normalized.message,
        error: normalized,
      };
    }
  }
}

export const nodeGit: GitClient = new NodeGitClient();
