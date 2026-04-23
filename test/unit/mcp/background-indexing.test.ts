import { afterEach, describe, expect, it } from "vitest";
import * as fs from "node:fs";
import { createManagedDaemonServer, parse } from "../../helpers/mcp.js";
import { cleanupTestRepo, createCommittedTestRepo, git } from "../../helpers/git.js";

const cleanups: (() => void)[] = [];

afterEach(() => {
  while (cleanups.length > 0) {
    cleanups.pop()!();
  }
});

function committedRepo(): string {
  const dir = createCommittedTestRepo("graft-bg-index-");
  cleanups.push(() => { cleanupTestRepo(dir); });
  return dir;
}

describe("background indexing", { timeout: 30_000 }, () => {
  it("monitor nudge triggers an immediate tick that indexes", async () => {
    const repoDir = committedRepo();
    const server = createManagedDaemonServer(cleanups);

    await server.callTool("workspace_authorize", { cwd: repoDir });
    await server.callTool("workspace_bind", { cwd: repoDir });

    // Start a monitor
    const start = parse(await server.callTool("monitor_start", {
      cwd: repoDir,
      pollIntervalMs: 60_000, // long interval — won't auto-tick
    }));
    expect(start["ok"]).toBe(true);

    // Add a new commit
    fs.writeFileSync(`${repoDir}/new.ts`, "export function fresh(): void {}\n");
    git(repoDir, "add -A");
    git(repoDir, "commit -m 'add fresh'");

    // Nudge to trigger immediate re-index
    const nudge = parse(await server.callTool("monitor_nudge", { cwd: repoDir }));
    expect(nudge["ok"]).toBe(true);

    // Wait a beat for the background tick to complete
    await new Promise((resolve) => { setTimeout(resolve, 2000); });

    // Check status — should show new HEAD as last indexed
    const status = parse(await server.callTool("daemon_monitors", {}));
    const monitors = status["monitors"] as Array<Record<string, unknown>>;
    const monitor = monitors[0];
    expect(monitor).toBeDefined();
    expect(monitor!["lastRunCommitsIndexed"]).toBeGreaterThan(0);
  });

  it("tool calls are not blocked during active indexing", async () => {
    const repoDir = committedRepo();
    const server = createManagedDaemonServer(cleanups);

    await server.callTool("workspace_authorize", { cwd: repoDir });
    await server.callTool("workspace_bind", { cwd: repoDir });

    // Start monitor with immediate tick (short interval)
    await server.callTool("monitor_start", {
      cwd: repoDir,
      pollIntervalMs: 100,
    });

    // Immediately call a tool — should NOT hang even if indexing is active
    const startTime = Date.now();
    const result = parse(await server.callTool("safe_read", { path: "app.ts" }));
    const elapsed = Date.now() - startTime;

    // Tool should return within a reasonable time (not blocked by indexing)
    expect(elapsed).toBeLessThan(10_000);
    expect(result).toBeDefined();
  });
});
