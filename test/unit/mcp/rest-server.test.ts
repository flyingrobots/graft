import { describe, expect, it, beforeAll, afterAll } from "vitest";
import * as http from "node:http";
import { startRestServer } from "../../../src/mcp/rest-server.js";
import { createFixtureWorkspace, createIsolatedServer } from "../../helpers/mcp.js";

describe("MCP REST bridge", () => {
  let server: http.Server;
  let port: number;

  let cleanupWorkspace: () => void;
  let cleanupServer: () => void;

  beforeAll(async () => {
    const workspace = createFixtureWorkspace();
    cleanupWorkspace = workspace.cleanup;

    const isolated = createIsolatedServer({
      projectRoot: workspace.projectRoot,
    });
    cleanupServer = isolated.cleanup;
    const graftServer = isolated.server;

    server = await startRestServer({
      port: 0, // OS assigns random port
      graftServer,
      mode: "repo_local",
    });

    const address = server.address();
    if (address && typeof address === "object") {
      port = address.port;
    } else {
      throw new Error("Could not determine server port");
    }
  });

  afterAll(() => {
    return new Promise((resolve) => {
      const finish = () => {
        cleanupServer();
        cleanupWorkspace();
        resolve(undefined);
      };
      if (server) {
        server.close(finish);
      } else {
        finish();
      }
    });
  });

  it("returns registered tools on GET /tools", async () => {
    const response = await fetch(`http://127.0.0.1:${port}/tools`);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.tools).toBeDefined();
    expect(Array.isArray(body.tools)).toBe(true);
    
    // capabilities tool should be registered
    const capTool = body.tools.find((t: any) => t.name === "capabilities");
    expect(capTool).toBeDefined();
    expect(capTool.description).toBeDefined();
  });

  it("returns 404 for unknown tools", async () => {
    const response = await fetch(`http://127.0.0.1:${port}/tools/unknown_tool_that_does_not_exist`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    expect(response.status).toBe(404);
  });

  it("can execute a simple tool like capabilities", async () => {
    const response = await fetch(`http://127.0.0.1:${port}/tools/capabilities`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.content).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);
  });

  it("returns 400 for bad JSON body", async () => {
    const response = await fetch(`http://127.0.0.1:${port}/tools/capabilities`, {
      method: "POST",
      body: "not-a-json-string",
    });
    expect(response.status).toBe(400);
  });
});
