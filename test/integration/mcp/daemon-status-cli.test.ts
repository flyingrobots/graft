import { afterEach, describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { runCli } from "../../../src/cli/main.js";
import { startDaemonServer, type GraftDaemonServer } from "../../../src/mcp/daemon-server.js";
import { cleanupTestRepo, createTestRepo, git } from "../../helpers/git.js";
import { createBufferWriter } from "../../helpers/init.js";

describe("cli: daemon status integration", () => {
  const repos: string[] = [];
  const roots: string[] = [];
  const daemons: GraftDaemonServer[] = [];

  afterEach(async () => {
    while (daemons.length > 0) {
      await daemons.pop()!.close();
    }
    while (roots.length > 0) {
      fs.rmSync(roots.pop()!, { recursive: true, force: true });
    }
    while (repos.length > 0) {
      cleanupTestRepo(repos.pop()!);
    }
  });

  it("lets an operator run graft daemon status --socket and see daemon health sessions workspace posture monitors scheduler pressure and worker pressure without raw JSON", async () => {
    const repoDir = createTestRepo("graft-cli-daemon-status-");
    repos.push(repoDir);
    fs.writeFileSync(path.join(repoDir, "app.ts"), "export const ready = true;\n");
    git(repoDir, "add -A");
    git(repoDir, "commit -m init");

    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-daemon-status-root-"));
    roots.push(rootDir);
    const socketPath = path.join(rootDir, "daemon.sock");
    const daemon = await startDaemonServer({
      graftDir: rootDir,
      socketPath,
      workerPoolSize: 1,
      persistedLocalHistoryGraph: false,
    });
    daemons.push(daemon);

    const stdout = createBufferWriter();
    const stderr = createBufferWriter();
    await runCli({
      cwd: repoDir,
      args: ["daemon", "status", "--socket", socketPath],
      stdout,
      stderr,
    });

    expect(stderr.text()).toBe("");
    expect(stdout.text()).toContain("Daemon Status");
    expect(stdout.text()).toContain(`socket: ${socketPath}`);
    expect(stdout.text()).toContain("sessions");
    expect(stdout.text()).toContain("workspaces");
    expect(stdout.text()).toContain("monitors");
    expect(stdout.text()).toContain("scheduler");
    expect(stdout.text()).toContain("workers");
    expect(stdout.text()).not.toContain("authorize workspace");
    expect(stdout.text()).not.toContain("pause monitor");
    expect(stdout.text()).not.toContain("resume monitor");
  });
});
