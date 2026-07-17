import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { ALL_TOOL_REGISTRY } from "../../../src/mcp/server.js";
import { MCP_OUTPUT_SCHEMAS } from "../../../src/contracts/output-schemas.js";
import { parseJsonObject } from "../../../src/contracts/json-object.js";
import { startDaemonServer, type GraftDaemonServer } from "../../../src/mcp/daemon-server.js";
import { cleanupTestRepo, createTestRepo, git } from "../../helpers/git.js";
import { extractText, harnessPath } from "../../helpers/mcp.js";

type SdkToolResult = Awaited<ReturnType<Client["callTool"]>>;
type SdkToolList = Awaited<ReturnType<Client["listTools"]>>["tools"];

function structuredSafeRead(result: SdkToolResult): Record<string, unknown> {
  expect(result.isError).not.toBe(true);
  const textPayload = JSON.parse(extractText(result)) as unknown;
  expect(result.structuredContent).toBeDefined();
  const structured = parseJsonObject(result.structuredContent, "daemon safe_read structured content");
  expect(structured).toEqual(textPayload);
  expect(() => MCP_OUTPUT_SCHEMAS.safe_read.parse(structured)).not.toThrow();
  return structured;
}

describe("integration: daemon-backed MCP bridge over stdio", () => {
  let client: Client;
  let transport: StdioClientTransport;
  let listedTools: SdkToolList;
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
      workerPoolSize: 1,
      persistedLocalHistoryGraph: false,
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
    // Output validators are cached by the SDK only after tools/list.
    listedTools = (await client.listTools()).tools;
  });

  afterAll(async () => {
    await client.close();
    await daemon.close();
    fs.rmSync(daemonRoot, { recursive: true, force: true });
    cleanupTestRepo(repoDir);
  });

  it("advertises bounded root-object output schemas for every daemon tool", () => {
    const names = listedTools.map((tool) => tool.name);
    expect(new Set(names)).toEqual(new Set(ALL_TOOL_REGISTRY.map((tool) => tool.name)));
    expect(names).toHaveLength(ALL_TOOL_REGISTRY.length);

    const schemas = listedTools.map((tool) => {
      expect(tool.outputSchema).toEqual(expect.objectContaining({ type: "object" }));
      if (tool.outputSchema === undefined) {
        throw new Error(`daemon tool ${tool.name} did not advertise outputSchema`);
      }
      expect(Buffer.byteLength(JSON.stringify(tool.outputSchema), "utf8")).toBeLessThanOrEqual(8_192);
      return tool.outputSchema;
    });
    expect(Buffer.byteLength(JSON.stringify(schemas), "utf8")).toBeLessThanOrEqual(65_536);
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

    const safeRead = structuredSafeRead(await client.callTool({
      name: "safe_read",
      arguments: { path: "app.ts" },
    }));
    expect(safeRead["projection"]).toBe("content");
    expect(safeRead["content"]).toContain("greet");
  });
});
