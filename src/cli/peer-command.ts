import * as path from "node:path";
import { CanonicalJsonCodec } from "../adapters/canonical-json.js";
import type { CliCommandName, McpToolName } from "../contracts/capabilities.js";
import { type JsonObject, parseJsonTextObject } from "../contracts/json-object.js";
import {
  attachCliSchemaMeta,
  validateCliOutput,
} from "../contracts/output-schemas.js";
import { createGraftServer, type McpToolResult } from "../mcp/server.js";
import { renderActivityView } from "./activity-render.js";

const codec = new CanonicalJsonCodec();

export interface Writer {
  write(chunk: string): unknown;
}

function parseToolResult(result: McpToolResult): JsonObject {
  const payload = result.content.find((item) => item.type === "text");
  if (payload === undefined) {
    throw new Error("Tool result did not contain a text payload");
  }
  return parseJsonTextObject(payload.text, "Tool result");
}

export function writeLine(writer: Writer, line = ""): void {
  writer.write(`${line}\n`);
}

export function emitPeerCommand(
  command: CliCommandName,
  data: JsonObject,
  json: boolean,
  writer: Writer,
): void {
  const { _schema: _mcpSchema, ...rest } = data;
  const validated = validateCliOutput(command, attachCliSchemaMeta(command, rest));
  if (json) {
    writer.write(`${codec.encode(validated)}\n`);
    return;
  }
  if (command === "diag_activity") {
    writer.write(`${renderActivityView(validated)}\n`);
    return;
  }
  writer.write(`${JSON.stringify(validated, null, 2)}\n`);
}

export async function invokePeerCommand(
  cwd: string,
  tool: McpToolName,
  args: JsonObject,
): Promise<JsonObject> {
  const server = createGraftServer({
    projectRoot: cwd,
    graftDir: path.join(cwd, ".graft"),
  });
  return parseToolResult(await server.callTool(tool, args));
}
