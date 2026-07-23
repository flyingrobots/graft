import { describe, expect, it, beforeAll, afterAll } from "vitest";
import * as http from "node:http";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { startRestServer } from "../../../src/mcp/rest-server.js";
import { createFixtureWorkspace, createIsolatedServer } from "../../helpers/mcp.js";
import { ensureGitRepo } from "../../helpers/git.js";

describe("MCP REST bridge", () => {
  let server: http.Server;
  let port: number;

  let cleanupWorkspace: () => void;
  let cleanupServer: () => void;
  let sessionsPath: string;

  beforeAll(async () => {
    const workspace = createFixtureWorkspace();
    cleanupWorkspace = workspace.cleanup;

    // Use a temp dir for sessions
    sessionsPath = fs.mkdtempSync(path.join(os.tmpdir(), "graft-rest-sessions-"));

    const isolated = createIsolatedServer({
      projectRoot: workspace.projectRoot,
    });
    cleanupServer = isolated.cleanup;
    const graftServer = isolated.server;

    server = await startRestServer({
      port: 0, // OS assigns random port
      graftServer,
      baseRepoPath: workspace.projectRoot,
      sessionsPath,
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
        fs.rmSync(sessionsPath, { recursive: true, force: true });
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

  it("can execute a simple tool like capabilities globally", async () => {
    const response = await fetch(`http://127.0.0.1:${port}/tools/capabilities`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.content).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);
  });

  it("can create a new session and run tools in its isolated workspace", async () => {
    // Create session
    const createRes = await fetch(`http://127.0.0.1:${port}/sessions`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    expect(createRes.status).toBe(200);
    const createBody = await createRes.json();
    
    const sessionId = createBody.sessionId;
    expect(sessionId).toBeDefined();

    // Verify git worktree created
    expect(fs.existsSync(path.join(sessionsPath, sessionId, ".git"))).toBe(true);

    // List tools in session
    const listRes = await fetch(`http://127.0.0.1:${port}/sessions/${sessionId}/tools`);
    expect(listRes.status).toBe(200);
    const listBody = await listRes.json();
    expect(listBody.tools).toBeDefined();

    // Run capabilities in session
    const capRes = await fetch(`http://127.0.0.1:${port}/sessions/${sessionId}/tools/capabilities`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    expect(capRes.status).toBe(200);
    const capBody = await capRes.json();
    expect(capBody.content).toBeDefined();
  });

  it("returns 404 when querying an unknown session", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/sessions/bogus-id/tools`);
    expect(res.status).toBe(404);
  });

  it("can create a new session by cloning an arbitrary repository", async () => {
    // We will use a new fixture workspace as the "remote" repository to clone.
    const remoteWorkspace = createFixtureWorkspace();
    ensureGitRepo(remoteWorkspace.projectRoot);
    
    const createRes = await fetch(`http://127.0.0.1:${port}/sessions`, {
      method: "POST",
      body: JSON.stringify({ repositoryUrl: remoteWorkspace.projectRoot }),
    });
    
    if (createRes.status !== 200) {
      console.log("Error body:", await createRes.text());
    }
    expect(createRes.status).toBe(200);
    const createBody = await createRes.json();
    const sessionId = createBody.sessionId;
    expect(sessionId).toBeDefined();

    // Verify it was actually cloned
    expect(fs.existsSync(path.join(sessionsPath, sessionId, ".git"))).toBe(true);

    remoteWorkspace.cleanup();
  });
});
