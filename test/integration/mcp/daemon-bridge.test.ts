import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { startDaemonServer, type GraftDaemonServer } from "../../../src/mcp/daemon-server.js";
import { cleanupTestRepo, createTestRepo, git } from "../../helpers/git.js";
import { extractText, harnessPath } from "../../helpers/mcp.js";

describe("integration: daemon-backed MCP bridge over stdio", () => {
  let client: Client;
  let transport: StdioClientTransport;
  let daemon: GraftDaemonServer;
  let daemonRoot: string;
  let repoDir: string;

  beforeAll(async () => {
    repoDir = createTestRepo("graft-mcp-daemon-bridge-");
    fs.writeFileSync(path.join(repoDir, "app.ts"), [
      "export function greet(name: string): string {",
      "  return `hello ${name}`;",
      "}",
      "",
    ].join("\n"));
    git(repoDir, "add -A");
    git(repoDir, "commit -m init");

    daemonRoot = fs.mkdtempSync(path.join(os.tmpdir(), "graft-mcp-daemon-root-"));
    const socketPath = path.join(daemonRoot, "daemon.sock");
    daemon = await startDaemonServer({
      graftDir: daemonRoot,
      socketPath,
    });

    transport = new StdioClientTransport({
      command: harnessPath("node_modules", ".bin", "tsx"),
      args: [harnessPath("test/helpers/mcp-daemon-bridge.ts")],
      cwd: repoDir,
      env: {
        GRAFT_TEST_DAEMON_SOCKET: socketPath,
      },
    });
    client = new Client({ name: "graft-daemon-bridge-test", version: "0.0.0" });
    await client.connect(transport);
  });

  afterAll(async () => {
    await client.close();
    await daemon.close();
    fs.rmSync(daemonRoot, { recursive: true, force: true });
    cleanupTestRepo(repoDir);
  });

  it("proxies daemon-only workspace binding flow through stdio", async () => {
    const workspaceStatus = JSON.parse(extractText(await client.callTool({
      name: "workspace_status",
      arguments: {},
    }))) as { bindState: string };
    expect(workspaceStatus.bindState).toBe("unbound");

    const authorize = JSON.parse(extractText(await client.callTool({
      name: "workspace_authorize",
      arguments: { cwd: repoDir },
    }))) as { ok: boolean };
    expect(authorize.ok).toBe(true);

    const bind = JSON.parse(extractText(await client.callTool({
      name: "workspace_bind",
      arguments: { cwd: repoDir },
    }))) as { ok: boolean; bindState: string };
    expect(bind.ok).toBe(true);
    expect(bind.bindState).toBe("bound");

    const safeRead = JSON.parse(extractText(await client.callTool({
      name: "safe_read",
      arguments: { path: "app.ts" },
    }))) as { projection: string; content: string };
    expect(safeRead.projection).toBe("content");
    expect(safeRead.content).toContain("greet");
  });
});
