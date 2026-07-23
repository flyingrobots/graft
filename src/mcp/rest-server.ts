import * as http from "node:http";
import type { GraftServer } from "./server.js";
import { ALL_TOOL_REGISTRY, TOOL_REGISTRY } from "./tool-registry.js";
import type { JsonObject } from "../contracts/json-object.js";

export interface StartRestServerOptions {
  readonly port: number;
  readonly graftServer: GraftServer;
  readonly mode?: "repo_local" | "daemon";
}

export function startRestServer(options: StartRestServerOptions): Promise<http.Server> {
  const { port, graftServer, mode = "repo_local" } = options;
  const activeRegistry = mode === "daemon" ? ALL_TOOL_REGISTRY : TOOL_REGISTRY;

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

    if (req.method === "GET" && req.url === "/tools") {
      const tools = activeRegistry.map((def) => ({
        name: def.name,
        description: def.description,
        schema: def.schema ?? {},
      }));

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ tools }, null, 2));
      return;
    }

    if (req.method === "POST" && req.url?.startsWith("/tools/")) {
      const toolName = req.url.slice("/tools/".length);
      const registeredTools = graftServer.getRegisteredTools();

      if (!registeredTools.includes(toolName)) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: `Unknown tool: ${toolName}` }));
        return;
      }

      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
      });

      req.on("end", async () => {
        let args: JsonObject = {};
        try {
          if (body.trim().length > 0) {
            args = JSON.parse(body) as JsonObject;
          }
        } catch (e) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid JSON body" }));
          return;
        }

        try {
          const result = await graftServer.callTool(toolName, args);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(result, null, 2));
        } catch (e) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }));
        }
      });
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not Found" }));
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, () => {
      server.off("error", reject);
      resolve(server);
    });
  });
}
