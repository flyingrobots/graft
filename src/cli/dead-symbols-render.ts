import { z } from "zod";
import { mcpOutputBodySchemas } from "../contracts/output-schema-mcp.js";

const deadSymbolsRenderSchema = mcpOutputBodySchemas.graft_dead_symbols.extend({
  _schema: z.unknown().optional(),
  _receipt: z.unknown().optional(),
  tripwire: z.unknown().optional(),
}).strict();

export function renderDeadSymbols(input: Record<string, unknown>): string {
  const model = deadSymbolsRenderSchema.parse(input);
  const lines = [
    "Graft Dead Symbols",
    `total: ${String(model.total)}`,
    `max commits: ${model.maxCommits === undefined ? "all indexed" : String(model.maxCommits)}`,
  ];

  if (model.symbols.length > 0) {
    lines.push("", "Symbols");
    for (const symbol of model.symbols) {
      lines.push(
        `- ${symbol.filePath}: ${symbol.name} (${symbol.kind}, exported: ${String(symbol.exported)}, removed: ${symbol.removedInCommit})`,
      );
    }
  }

  return lines.join("\n");
}
