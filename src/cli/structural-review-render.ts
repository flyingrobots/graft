import { z } from "zod";
import { mcpOutputBodySchemas } from "../contracts/output-schema-mcp.js";

const structuralReviewRenderSchema = mcpOutputBodySchemas.graft_review.extend({
  _schema: z.unknown().optional(),
  _receipt: z.unknown().optional(),
  tripwire: z.unknown().optional(),
}).strict();

type StructuralReviewModel = z.output<typeof structuralReviewRenderSchema>;
type ReviewFile = StructuralReviewModel["files"][number];
type BreakingChange = StructuralReviewModel["breakingChanges"][number];

function renderCategoryLine(label: string, count: number): string {
  return `${label}: ${String(count)}`;
}

function renderFileLine(file: ReviewFile): string {
  if (file.category !== "structural" || file.structuralChanges === undefined) {
    return `- ${file.path}: ${file.category}`;
  }
  const changes = file.structuralChanges;
  return [
    `- ${file.path}: structural`,
    `(+${String(changes.added)} -${String(changes.removed)} ~${String(changes.changed)})`,
  ].join(" ");
}

function renderBreakingChangeLine(change: BreakingChange): string {
  return [
    `- ${change.filePath}: ${change.symbol}`,
    `${change.changeType},`,
    `impacted files: ${String(change.impactedFiles)}`,
    `confidence: ${change.referenceConfidence}`,
  ].join(" ");
}

function renderReferenceWarning(change: BreakingChange): readonly string[] {
  return change.referenceWarnings.map((warning) =>
    `  warning ${warning.code}: ${warning.filePath}:${String(warning.range.startLine)}:${String(warning.range.startColumn)} ${warning.message}`,
  );
}

export function renderStructuralReview(input: Record<string, unknown>): string {
  const model = structuralReviewRenderSchema.parse(input);
  const lines = [
    "Graft Review",
    `range: ${model.base}..${model.head}`,
    "",
    "Summary",
    `files: ${String(model.totalFiles)}`,
    renderCategoryLine("structural", model.categories.structural),
    renderCategoryLine("formatting", model.categories.formatting),
    renderCategoryLine("tests", model.categories.test),
    renderCategoryLine("docs", model.categories.docs),
    renderCategoryLine("config", model.categories.config),
  ];

  if (model.files.length > 0) {
    lines.push("", "Files");
    for (const file of model.files) {
      lines.push(renderFileLine(file));
    }
  }

  if (model.breakingChanges.length > 0) {
    lines.push("", "Breaking changes");
    for (const change of model.breakingChanges) {
      lines.push(renderBreakingChangeLine(change));
      lines.push(...renderReferenceWarning(change));
    }
  }

  return lines.join("\n");
}
