import { afterEach, describe, expect, it } from "vitest";
import { createStructuredBuffer } from "../../../src/index.js";

function locate(content: string, needle: string): { row: number; column: number; endColumn: number } {
  const index = content.indexOf(needle);
  if (index < 0) {
    throw new Error(`Missing needle: ${needle}`);
  }
  const before = content.slice(0, index);
  const lines = before.split("\n");
  const row = lines.length - 1;
  const column = lines[lines.length - 1]?.length ?? 0;
  return { row, column, endColumn: column + needle.length };
}

const activeBuffers: { dispose(): void }[] = [];

function track<T extends { dispose(): void }>(value: T): T {
  activeBuffers.push(value);
  return value;
}

afterEach(() => {
  while (activeBuffers.length > 0) {
    activeBuffers.pop()?.dispose();
  }
});

describe("library: structured buffer", () => {
  it("projects outline, injections, folds, and syntax spans from a dirty tsx buffer", () => {
    const content = [
      "export function greet(name: string) {",
      "  // say hello",
      "  const sqlText = sql`select * from users`;",
      "  return <div className=\"greeting\">{name}</div>;",
      "}",
    ].join("\n");

    const buffer = track(createStructuredBuffer("src/view.tsx", content));
    const outline = buffer.outline();
    expect(outline.outline).toContainEqual(expect.objectContaining({ kind: "function", name: "greet" }));
    expect(outline.partial).toBe(false);

    const injections = buffer.injections();
    expect(injections.injections).toEqual(expect.arrayContaining([
      expect.objectContaining({ language: "jsx", reason: "jsx_syntax" }),
      expect.objectContaining({ language: "sql", reason: "tagged_template" }),
    ]));

    const folds = buffer.foldRegions();
    expect(folds.regions).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "function_declaration" }),
      expect.objectContaining({ kind: "statement_block" }),
    ]));

    const greet = locate(content, "greet");
    const spans = buffer.syntaxSpans({
      viewport: {
        start: { row: 0, column: 0 },
        end: { row: 3, column: 80 },
      },
    });
    expect(spans.spans).toEqual(expect.arrayContaining([
      expect.objectContaining({ className: "keyword", text: "export" }),
      expect.objectContaining({
        className: "function",
        range: expect.objectContaining({
          start: expect.objectContaining({ row: greet.row, column: greet.column }),
        }),
      }),
      expect.objectContaining({ className: "comment", text: "// say hello" }),
      expect.objectContaining({ className: "string", text: "\"greeting\"" }),
      expect.objectContaining({ className: "type", text: "string" }),
    ]));
  });

  it("reports parse diagnostics for broken buffers", () => {
    const content = [
      "export function broken(",
      "  return 1;",
      "}",
    ].join("\n");
    const buffer = track(createStructuredBuffer("src/broken.ts", content));
    const diagnostics = buffer.diagnostics();
    expect(diagnostics.partial).toBe(true);
    expect(diagnostics.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "parse_error" }),
    ]));
  });

  it("supports cursor lookup plus structural expand and shrink", () => {
    const content = [
      "export function greet(name: string) {",
      "  return name.toUpperCase();",
      "}",
    ].join("\n");
    const buffer = track(createStructuredBuffer("src/greet.ts", content));
    const name = locate(content, "name");

    const lookup = buffer.nodeAt({ row: name.row, column: name.column });
    expect(lookup.node).toEqual(expect.objectContaining({ type: "identifier", text: "name" }));
    expect(lookup.parents).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "formal_parameters" }),
      expect.objectContaining({ type: "function_declaration" }),
    ]));

    const expanded = buffer.selectionExpand({ row: name.row, column: name.column });
    expect(expanded.node).toEqual(expect.objectContaining({ type: "identifier" }));

    const grown = buffer.selectionExpand(expanded.range!);
    expect(grown.node).toEqual(expect.objectContaining({ type: "required_parameter" }));

    const shrunk = buffer.selectionShrink(grown.range!);
    expect(shrunk.node).toEqual(expect.objectContaining({ type: "identifier" }));
  });

  it("finds active-symbol occurrences and prepares a rename preview", () => {
    const content = [
      "export function greet(name: string) {",
      "  return name + name.toUpperCase();",
      "}",
    ].join("\n");
    const buffer = track(createStructuredBuffer("src/greet.ts", content));
    const name = locate(content, "name");

    const occurrences = buffer.symbolOccurrences({ position: { row: name.row, column: name.column } });
    expect(occurrences.symbol).toBe("name");
    expect(occurrences.occurrences).toHaveLength(3);

    const preview = buffer.renamePreview({
      position: { row: name.row, column: name.column },
      nextName: "personName",
    });
    expect(preview.edits).toHaveLength(3);
    expect(preview.edits[0]).toEqual(expect.objectContaining({ before: "name", after: "personName" }));
  });

  it("diffs two buffer snapshots, summarizes the edit, and maps structural anchors", () => {
    const before = [
      "export function greet(name: string) {",
      "  return name;",
      "}",
    ].join("\n");
    const after = [
      "export function welcome(name: string) {",
      "  return name.toUpperCase();",
      "}",
    ].join("\n");
    const oldBuffer = track(createStructuredBuffer("src/greet.ts", before));
    const newBuffer = track(createStructuredBuffer("src/greet.ts", after));

    const diff = oldBuffer.diff(newBuffer);
    expect(diff.outlineDiff.added).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "welcome", kind: "function" }),
    ]));
    expect(diff.outlineDiff.removed).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "greet", kind: "function" }),
    ]));
    expect(diff.changedRegions.length).toBeGreaterThan(0);

    const summary = oldBuffer.semanticSummary(newBuffer);
    expect(summary.kind).toBe("renamed_symbol");
    expect(summary.summary).toContain("renamed function greet to welcome");

    const greet = locate(before, "greet");
    const mapped = oldBuffer.mapRangeTo(newBuffer, {
      start: { row: greet.row, column: greet.column },
      end: { row: greet.row, column: greet.endColumn },
    });
    expect(mapped.status).toBe("mapped");
    expect(mapped.newRange).toEqual(expect.objectContaining({
      start: expect.objectContaining({ row: 0 }),
    }));
  });

  it("detects fenced-code injections in markdown buffers", () => {
    const content = [
      "# Notes",
      "",
      "```ts",
      "export const x = 1;",
      "```",
    ].join("\n");
    const buffer = track(createStructuredBuffer("README.md", content));
    const injections = buffer.injections();
    expect(injections.injections).toEqual([
      expect.objectContaining({ language: "ts", reason: "fenced_code_block" }),
    ]);
  });
});
