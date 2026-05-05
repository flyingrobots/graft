import { z } from "zod";
import { mcpOutputBodySchemas } from "../contracts/output-schema-mcp.js";

const structuralTestCoverageRenderSchema = mcpOutputBodySchemas.graft_test_coverage.extend({
  _schema: z.unknown().optional(),
  _receipt: z.unknown().optional(),
  tripwire: z.unknown().optional(),
}).strict();

type StructuralTestCoverageModel = z.output<typeof structuralTestCoverageRenderSchema>;
type CoverageFile = StructuralTestCoverageModel["files"][number];
type CoverageSymbol = CoverageFile["symbols"][number];

function renderSymbolLine(filePath: string, symbol: CoverageSymbol): string {
  const suffix = symbol.referenceCount > 0
    ? ` (refs: ${String(symbol.referenceCount)}, files: ${symbol.referencingTestFiles.join(", ")})`
    : " (refs: 0)";
  return `- ${filePath}: ${symbol.name} ${symbol.status}${suffix}`;
}

export function renderStructuralTestCoverageMap(input: Record<string, unknown>): string {
  const model = structuralTestCoverageRenderSchema.parse(input);
  const lines = [
    "Graft Structural Test Coverage",
    `kind: ${model.coverageKind}`,
    `source: ${model.sourcePath}`,
    `tests: ${model.testPath}`,
    "",
    "Summary",
    `source files: ${String(model.totals.sourceFiles)}`,
    `test files: ${String(model.totals.testFiles)}`,
    `exported: ${String(model.totals.exportedSymbols)}`,
    `covered: ${String(model.totals.coveredSymbols)}`,
    `uncovered: ${String(model.totals.uncoveredSymbols)}`,
  ];

  if (model.limitations.length > 0) {
    lines.push("", "Limitations");
    for (const limitation of model.limitations) {
      lines.push(`- ${limitation}`);
    }
  }

  if (model.files.length > 0) {
    lines.push("", "Symbols");
    for (const file of model.files) {
      for (const symbol of file.symbols) {
        lines.push(renderSymbolLine(file.path, symbol));
      }
    }
  }

  return lines.join("\n");
}
