import { afterEach, describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { createIsolatedServer, parse } from "../../helpers/mcp.js";
import { cleanupTestRepo, createTestRepo, git } from "../../helpers/git.js";

const cleanups: (() => void)[] = [];

afterEach(() => {
  while (cleanups.length > 0) {
    cleanups.pop()!();
  }
});

function createDaemonServer() {
  const isolated = createIsolatedServer({ mode: "daemon" });
  cleanups.push(() => {
    isolated.cleanup();
  });
  return isolated.server;
}

function createCommittedRepo(): string {
  const repoDir = createTestRepo("graft-workspace-bind-");
  cleanups.push(() => {
    cleanupTestRepo(repoDir);
  });
  fs.writeFileSync(path.join(repoDir, "app.ts"), "export const ready = true;\n");
  git(repoDir, "add -A");
  git(repoDir, "commit -m init");
  return repoDir;
}

describe("mcp: daemon workspace binding", () => {
  it("starts unbound and reports daemon workspace status", async () => {
    const server = createDaemonServer();
    const status = parse(await server.callTool("workspace_status", {}));

    expect(status["sessionMode"]).toBe("daemon");
    expect(status["bindState"]).toBe("unbound");
    expect(status["repoId"]).toBeNull();
    expect(status["capabilityProfile"]).toBeNull();
  });

  it("denies repo-scoped tools while unbound", async () => {
    const server = createDaemonServer();
    await expect(server.callTool("safe_read", { path: "app.ts" }))
      .rejects
      .toThrow(/workspace_bind/);
  });

  it("binds a daemon session to a repo and enables repo-scoped tools", async () => {
    const repoDir = createCommittedRepo();
    const server = createDaemonServer();

    const bind = parse(await server.callTool("workspace_bind", { cwd: repoDir }));
    expect(bind["ok"]).toBe(true);
    expect(bind["bindState"]).toBe("bound");
    expect(bind["worktreeRoot"]).toBe(fs.realpathSync(repoDir));
    expect(bind["repoId"]).toEqual(expect.any(String));
    expect(bind["capabilityProfile"]).toEqual(expect.objectContaining({
      boundedReads: true,
      runCapture: false,
    }));

    const safeRead = parse(await server.callTool("safe_read", { path: "app.ts" }));
    expect(safeRead["projection"]).toBe("content");
  });

  it("fails clearly when bind cwd is outside a git repo", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-bind-miss-"));
    cleanups.push(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });
    const server = createDaemonServer();

    const bind = parse(await server.callTool("workspace_bind", { cwd: tmpDir }));
    expect(bind["ok"]).toBe(false);
    expect(bind["errorCode"]).toBe("NOT_A_GIT_REPO");
    expect(bind["bindState"]).toBe("unbound");
  });

  it("rebinds across worktrees of the same repo without carrying session-local state", async () => {
    const repoDir = createCommittedRepo();
    git(repoDir, "branch secondary");
    const worktreeDir = path.join(os.tmpdir(), `graft-worktree-${String(Date.now())}`);
    git(repoDir, `worktree add ${worktreeDir} secondary`);
    cleanups.push(() => {
      fs.rmSync(worktreeDir, { recursive: true, force: true });
    });

    const server = createDaemonServer();
    const bind = parse(await server.callTool("workspace_bind", { cwd: repoDir }));
    await server.callTool("state_save", { content: "alpha" });
    const saved = parse(await server.callTool("state_load", {}));
    expect(saved["content"]).toBe("alpha");

    const rebind = parse(await server.callTool("workspace_rebind", { cwd: worktreeDir }));
    expect(rebind["ok"]).toBe(true);
    expect(rebind["repoId"]).toBe(bind["repoId"]);
    expect(rebind["worktreeId"]).not.toBe(bind["worktreeId"]);

    const loadedAfterRebind = parse(await server.callTool("state_load", {}));
    expect(loadedAfterRebind["content"]).toBeNull();
  });

  it("denies run_capture in daemon mode after bind", async () => {
    const repoDir = createCommittedRepo();
    const server = createDaemonServer();
    await server.callTool("workspace_bind", { cwd: repoDir });

    await expect(server.callTool("run_capture", { command: "printf 'ok'", tail: 1 }))
      .rejects
      .toThrow(/not enabled/);
  });
});
