import * as http from "node:http";
import * as crypto from "node:crypto";
import * as path from "node:path";
import * as fs from "node:fs";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { createGraftServer, type GraftServer } from "./server.js";
import { ALL_TOOL_REGISTRY, TOOL_REGISTRY } from "./tool-registry.js";
import { zodToJsonSchema } from "zod-to-json-schema";
import { z } from "zod";
import type { JsonObject } from "../contracts/json-object.js";

const execAsync = promisify(exec);

export interface StartRestServerOptions {
  readonly port: number;
  readonly graftServer?: GraftServer; // For global calls (backward compatibility)
  readonly baseRepoPath?: string; // The base git repository to branch from
  readonly sessionsPath?: string; // Where session worktrees should be placed
  readonly mode?: "repo_local" | "daemon";
}

export function startRestServer(options: StartRestServerOptions): Promise<http.Server> {
  const { port, graftServer, baseRepoPath, sessionsPath, mode = "repo_local" } = options;
  let activeRegistry = mode === "daemon" ? ALL_TOOL_REGISTRY : TOOL_REGISTRY;

  // Hard containment: prevent arbitrary command execution over the web REST bridge.
  // In repo_local web sessions, we do not allow these tools.
  if (mode === "repo_local") {
    const bannedTools = ["run_capture", "graft_edit", "state_save", "state_load", "workspace_open"];
    activeRegistry = activeRegistry.filter(t => !bannedTools.includes(t.name));
  }

  const sessions = new Map<string, GraftServer>();

  const server = http.createServer((req, res) => {
    // Enable CORS for testing
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = req.url ?? "";

    // Helper for sending JSON
    const sendJson = (status: number, payload: any) => {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(payload, null, 2));
    };

    // Helper for reading JSON body
    const readBody = async (): Promise<JsonObject> => {
      return new Promise((resolve, reject) => {
        let body = "";
        req.on("data", (chunk) => { body += chunk; });
        req.on("end", () => {
          try {
            if (body.trim().length === 0) {
              resolve({});
            } else {
              resolve(JSON.parse(body) as JsonObject);
            }
          } catch (e) {
            reject(new Error("Invalid JSON body"));
          }
        });
        req.on("error", reject);
      });
    };

    // Global: GET /tools
    if (req.method === "GET" && url === "/tools") {
      const tools = activeRegistry.map((def) => ({
        name: def.name,
        description: def.description,
        inputSchema: def.schema ? zodToJsonSchema(z.object(def.schema) as any) : { type: "object", additionalProperties: false },
      }));
      return sendJson(200, { tools });
    }

    // Global: POST /tools/:name
    if (req.method === "POST" && url.startsWith("/tools/") && graftServer) {
      const toolName = url.slice("/tools/".length);
      if (!graftServer.getRegisteredTools().includes(toolName)) {
        return sendJson(404, { error: `Unknown tool: ${toolName}` });
      }

      return readBody().then(async (args) => {
        try {
          const result = await graftServer.callTool(toolName, args);
          sendJson(200, result);
        } catch (e) {
          sendJson(500, { error: e instanceof Error ? e.message : String(e) });
        }
      }).catch((e) => sendJson(400, { error: e.message }));
    }

    // Sessions: POST /sessions
    if (req.method === "POST" && url === "/sessions") {
      if (!sessionsPath) {
        return sendJson(500, { error: "Server not configured for sessions (missing sessionsPath)" });
      }

      return readBody().then(async (body) => {
        try {
          const sessionId = crypto.randomUUID();
          const sessionDir = path.join(sessionsPath, sessionId);

          if (!fs.existsSync(sessionsPath)) {
            fs.mkdirSync(sessionsPath, { recursive: true });
          }

          const repositoryUrl = typeof body["repositoryUrl"] === "string" ? body["repositoryUrl"] : null;

          if (repositoryUrl) {
            // Clone the arbitrary remote repo
            await execAsync(`git clone ${repositoryUrl} ${sessionDir}`);
          } else {
            // Create a new worktree branched from the base state
            if (!baseRepoPath) {
              return sendJson(500, { error: "Server not configured for local sessions (missing baseRepoPath)" });
            }
            await execAsync(`git worktree add -b session-${sessionId} ${sessionDir}`, { cwd: baseRepoPath });
          }

          // Initialize a dedicated GraftServer for this worktree
          const sessionServer = createGraftServer({
            mode: "repo_local",
            projectRoot: sessionDir,
          });

          sessions.set(sessionId, sessionServer);
          // Omit sessionDir from response for security (don't leak host filesystem structure)
          sendJson(200, { sessionId });
        } catch (e) {
          sendJson(500, { error: `Failed to create session: ${e instanceof Error ? e.message : String(e)}` });
        }
      }).catch((e) => sendJson(400, { error: e.message }));
    }

    // Sessions: GET /sessions/:id/tools
    const sessionToolsMatch = url.match(/^\/sessions\/([^/]+)\/tools$/);
    if (req.method === "GET" && sessionToolsMatch) {
      const sessionId = sessionToolsMatch[1] as string;
      const sessionServer = sessions.get(sessionId);
      if (!sessionServer) {
        return sendJson(404, { error: `Unknown session: ${sessionId}` });
      }
      
      const tools = activeRegistry.map((def) => ({
        name: def.name,
        description: def.description,
        inputSchema: def.schema ? zodToJsonSchema(z.object(def.schema) as any) : { type: "object", additionalProperties: false },
      }));
      return sendJson(200, { tools });
    }

    // Sessions: POST /sessions/:id/tools/:name
    const sessionToolCallMatch = url.match(/^\/sessions\/([^/]+)\/tools\/(.+)$/);
    if (req.method === "POST" && sessionToolCallMatch) {
      const sessionId = sessionToolCallMatch[1] as string;
      const toolName = sessionToolCallMatch[2] as string;
      
      const sessionServer = sessions.get(sessionId);
      if (!sessionServer) {
        return sendJson(404, { error: `Unknown session: ${sessionId}` });
      }

      if (!sessionServer.getRegisteredTools().includes(toolName)) {
        return sendJson(404, { error: `Unknown tool: ${toolName}` });
      }

      return readBody().then(async (args) => {
        try {
          const result = await sessionServer.callTool(toolName, args);
          sendJson(200, result);
        } catch (e) {
          console.error("Tool execution failed:", e);
          sendJson(500, { error: e instanceof Error ? e.message : String(e) });
        }
      }).catch((e) => sendJson(400, { error: e.message }));
    }

    sendJson(404, { error: "Not Found" });
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, () => {
      server.off("error", reject);
      resolve(server);
    });
  });
}
