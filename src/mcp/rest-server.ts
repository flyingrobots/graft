import * as http from "node:http";
import * as crypto from "node:crypto";
import * as path from "node:path";
import * as fs from "node:fs";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { createGraftServer, type GraftServer } from "./server.js";
import { ALL_TOOL_REGISTRY, TOOL_REGISTRY } from "./tool-registry.js";
import { toJSONSchema } from "zod/v4-mini";
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

  interface SessionEntry {
    readonly server: GraftServer;
    queue: Promise<void>;
  }

  const sessions = new Map<string, SessionEntry>();
  let globalQueue = Promise.resolve();

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

    const parsedUrl = new URL(req.url ?? "", "http://localhost");
    const pathname = parsedUrl.pathname;

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
    // Helper to parse and coerce query parameters for GET requests
    const parseQueryParams = (searchParams: URLSearchParams): JsonObject => {
      const args: JsonObject = {};
      for (const [key, value] of searchParams.entries()) {
        if (value === "true") {
          args[key] = true;
        } else if (value === "false") {
          args[key] = false;
        } else if (/^\d+$/.test(value)) {
          args[key] = parseInt(value, 10);
        } else if (/^\d+\.\d+$/.test(value)) {
          args[key] = parseFloat(value);
        } else {
          args[key] = value;
        }
      }
      return args;
    };

    // Global: GET /tools
    if (req.method === "GET" && pathname === "/tools") {
      const tools = activeRegistry.map((def) => ({
        name: def.name,
        description: def.description,
        inputSchema: def.schema ? toJSONSchema(z.object(def.schema)) : { type: "object", additionalProperties: false },
      }));
      return sendJson(200, { tools });
    }

    // Global: POST/GET /tools/:name
    if ((req.method === "POST" || req.method === "GET") && pathname.startsWith("/tools/") && graftServer) {
      const toolName = pathname.slice("/tools/".length);
      if (!activeRegistry.some(t => t.name === toolName)) {
        return sendJson(404, { error: `Unknown tool: ${toolName}` });
      }
      
      const readArgs = req.method === "POST"
        ? readBody()
        : Promise.resolve(parseQueryParams(parsedUrl.searchParams));

      return readArgs.then((args) => {
        globalQueue = globalQueue.then(async () => {
          try {
            const result = await graftServer.callTool(toolName, args);
            sendJson(200, result);
          } catch (e) {
            sendJson(500, { error: e instanceof Error ? e.message : String(e) });
          }
        });
      }).catch((e) => sendJson(400, { error: e.message }));
    }

    // Sessions: POST/GET /sessions
    if ((req.method === "POST" || req.method === "GET") && pathname === "/sessions") {
      if (!sessionsPath) {
        return sendJson(500, { error: "Server not configured for sessions (missing sessionsPath)" });
      }

      const readArgs = req.method === "POST"
        ? readBody()
        : Promise.resolve(parseQueryParams(parsedUrl.searchParams));

      return readArgs.then(async (body) => {
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

          sessions.set(sessionId, {
            server: sessionServer,
            queue: Promise.resolve(),
          });
          // Omit sessionDir from response for security (don't leak host filesystem structure)
          sendJson(200, { sessionId });
        } catch (e) {
          sendJson(500, { error: `Failed to create session: ${e instanceof Error ? e.message : String(e)}` });
        }
      }).catch((e) => sendJson(400, { error: e.message }));
    }

    // Sessions: GET /sessions/:id/tools
    const sessionToolsMatch = pathname.match(/^\/sessions\/([^/]+)\/tools$/);
    if (req.method === "GET" && sessionToolsMatch) {
      const sessionId = sessionToolsMatch[1] as string;
      const sessionEntry = sessions.get(sessionId);
      if (!sessionEntry) {
        return sendJson(404, { error: `Unknown session: ${sessionId}` });
      }
      
      const tools = activeRegistry.map((def) => ({
        name: def.name,
        description: def.description,
        inputSchema: def.schema ? toJSONSchema(z.object(def.schema)) : { type: "object", additionalProperties: false },
      }));
      return sendJson(200, { tools });
    }

    // Sessions: GET/POST /sessions/:id/tools/:name
    const sessionToolCallMatch = pathname.match(/^\/sessions\/([^/]+)\/tools\/(.+)$/);
    if ((req.method === "POST" || req.method === "GET") && sessionToolCallMatch) {
      const sessionId = sessionToolCallMatch[1] as string;
      const toolName = sessionToolCallMatch[2] as string;
      
      const sessionEntry = sessions.get(sessionId);
      if (!sessionEntry) {
        return sendJson(404, { error: `Unknown session: ${sessionId}` });
      }

      if (!activeRegistry.some(t => t.name === toolName)) {
        return sendJson(404, { error: `Unknown tool: ${toolName}` });
      }

      const readArgs = req.method === "POST"
        ? readBody()
        : Promise.resolve(parseQueryParams(parsedUrl.searchParams));

      return readArgs.then((args) => {
        sessionEntry.queue = sessionEntry.queue.then(async () => {
          try {
            const result = await sessionEntry.server.callTool(toolName, args);
            sendJson(200, result);
          } catch (e) {
            console.error("Tool execution failed:", e);
            sendJson(500, { error: e instanceof Error ? e.message : String(e) });
          }
        });
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
