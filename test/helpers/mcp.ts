import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { createGraftServer } from "../../src/mcp/server.js";
import type { CreateGraftServerOptions, GraftServer } from "../../src/mcp/server.js";
import type { RunCaptureConfig } from "../../src/mcp/run-capture-config.js";
import type { RuntimeObservabilityState } from "../../src/mcp/runtime-observability.js";
import type { WorkspaceSessionMode } from "../../src/mcp/workspace-router.js";
export { createFixtureWorkspace, fixturePath, harnessPath } from "./fixtures.js";

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
  mode?: WorkspaceSessionMode;
  projectRoot?: string;
  graftDir?: string;
  runCapture?: Partial<RunCaptureConfig>;
  runtimeObservability?: Partial<RuntimeObservabilityState>;
}

type CreateServerInRepoOptions = Omit<CreateGraftServerOptions, "projectRoot" | "graftDir">;

export function createServerInRepo(
  repoDir: string,
  options: CreateServerInRepoOptions = {},
): GraftServer {
  return createGraftServer({
    projectRoot: repoDir,
    graftDir: path.join(repoDir, ".graft"),
    ...options,
  });
}

export function createIsolatedServer(options: CreateIsolatedServerOptions = {}): IsolatedServer {
  const mode = options.mode ?? "repo_local";
  const ownsProjectRoot = options.projectRoot === undefined;
  const projectRoot = options.projectRoot ?? fs.mkdtempSync(path.join(os.tmpdir(), "graft-mcp-project-"));
  const ownsGraftDir = options.graftDir === undefined;
  const graftDir = options.graftDir
    ?? (
      mode === "repo_local" && ownsProjectRoot
        ? path.join(projectRoot, ".graft")
        : fs.mkdtempSync(path.join(os.tmpdir(), "graft-mcp-state-"))
    );

  return {
    server: createGraftServer({
      mode,
      ...(mode === "repo_local" ? { projectRoot } : {}),
      graftDir,
      ...(options.runCapture !== undefined ? { runCapture: options.runCapture } : {}),
      ...(options.runtimeObservability !== undefined ? { runtimeObservability: options.runtimeObservability } : {}),
    }),
    projectRoot,
    graftDir,
    cleanup(): void {
      if (ownsProjectRoot) {
        fs.rmSync(projectRoot, { recursive: true, force: true });
        return;
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
