import { describe, expect, it } from "vitest";
import { diffOutlines } from "../../src/parser/diff.js";
import { extractOutline } from "../../src/parser/outline.js";
import { createStructuredBuffer } from "../../src/api/index.js";

describe("0090 symbol identity and rename continuity", () => {
  it("Do structural diff surfaces report likely rename continuity as an additive relation instead of collapsing old and new symbol addresses into one fake identity?", () => {
    const before = extractOutline(
      `export function greet(name: string): string { return name; }`,
      "ts",
    );
    const after = extractOutline(
      `export function welcome(name: string): string { return name; }`,
      "ts",
    );

    const diff = diffOutlines(before.entries, after.entries);

    expect(diff.removed).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "greet" })]),
    );
    expect(diff.added).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "welcome" })]),
    );
    expect(diff.continuity).toEqual([
      expect.objectContaining({
        kind: "rename",
        confidence: "likely",
        basis: "matching_signature_shape",
        oldName: "greet",
        newName: "welcome",
      }),
    ]);
  });

  it("Do same-file function and class renames now surface confidence and basis for continuity instead of only remove plus add?", () => {
    const before = extractOutline(
      `export class Greeter {\n  greet(name: string): string { return name; }\n}`,
      "ts",
    );
    const after = extractOutline(
      `export class WelcomeService {\n  greet(name: string): string { return name; }\n}`,
      "ts",
    );

    const diff = diffOutlines(before.entries, after.entries);

    expect(diff.continuity).toEqual([
      expect.objectContaining({
        kind: "rename",
        confidence: "likely",
        basis: "matching_child_structure",
        symbolKind: "class",
        oldName: "Greeter",
        newName: "WelcomeService",
      }),
    ]);
  });

  it("Does the editor semantic summary now rely on the shared continuity relation instead of a private rename heuristic?", () => {
    const oldBuffer = createStructuredBuffer(
      "src/greet.ts",
      `export function greet(name: string) {\n  return name;\n}\n`,
    );
    const newBuffer = createStructuredBuffer(
      "src/greet.ts",
      `export function welcome(name: string) {\n  return name.toUpperCase();\n}\n`,
    );

    const diff = oldBuffer.diff(newBuffer);
    const summary = oldBuffer.semanticSummary(newBuffer);

    expect(diff.outlineDiff.continuity).toEqual([
      expect.objectContaining({
        kind: "rename",
        oldName: "greet",
        newName: "welcome",
      }),
    ]);
    expect(summary.kind).toBe("renamed_symbol");
    expect(summary.summary).toContain("renamed function greet to welcome");
  });
});
