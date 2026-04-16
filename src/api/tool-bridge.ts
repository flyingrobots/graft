import type { McpToolName } from "../contracts/capabilities.js";
import { getMcpOutputSchema } from "../contracts/output-schemas.js";
import type { GraftServer, McpToolResult } from "../mcp/server.js";

export function parseGraftToolPayload(result: McpToolResult): Record<string, unknown> {
  const payload = result.content.find((item) => item.type === "text");
  if (payload === undefined) {
    throw new Error("Graft tool result did not contain a text payload");
  }
  const parsed = JSON.parse(payload.text) as unknown;
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Graft tool result was not a JSON object");
  }
  return parsed as Record<string, unknown>;
}

export async function callGraftTool<T extends Record<string, unknown> = Record<string, unknown>>(
  graft: GraftServer,
  name: McpToolName,
  args: Record<string, unknown>,
): Promise<T> {
  const parsed = parseGraftToolPayload(await graft.callTool(name, args));
  return getMcpOutputSchema(name).parse(parsed) as T;
}
