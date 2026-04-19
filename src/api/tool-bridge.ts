import type { McpToolName } from "../contracts/capabilities.js";
import type { JsonObject } from "../contracts/json-object.js";
import { parseJsonTextObject } from "../adapters/json-text-decoder.js";
import { getMcpOutputSchema, type McpOutputFor } from "../contracts/output-schemas.js";
import type { GraftServer, McpToolResult } from "../mcp/server.js";

export function parseGraftToolPayload(result: McpToolResult): JsonObject {
  const payload = result.content.find((item) => item.type === "text");
  if (payload === undefined) {
    throw new Error("Graft tool result did not contain a text payload");
  }
  return parseJsonTextObject(payload.text, "Graft tool result");
}

export async function callGraftTool<K extends McpToolName>(
  graft: GraftServer,
  name: K,
  args: JsonObject,
): Promise<McpOutputFor<K>> {
  const parsed = parseGraftToolPayload(await graft.callTool(name, args));
  return getMcpOutputSchema(name).parse(parsed) as McpOutputFor<K>;
}
