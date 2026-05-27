import { z } from "zod";
import { mcpOutputBodySchemas } from "../contracts/output-schema-mcp.js";

const structuralBlameRenderSchema = mcpOutputBodySchemas.graft_blame.extend({
  _schema: z.unknown().optional(),
  _receipt: z.unknown().optional(),
  tripwire: z.unknown().optional(),
}).strict();

type StructuralBlameModel = z.output<typeof structuralBlameRenderSchema>;
type StructuralBlameVersion = StructuralBlameModel["history"][number];

function shortSha(sha: string): string {
  return sha.length > 12 ? sha.slice(0, 12) : sha;
}

function renderVersion(version: StructuralBlameVersion): string {
  const signature = version.signature !== null && version.signature.length > 0
    ? `, ${version.signature}`
    : "";
  const location = version.startLine !== undefined && version.endLine !== undefined
    ? `, ${version.path}:${String(version.startLine)}-${String(version.endLine)}`
    : `, ${version.path}`;
  return `- ${shortSha(version.sha)} @ tick ${String(version.tick)}: ${version.changeKind}, present: ${String(version.present)}${location}${signature}`;
}

export function renderStructuralBlame(input: Record<string, unknown>): string {
  const model = structuralBlameRenderSchema.parse(input);
  const lines = [
    "Graft Symbol History",
    `symbol: ${model.symbol}`,
    `path: ${model.filePath}`,
    `changes: ${String(model.changeCount)}`,
    `references: ${String(model.referenceCount)}`,
    `created: ${model.createdInCommit ?? "unknown"}`,
    `last signature change: ${model.lastSignatureChange ?? "none"}`,
  ];

  if (model.history.length > 0) {
    lines.push("", "Timeline");
    for (const version of model.history) {
      lines.push(renderVersion(version));
    }
  } else {
    lines.push("", "Timeline", "- unavailable: symbol was not found in the indexed WARP graph");
  }

  return lines.join("\n");
}
