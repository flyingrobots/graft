import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { type z } from "zod";
import { mcpOutputBodySchemas } from "../contracts/output-schema-mcp.js";
import { createLocalSocketFetch, ensureDaemonReady } from "../mcp/daemon-stdio-bridge.js";
import { GRAFT_VERSION } from "../version.js";
import type { DaemonStatusReadSnapshot } from "./daemon-status-model.js";

const MCP_PATH = "/mcp";

export interface ReadDaemonStatusOptions {
  readonly cwd: string;
  readonly socketPath?: string | undefined;
}

function readToolText(result: unknown): string {
  const content = (result as { readonly content?: unknown }).content;
  if (!Array.isArray(content)) {
    throw new Error("Daemon tool returned no content");
  }
  const text = content.find((item): item is { readonly type: "text"; readonly text: string } => {
    return typeof item === "object"
      && item !== null
      && (item as { readonly type?: unknown }).type === "text"
      && typeof (item as { readonly text?: unknown }).text === "string";
  });
  if (text === undefined) {
    throw new Error("Daemon tool returned no text content");
  }
  return text.text;
}

function stripMcpCommon(value: unknown): unknown {
  if (typeof value !== "object" || value === null) {
    return value;
  }
  const body = { ...(value as Record<string, unknown>) };
  delete body["_schema"];
  delete body["_receipt"];
  delete body["tripwire"];
  return body;
}

function parseToolBody<T>(schema: z.ZodType<T>, result: unknown): T {
  return schema.parse(stripMcpCommon(JSON.parse(readToolText(result)) as unknown));
}

export async function readDaemonStatusSnapshot(
  options: ReadDaemonStatusOptions,
): Promise<DaemonStatusReadSnapshot> {
  const socketPath = await ensureDaemonReady({
    ...(options.socketPath !== undefined ? { socketPath: options.socketPath } : {}),
    spawnIfMissing: false,
  });
  const transport = new StreamableHTTPClientTransport(
    new URL(`http://graft${MCP_PATH}`),
    { fetch: createLocalSocketFetch(socketPath) },
  );
  const client = new Client({
    name: "graft-cli-daemon-status",
    version: GRAFT_VERSION,
  });

  await client.connect(transport as unknown as Parameters<Client["connect"]>[0]);
  try {
    const call = async <T>(
      tool: string,
      schema: z.ZodType<T>,
      args: Record<string, unknown> = {},
    ): Promise<T> => {
      const result = await client.callTool({
        name: tool,
        arguments: args,
      });
      return parseToolBody(schema, result);
    };

    const [status, sessions, currentRepo, monitors, workspaceStatus, authorizations] = await Promise.all([
      call("daemon_status", mcpOutputBodySchemas.daemon_status),
      call("daemon_sessions", mcpOutputBodySchemas.daemon_sessions),
      call("daemon_repos", mcpOutputBodySchemas.daemon_repos, { cwd: options.cwd }),
      call("daemon_monitors", mcpOutputBodySchemas.daemon_monitors),
      call("workspace_status", mcpOutputBodySchemas.workspace_status),
      call("workspace_authorizations", mcpOutputBodySchemas.workspace_authorizations),
    ]);

    return {
      status,
      sessions,
      currentRepo,
      monitors,
      workspaceStatus,
      authorizations,
    };
  } finally {
    await client.close().catch(() => {
      return undefined;
    });
  }
}
