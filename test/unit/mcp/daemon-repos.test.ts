import { afterEach, describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { createManagedDaemonServer, parse } from "../../helpers/mcp.js";
import { cleanupTestRepo, createCommittedTestRepo, git } from "../../helpers/git.js";

const cleanups: (() => void)[] = [];

afterEach(() => {
  while (cleanups.length > 0) {
    cleanups.pop()!();
  }
});

function createCommittedRepo(): string {
  const repoDir = createCommittedTestRepo("graft-daemon-repos-");
  cleanups.push(() => {
    cleanupTestRepo(repoDir);
  });
  return repoDir;
}

describe("mcp: daemon repos", () => {
  it("lists bounded repo rows with worktree and monitor summary and supports filtering", async () => {
    const repoDir = createCommittedRepo();
    git(repoDir, "branch secondary");
    const worktreeDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-daemon-repos-worktree-"));
    git(repoDir, `worktree add ${worktreeDir} secondary`);
    cleanups.push(() => {
      fs.rmSync(worktreeDir, { recursive: true, force: true });
    });
    const server = createManagedDaemonServer(cleanups);

    await server.callTool("workspace_authorize", { cwd: repoDir });
    await server.callTool("workspace_authorize", { cwd: worktreeDir });
    const bind = parse(await server.callTool("workspace_bind", { cwd: repoDir })) as {
      repoId: string;
    };
    await server.callTool("monitor_start", { cwd: repoDir, pollIntervalMs: 60_000 });

    const listed = parse(await server.callTool("daemon_repos", {})) as {
      repos: {
        repoId: string;
        authorizedWorkspaces: number;
        backlogCommits: number;
        worktrees: {
          worktreeRoot: string;
          activeSessions: number;
        }[];
        monitor: {
          health: string;
          lifecycleState: string;
        } | null;
      }[];
    };
    expect(listed.repos).toEqual([
      expect.objectContaining({
        repoId: bind.repoId,
        authorizedWorkspaces: 2,
        backlogCommits: expect.any(Number),
        monitor: expect.objectContaining({
          health: expect.any(String),
          lifecycleState: "running",
        }),
        worktrees: expect.arrayContaining([
          expect.objectContaining({
            worktreeRoot: fs.realpathSync(repoDir),
            activeSessions: 0,
          }),
          expect.objectContaining({
            worktreeRoot: fs.realpathSync(worktreeDir),
            activeSessions: 0,
          }),
        ]),
      }),
    ]);

    const filteredByWorktree = parse(await server.callTool("daemon_repos", { cwd: worktreeDir })) as {
      repos: { repoId: string }[];
      filter: { cwd: string };
    };
    expect(filteredByWorktree.filter.cwd).toBe(worktreeDir);
    expect(filteredByWorktree.repos).toHaveLength(1);
    expect(filteredByWorktree.repos[0]!.repoId).toBe(bind.repoId);

    const filteredByRepo = parse(await server.callTool("daemon_repos", { repoId: bind.repoId })) as {
      repos: { repoId: string }[];
      filter: { repoId: string };
    };
    expect(filteredByRepo.filter.repoId).toBe(bind.repoId);
    expect(filteredByRepo.repos).toHaveLength(1);
  });

  it("returns an empty repo view when the filter is outside the authorized daemon surface", async () => {
    const server = createManagedDaemonServer(cleanups);
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-daemon-repos-miss-"));
    cleanups.push(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    const listed = parse(await server.callTool("daemon_repos", { cwd: tmpDir })) as {
      repos: unknown[];
    };
    expect(listed.repos).toEqual([]);
  });
});
