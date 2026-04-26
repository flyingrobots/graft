import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

const ALLOWED_NODE_PATH_IMPORTS = new Set([
  "src/adapters/node-paths.ts",
  "src/adapters/repo-paths.ts",
  "src/adapters/rotating-ndjson-log.ts",
  "src/api/repo-local-graft.ts",
  "src/api/repo-workspace.ts",
  "src/cli/command-parser.ts",
  "src/cli/daemon-status-model.ts",
  "src/cli/init-bootstrap.ts",
  "src/cli/init-client-config.ts",
  "src/cli/init-target-hooks.ts",
  "src/cli/init.ts",
  "src/cli/json-document.ts",
  "src/cli/migrate-local-history.ts",
  "src/cli/peer-command.ts",
  "src/git/target-git-hook-bootstrap.ts",
  "src/hooks/read-governor.ts",
  "src/hooks/shared.ts",
  "src/mcp/control-plane/authz-storage.ts",
  "src/mcp/daemon-bootstrap.ts",
  "src/mcp/daemon-server.ts",
  "src/mcp/daemon-session-host.ts",
  "src/mcp/daemon-stdio-bridge.ts",
  "src/mcp/monitor-persistence.ts",
  "src/mcp/persisted-local-history.ts",
  "src/mcp/persistent-monitor-runtime.ts",
  "src/mcp/runtime-observability.ts",
  "src/mcp/runtime-workspace-overlay.ts",
  "src/mcp/server.ts",
  "src/mcp/stdio-server.ts",
  "src/mcp/tools/code-refs.ts",
  "src/mcp/tools/map-collector.ts",
  "src/mcp/tools/map.ts",
  "src/mcp/tools/precision-paths.ts",
  "src/mcp/tools/run-capture.ts",
  "src/mcp/tools/state.ts",
  "src/mcp/workspace-read-observation.ts",
  "src/mcp/workspace-router-resolution.ts",
  "src/mcp/workspace-router-runtime.ts",
  "src/mcp/workspace-router.ts",
]);

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return sourceFiles(fullPath);
    }
    return entry.isFile() && entry.name.endsWith(".ts") ? [fullPath] : [];
  });
}

function importsNodePath(source: string): boolean {
  return /from ["']node:path["']/u.test(source);
}

describe("PathOps boundary allowlist", () => {
  it("keeps production node:path imports limited to explicit adapter and composition boundaries", () => {
    const importingFiles = sourceFiles(path.join(ROOT, "src"))
      .filter((file) => importsNodePath(fs.readFileSync(file, "utf8")))
      .map((file) => path.relative(ROOT, file).split(path.sep).join("/"))
      .sort();

    const unexpected = importingFiles.filter((file) => !ALLOWED_NODE_PATH_IMPORTS.has(file));
    expect(unexpected).toEqual([]);
  });

  it("keeps MCP context path resolution delegated to the shared repo confinement resolver", () => {
    const contextSource = readRepoFile("src/mcp/context.ts");

    expect(contextSource).not.toContain("node:path");
    expect(contextSource).toContain("createRepoPathResolver");
  });
});
