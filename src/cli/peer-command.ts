import * as path from "node:path";
import { CanonicalJsonCodec } from "../adapters/canonical-json.js";
import type { CliCommandName, McpToolName } from "../contracts/capabilities.js";
import type { JsonObject } from "../contracts/json-object.js";
import { parseJsonTextObject } from "../adapters/json-text-decoder.js";
import {
  attachCliSchemaMeta,
  validateCliOutput,
} from "../contracts/output-schemas.js";
import { createGraftServer, type McpToolResult } from "../mcp/server.js";
import { renderActivityView } from "./activity-render.js";
import { renderDeadSymbols } from "./dead-symbols-render.js";
import { renderDoctorPosture } from "./doctor-render.js";
import { renderStructuralBlame } from "./structural-blame-render.js";
import { renderStructuralReview } from "./structural-review-render.js";
import { renderStructuralTestCoverageMap } from "./structural-test-coverage-render.js";

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

function projectMcpV2FullReceiptToCliV1(data: JsonObject): JsonObject {
  const receipt = data["_receipt"];
  if (receipt === null || typeof receipt !== "object" || Array.isArray(receipt)) {
    throw new Error("CLI peer response did not contain a full MCP receipt");
  }
  const { mode, ...legacyReceipt } = receipt as Record<string, unknown>;
  if (mode !== "full") {
    throw new Error("CLI peer commands require an explicit full MCP receipt");
  }
  return {
    ...data,
    _receipt: legacyReceipt,
  };
}

export function emitPeerCommand(
  command: CliCommandName,
  data: JsonObject,
  json: boolean,
  writer: Writer,
): void {
  const projected = projectMcpV2FullReceiptToCliV1(data);
  const { _schema: _mcpSchema, ...rest } = projected;
  const validated = validateCliOutput(command, attachCliSchemaMeta(command, rest));
  if (json) {
    writer.write(`${codec.encode(validated)}\n`);
    return;
  }
  if (command === "diag_activity") {
    writer.write(`${renderActivityView(validated)}\n`);
    return;
  }
  if (command === "diag_doctor") {
    writer.write(`${renderDoctorPosture(validated)}\n`);
    return;
  }
  if (command === "struct_review") {
    writer.write(`${renderStructuralReview(validated)}\n`);
    return;
  }
  if (command === "symbol_blame") {
    writer.write(`${renderStructuralBlame(validated)}\n`);
    return;
  }
  if (command === "struct_test_coverage") {
    writer.write(`${renderStructuralTestCoverageMap(validated)}\n`);
    return;
  }
  if (command === "struct_dead_symbols") {
    writer.write(`${renderDeadSymbols(validated)}\n`);
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
  const requiresFullDetail = tool === "doctor" || tool === "activity_view";
  return parseToolResult(await server.callTool(tool, {
    ...args,
    ...(requiresFullDetail ? { detail: "full" } : {}),
    receipt: "full",
  }));
}
