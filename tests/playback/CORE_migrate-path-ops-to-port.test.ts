import { afterEach, describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { createRepoPathResolver } from "../../src/adapters/repo-paths.js";
import { createRepoWorkspace } from "../../src/index.js";
import { ChildProcessDaemonWorkerPool } from "../../src/mcp/daemon-worker-pool.js";
import { createPathResolver } from "../../src/mcp/context.js";
import { Metrics } from "../../src/mcp/metrics.js";
import type { RepoObservation } from "../../src/mcp/repo-state.js";
import { DEFAULT_DAEMON_CAPABILITY_PROFILE } from "../../src/mcp/workspace-router.js";
import { GovernorTracker } from "../../src/session/tracker.js";
import { cleanupTestRepo, createCommittedTestRepo, git } from "../../test/helpers/git.js";
import { createManagedDaemonServer, createServerInRepo } from "../../test/helpers/mcp.js";

const ROOT = path.resolve(import.meta.dirname, "../..");

const cleanups: (() => Promise<void> | void)[] = [];

afterEach(async () => {
  while (cleanups.length > 0) {
    await cleanups.pop()!();
  }
});

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function createRepo(): string {
  const repoDir = createCommittedTestRepo("graft-path-ops-playback-", {
    "app.ts": "export const ok = true;\n",
  });
  cleanups.push(() => {
    cleanupTestRepo(repoDir);
  });
  return repoDir;
}

function createOutsideFile(): string {
  const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-path-ops-playback-outside-"));
  cleanups.push(() => {
    fs.rmSync(outsideDir, { recursive: true, force: true });
  });
  const outsideFile = path.join(outsideDir, "secret.ts");
  fs.writeFileSync(outsideFile, "export const secret = true;\n");
  return outsideFile;
}

function repoObservation(repoDir: string): RepoObservation {
  return {
    checkoutEpoch: 1,
    headRef: "main",
    headSha: git(repoDir, "rev-parse HEAD").trim(),
    dirty: false,
    observedAt: "2026-04-26T00:00:00.000Z",
    lastTransition: null,
    semanticTransition: null,
    workspaceOverlayId: null,
    workspaceOverlay: null,
    statusLines: [],
  };
}

async function expectWorkerRefusesOutsidePath(repoDir: string, outsideFile: string): Promise<void> {
  const pool = new ChildProcessDaemonWorkerPool({ size: 1 });
  cleanups.push(async () => {
    await pool.close();
  });

  await expect(pool.runRepoTool({
    sessionId: "session:path-ops-playback",
    workspaceSliceId: "slice:path-ops-playback",
    traceId: "trace:path-ops-playback",
    seq: 1,
    startedAtMs: Date.now(),
    tool: "safe_read",
    args: { path: outsideFile },
    projectRoot: repoDir,
    graftDir: path.join(repoDir, ".graft"),
    graftignorePatterns: [],
    repoId: "repo:path-ops-playback",
    worktreeId: "worktree:path-ops-playback",
    gitCommonDir: path.join(repoDir, ".git"),
    writerId: "graft_path_ops_playback",
    capabilityProfile: DEFAULT_DAEMON_CAPABILITY_PROFILE,
    repoState: repoObservation(repoDir),
    governorSnapshot: new GovernorTracker().snapshot(),
    metricsSnapshot: new Metrics().snapshot(),
  })).rejects.toThrow("Path traversal blocked");
}

describe("CORE_migrate-path-ops-to-port playback", () => {
  it("Can I point to one explicit repo path confinement behavior used by repo-local API, repo-local MCP, daemon-bound MCP, and daemon worker contexts?", () => {
    expect(readRepoFile("src/adapters/repo-paths.ts")).toContain("function pathEscapesRoot");
    expect(readRepoFile("src/mcp/context.ts")).toContain("return createRepoPathResolver(projectRoot)");
    expect(readRepoFile("src/api/repo-workspace.ts")).toContain("resolvePath: createRepoPathResolver(cwd)");
    expect(readRepoFile("src/mcp/workspace-router-runtime.ts")).toContain(
      "resolvePath: createRepoPathResolver(input.resolved.worktreeRoot)",
    );
    expect(readRepoFile("src/mcp/repo-tool-worker-context.ts")).toContain(
      "resolvePath: createRepoPathResolver(job.projectRoot)",
    );
  });

  it("In temp repos only, does `safe_read` refuse or fail clearly for an absolute path outside the repo root on every runtime surface?", async () => {
    const repoDir = createRepo();
    const outsideFile = createOutsideFile();

    const workspace = await createRepoWorkspace({ cwd: repoDir });
    await expect(workspace.safeRead({ path: outsideFile })).rejects.toThrow("Path traversal blocked");

    const repoLocalServer = createServerInRepo(repoDir);
    await expect(repoLocalServer.callTool("safe_read", { path: outsideFile })).rejects.toThrow(
      "Path traversal blocked",
    );

    const daemonServer = createManagedDaemonServer(cleanups);
    await daemonServer.callTool("workspace_authorize", { cwd: repoDir });
    await daemonServer.callTool("workspace_bind", { cwd: repoDir });
    await expect(daemonServer.callTool("safe_read", { path: outsideFile })).rejects.toThrow(
      "Path traversal blocked",
    );

    await expectWorkerRefusesOutsidePath(repoDir, outsideFile);
  });

  it("Does the scope document explain which `node:path` imports remain allowed adapter/boundary/test usage?", () => {
    const design = readRepoFile("docs/releases/v0.7.0/design/CORE_migrate-path-ops-to-port.md");

    expect(design).toContain("Explicit allowlist for `node:path`");
    expect(design).toContain("Node adapters and path adapters");
    expect(design).toContain("Runtime composition roots and daemon filesystem layout");
    expect(design).toContain("CLI config/file-writing boundaries");
    expect(design).toContain("Git hook bootstrap boundaries");
    expect(design).toContain("Tests, playback tests, and helpers");
  });

  it("Does `createRepoPathResolver` reject absolute paths outside the repo root instead of returning them as-is?", () => {
    const repoDir = createRepo();
    const outsideFile = createOutsideFile();
    const resolve = createRepoPathResolver(repoDir);

    expect(() => resolve(outsideFile)).toThrow("Path traversal blocked");
    expect(() => resolve("/etc/passwd")).toThrow("Path traversal blocked");
  });

  it("Do `createPathResolver` and `createRepoPathResolver` share the same logical and symlink escape expectations?", () => {
    const repoDir = createRepo();
    const outsideFile = createOutsideFile();
    const outsideDir = path.dirname(outsideFile);
    fs.symlinkSync(outsideDir, path.join(repoDir, "escape-dir"));
    fs.symlinkSync(outsideFile, path.join(repoDir, "linked-secret.ts"));

    for (const createResolver of [createPathResolver, createRepoPathResolver]) {
      const resolve = createResolver(repoDir);
      expect(resolve("app.ts")).toBe(path.join(repoDir, "app.ts"));
      expect(resolve(path.join(repoDir, "app.ts"))).toBe(path.join(repoDir, "app.ts"));
      expect(() => resolve("../outside.ts")).toThrow("Path traversal blocked");
      expect(() => resolve(outsideFile)).toThrow("Path traversal blocked");
      expect(() => resolve("escape-dir/secret.ts")).toThrow("Path traversal blocked");
      expect(() => resolve("linked-secret.ts")).toThrow("Path traversal blocked");
      expect(resolve("new-file.ts")).toBe(path.join(repoDir, "new-file.ts"));
    }
  });

  it("Do regression tests cover repo-local server, repo-local API, daemon-bound session, and daemon worker/offloaded read contexts using temp repos?", () => {
    const runtimeTest = readRepoFile("test/unit/mcp/path-boundary-runtime.test.ts");
    const workerTest = readRepoFile("test/unit/mcp/daemon-worker-pool.test.ts");

    expect(runtimeTest).toContain("repo-local API safeRead refuses absolute paths outside the repo");
    expect(runtimeTest).toContain("repo-local MCP safe_read refuses absolute paths outside the repo");
    expect(runtimeTest).toContain("daemon-bound MCP safe_read refuses absolute paths outside the bound repo");
    expect(runtimeTest).toContain("createCommittedTestRepo");
    expect(workerTest).toContain("refuses absolute paths outside the repo in the offloaded read worker context");
  });

  it("Does a static allowlist prevent future high-risk direct path usage without demanding zero `node:path` imports everywhere?", () => {
    const allowlistTest = readRepoFile("test/unit/release/path-ops-boundary-allowlist.test.ts");
    const allowlistBlock = allowlistTest.slice(
      allowlistTest.indexOf("const ALLOWED_NODE_PATH_IMPORTS"),
      allowlistTest.indexOf("]);"),
    );

    expect(allowlistTest).toContain("ALLOWED_NODE_PATH_IMPORTS");
    expect(allowlistTest).toContain("keeps production node:path imports limited");
    expect(allowlistTest).toContain("src/adapters/repo-paths.ts");
    expect(allowlistTest).toContain("src/cli/command-parser.ts");
    expect(allowlistBlock).not.toContain('"src/mcp/context.ts"');
  });
});
