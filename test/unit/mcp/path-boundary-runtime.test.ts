import { afterEach, describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { createRepoWorkspace } from "../../../src/index.js";
import { createManagedDaemonServer, createServerInRepo } from "../../helpers/mcp.js";
import { cleanupTestRepo, createCommittedTestRepo } from "../../helpers/git.js";

const cleanups: (() => void | Promise<void>)[] = [];

afterEach(async () => {
  while (cleanups.length > 0) {
    await cleanups.pop()!();
  }
});

function createRepo(): string {
  const repoDir = createCommittedTestRepo("graft-path-boundary-", {
    "app.ts": "export const ok = true;\n",
  });
  cleanups.push(() => {
    cleanupTestRepo(repoDir);
  });
  return repoDir;
}

function createOutsideFile(): string {
  const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-path-boundary-outside-"));
  cleanups.push(() => {
    fs.rmSync(outsideDir, { recursive: true, force: true });
  });
  const outsideFile = path.join(outsideDir, "secret.ts");
  fs.writeFileSync(outsideFile, "export const secret = true;\n");
  return outsideFile;
}

describe("runtime repo path boundary", () => {
  it("repo-local API safeRead refuses absolute paths outside the repo", async () => {
    const repoDir = createRepo();
    const outsideFile = createOutsideFile();
    const workspace = await createRepoWorkspace({ cwd: repoDir });

    await expect(workspace.safeRead({ path: outsideFile })).rejects.toThrow("Path traversal blocked");
  });

  it("repo-local MCP safe_read refuses absolute paths outside the repo", async () => {
    const repoDir = createRepo();
    const outsideFile = createOutsideFile();
    const server = createServerInRepo(repoDir);

    await expect(server.callTool("safe_read", { path: outsideFile })).rejects.toThrow("Path traversal blocked");
  });

  it("daemon-bound MCP safe_read refuses absolute paths outside the bound repo", async () => {
    const repoDir = createRepo();
    const outsideFile = createOutsideFile();
    const server = createManagedDaemonServer(cleanups);

    await server.callTool("workspace_authorize", { cwd: repoDir });
    await server.callTool("workspace_bind", { cwd: repoDir });

    await expect(server.callTool("safe_read", { path: outsideFile })).rejects.toThrow("Path traversal blocked");
  });
});
