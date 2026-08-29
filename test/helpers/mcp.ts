import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { nodePathOps } from "../../src/adapters/node-paths.js";
import { createGraftServer } from "../../src/mcp/server.js";
import type { CreateGraftServerOptions, GraftServer } from "../../src/mcp/server.js";
import type { RunCaptureConfig } from "../../src/mcp/run-capture-config.js";
import type { RuntimeObservabilityState } from "../../src/mcp/runtime-observability.js";
import { resolveWorkspaceRequest } from "../../src/mcp/workspace-router-resolution.js";
import type { WorkspaceMode } from "../../src/mcp/workspace-router.js";
import { InMemoryWarpPool } from "../../src/mcp/warp-pool.js";
import type { GitClient } from "../../src/ports/git.js";
import type { ProcessRunner } from "../../src/ports/process-runner.js";
import { indexHead } from "../../src/warp/index-head.js";
import { buildSessionWarpWriterId } from "../../src/warp/writer-id.js";
import { ensureGitRepo, testGitClient, testGraphRootForRepo } from "./git.js";
import { harnessPath } from "./fixtures.js";
export { createFixtureWorkspace, fixturePath, harnessPath } from "./fixtures.js";

/** Returns the repository root for use as a projectRoot in tests. */
export function getTestRepoRoot(): string {
  return harnessPath();
}


export function extractText(result: unknown): string {
  const r = result as { content?: { type: string; text: string }[] };
  const textBlock = r.content?.find((c) => c.type === "text");
  if (!textBlock) throw new Error("No text content in MCP result");
  return textBlock.text;
}

export function parse(result: unknown): Record<string, unknown> {
  return JSON.parse(extractText(result)) as Record<string, unknown>;
}

export interface IsolatedServer {
  cleanup(): void;
  graftDir: string;
  projectRoot: string;
  server: GraftServer;
}

export type TestCleanup = () => void | Promise<void>;

export interface CreateIsolatedServerOptions {
  mode?: WorkspaceMode;
  projectRoot?: string;
  graftDir?: string;
  runCapture?: Partial<RunCaptureConfig>;
  runtimeObservability?: Partial<RuntimeObservabilityState>;
  persistedLocalHistoryGraph?: boolean;
  git?: GitClient;
  processRunner?: ProcessRunner;
}

type CreateServerInRepoOptions = Omit<CreateGraftServerOptions, "projectRoot" | "graftDir">;

export function createServerInRepo(
  repoDir: string,
  options: CreateServerInRepoOptions = {},
): GraftServer {
  return createGraftServer({
    projectRoot: repoDir,
    graftDir: path.join(repoDir, ".graft"),
    graphRoot: testGraphRootForRepo(repoDir),
    git: testGitClient,
    persistedLocalHistoryGraph: false,
    ...options,
  });
}

export interface IndexableServerInRepo {
  readonly server: GraftServer;
  indexCurrentHead(): Promise<void>;
}

/**
 * Builds a repo-local server and an indexer that writes into that exact
 * server session's sidecar lane. Tests using this helper cannot accidentally
 * seed the source repository or a different actor's graph.
 */
export function createIndexableServerInRepo(
  repoDir: string,
  options: CreateServerInRepoOptions = {},
): IndexableServerInRepo {
  const sessionId = options.sessionId ?? crypto.randomUUID();
  const graphRoot = options.graphRoot ?? testGraphRootForRepo(repoDir);
  const warpPool = options.warpPool ?? new InMemoryWarpPool({ graphRoot });
  const gitClient = options.git ?? testGitClient;
  const server = createServerInRepo(repoDir, {
    ...options,
    sessionId,
    graphRoot,
    git: gitClient,
    warpPool,
  });

  return {
    server,
    async indexCurrentHead(): Promise<void> {
      const workspace = await resolveWorkspaceRequest(gitClient, { cwd: repoDir });
      if ("code" in workspace) {
        throw new Error(workspace.message);
      }
      const app = await warpPool.getOrOpen(workspace, buildSessionWarpWriterId(sessionId));
      await indexHead({
        cwd: workspace.worktreeRoot,
        git: gitClient,
        pathOps: nodePathOps,
        ctx: { app, strandId: null },
      });
    },
  };
}

export function createIsolatedServer(options: CreateIsolatedServerOptions = {}): IsolatedServer {
  const mode = options.mode ?? "repo_local";
  const ownsProjectRoot = options.projectRoot === undefined;
  const projectRoot = options.projectRoot ?? fs.mkdtempSync(path.join(os.tmpdir(), "graft-mcp-project-"));
  if (mode === "repo_local") {
    ensureGitRepo(projectRoot);
  }
  const ownsGraftDir = options.graftDir === undefined;
  const graftDir = options.graftDir
    ?? (
      mode === "repo_local" && ownsProjectRoot
        ? path.join(projectRoot, ".graft")
        : fs.mkdtempSync(path.join(os.tmpdir(), "graft-mcp-state-"))
    );
  const graphRoot = fs.mkdtempSync(path.join(os.tmpdir(), "graft-mcp-graphs-"));

  return {
    server: createGraftServer({
      mode,
      git: options.git ?? testGitClient,
      ...(mode === "repo_local" ? { projectRoot } : {}),
      graftDir,
      graphRoot,
      ...(options.runCapture !== undefined ? { runCapture: options.runCapture } : {}),
      ...(options.runtimeObservability !== undefined ? { runtimeObservability: options.runtimeObservability } : {}),
      ...(options.processRunner !== undefined ? { processRunner: options.processRunner } : {}),
      persistedLocalHistoryGraph: options.persistedLocalHistoryGraph ?? true,
    }),
    projectRoot,
    graftDir,
    cleanup(): void {
      fs.rmSync(graphRoot, { recursive: true, force: true });
      if (ownsProjectRoot) {
        fs.rmSync(projectRoot, { recursive: true, force: true });
      }
      if (ownsGraftDir) {
        fs.rmSync(graftDir, { recursive: true, force: true });
      }
    },
  };
}

export function createManagedDaemonServer(cleanups: TestCleanup[]): GraftServer {
  const isolated = createIsolatedServer({ mode: "daemon" });
  cleanups.push(() => {
    isolated.cleanup();
  });
  return isolated.server;
}
