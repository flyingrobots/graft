import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { createGraftServer } from "../../src/mcp/server.js";
import type { GraftServer } from "../../src/mcp/server.js";
import type { RunCaptureConfig } from "../../src/mcp/run-capture-config.js";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export function extractText(result: unknown): string {
  const r = result as { content?: { type: string; text: string }[] };
  const textBlock = r.content?.find((c) => c.type === "text");
  if (!textBlock) throw new Error("No text content in MCP result");
  return textBlock.text;
}

export function parse(result: unknown): Record<string, unknown> {
  return JSON.parse(extractText(result)) as Record<string, unknown>;
}

export function getTestRepoRoot(): string {
  return REPO_ROOT;
}

export function fixturePath(relativePath: string): string {
  return path.join(REPO_ROOT, "test", "fixtures", relativePath);
}

export interface IsolatedServer {
  cleanup(): void;
  graftDir: string;
  projectRoot: string;
  server: GraftServer;
}

export interface CreateIsolatedServerOptions {
  projectRoot?: string;
  graftDir?: string;
  runCapture?: Partial<RunCaptureConfig>;
}

export function createIsolatedServer(options: CreateIsolatedServerOptions = {}): IsolatedServer {
  const ownsProjectRoot = options.projectRoot === undefined;
  const projectRoot = options.projectRoot ?? fs.mkdtempSync(path.join(os.tmpdir(), "graft-mcp-project-"));
  const ownsGraftDir = options.graftDir === undefined;
  const graftDir = options.graftDir
    ?? (ownsProjectRoot ? path.join(projectRoot, ".graft") : fs.mkdtempSync(path.join(os.tmpdir(), "graft-mcp-state-")));

  return {
    server: createGraftServer({
      projectRoot,
      graftDir,
      ...(options.runCapture !== undefined ? { runCapture: options.runCapture } : {}),
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
