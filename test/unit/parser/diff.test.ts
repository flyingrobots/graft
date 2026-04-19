import { describe, it, expect } from "vitest";
import { diffOutlines } from "../../../src/parser/diff.js";
import { extractOutline } from "../../../src/parser/outline.js";

describe("parser: outline diff", () => {
  it("detects added symbols", () => {
    const oldSource = `export function foo(): void {}`;
    const newSource = `export function foo(): void {}\nexport function bar(): void {}`;
    const oldOutline = extractOutline(oldSource, "ts");
    const newOutline = extractOutline(newSource, "ts");
    const diff = diffOutlines(oldOutline.entries, newOutline.entries);
    expect(diff.added).toHaveLength(1);
    expect(diff.added[0]!.name).toBe("bar");
    expect(diff.removed).toHaveLength(0);
  });

  it("detects removed symbols", () => {
    const oldSource = `export function foo(): void {}\nexport function bar(): void {}`;
    const newSource = `export function foo(): void {}`;
    const oldOutline = extractOutline(oldSource, "ts");
    const newOutline = extractOutline(newSource, "ts");
    const diff = diffOutlines(oldOutline.entries, newOutline.entries);
    expect(diff.removed).toHaveLength(1);
    expect(diff.removed[0]!.name).toBe("bar");
    expect(diff.added).toHaveLength(0);
  });

  it("detects changed signatures", () => {
    const oldSource = `export function greet(name: string): string { return name; }`;
    const newSource = `export function greet(name: string, title: string): string { return name; }`;
    const oldOutline = extractOutline(oldSource, "ts");
    const newOutline = extractOutline(newSource, "ts");
    const diff = diffOutlines(oldOutline.entries, newOutline.entries);
    expect(diff.changed).toHaveLength(1);
    expect(diff.changed[0]!.name).toBe("greet");
    expect(diff.changed[0]!.oldSignature).toBeDefined();
    expect(diff.changed[0]!.signature).toBeDefined();
    expect(diff.changed[0]!.oldSignature).not.toBe(diff.changed[0]!.signature);
  });

  it("counts unchanged symbols", () => {
    const source = `export function foo(): void {}\nexport function bar(): void {}`;
    const outline = extractOutline(source, "ts");
    const diff = diffOutlines(outline.entries, outline.entries);
    expect(diff.added).toHaveLength(0);
    expect(diff.removed).toHaveLength(0);
    expect(diff.changed).toHaveLength(0);
    expect(diff.unchangedCount).toBe(2);
  });

  it("handles empty old outline (all added)", () => {
    const newSource = `export function foo(): void {}`;
    const newOutline = extractOutline(newSource, "ts");
    const diff = diffOutlines([], newOutline.entries);
    expect(diff.added).toHaveLength(1);
    expect(diff.removed).toHaveLength(0);
    expect(diff.unchangedCount).toBe(0);
  });

  it("handles empty new outline (all removed)", () => {
    const oldSource = `export function foo(): void {}`;
    const oldOutline = extractOutline(oldSource, "ts");
    const diff = diffOutlines(oldOutline.entries, []);
    expect(diff.removed).toHaveLength(1);
    expect(diff.added).toHaveLength(0);
    expect(diff.unchangedCount).toBe(0);
  });

  it("handles both empty (no diff)", () => {
    const diff = diffOutlines([], []);
    expect(diff.added).toHaveLength(0);
    expect(diff.removed).toHaveLength(0);
    expect(diff.changed).toHaveLength(0);
    expect(diff.continuity).toHaveLength(0);
    expect(diff.unchangedCount).toBe(0);
  });

  it("reports likely rename continuity without collapsing added and removed entries", () => {
    const oldSource = `export function greet(name: string): string { return name; }`;
    const newSource = `export function welcome(name: string): string { return name; }`;
    const oldOutline = extractOutline(oldSource, "ts");
    const newOutline = extractOutline(newSource, "ts");
    const diff = diffOutlines(oldOutline.entries, newOutline.entries);

    expect(diff.added).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "welcome", kind: "function" }),
    ]));
    expect(diff.removed).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "greet", kind: "function" }),
    ]));
    expect(diff.continuity).toEqual([
      expect.objectContaining({
        kind: "rename",
        confidence: "likely",
        basis: "matching_signature_shape",
        symbolKind: "function",
        oldName: "greet",
        newName: "welcome",
      }),
    ]);
  });

  it("reports likely class rename continuity from unchanged child structure", () => {
    const oldSource = `export class Greeter {\n  greet(name: string): string { return name; }\n}`;
    const newSource = `export class WelcomeService {\n  greet(name: string): string { return name; }\n}`;
    const oldOutline = extractOutline(oldSource, "ts");
    const newOutline = extractOutline(newSource, "ts");
    const diff = diffOutlines(oldOutline.entries, newOutline.entries);

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

  it("detects added method inside a class", () => {
    const oldSource = `export class Foo {\n  bar(): void {}\n}`;
    const newSource = `export class Foo {\n  bar(): void {}\n  baz(): void {}\n}`;
    const oldOutline = extractOutline(oldSource, "ts");
    const newOutline = extractOutline(newSource, "ts");
    const diff = diffOutlines(oldOutline.entries, newOutline.entries);
    // Foo should show as changed (not unchanged) because children differ
    expect(diff.changed).toHaveLength(1);
    expect(diff.changed[0]!.name).toBe("Foo");
    // The changed entry should have childDiff with the added method
    const childDiff = diff.changed[0]!.childDiff;
    expect(childDiff).toBeDefined();
    expect(childDiff!.added).toHaveLength(1);
    expect(childDiff!.added[0]!.name).toBe("baz");
  });

  it("detects removed method inside a class", () => {
    const oldSource = `export class Foo {\n  bar(): void {}\n  baz(): void {}\n}`;
    const newSource = `export class Foo {\n  bar(): void {}\n}`;
    const oldOutline = extractOutline(oldSource, "ts");
    const newOutline = extractOutline(newSource, "ts");
    const diff = diffOutlines(oldOutline.entries, newOutline.entries);
    expect(diff.changed).toHaveLength(1);
    expect(diff.changed[0]!.name).toBe("Foo");
    const childDiff = diff.changed[0]!.childDiff;
    expect(childDiff).toBeDefined();
    expect(childDiff!.removed).toHaveLength(1);
    expect(childDiff!.removed[0]!.name).toBe("baz");
  });

  it("class with same children is unchanged", () => {
    const source = `export class Foo {\n  bar(): void {}\n}`;
    const outline = extractOutline(source, "ts");
    const diff = diffOutlines(outline.entries, outline.entries);
    expect(diff.changed).toHaveLength(0);
    expect(diff.unchangedCount).toBe(1);
  });

  it("detects changed method signature within a class", () => {
    const oldSource = `export class Foo {\n  bar(x: number): void {}\n}`;
    const newSource = `export class Foo {\n  bar(x: number, y: string): void {}\n}`;
    const oldOutline = extractOutline(oldSource, "ts");
    const newOutline = extractOutline(newSource, "ts");
    const diff = diffOutlines(oldOutline.entries, newOutline.entries);
    expect(diff.changed).toHaveLength(1);
    expect(diff.changed[0]!.name).toBe("Foo");
    const childDiff = diff.changed[0]!.childDiff;
    expect(childDiff).toBeDefined();
    expect(childDiff!.changed).toHaveLength(1);
    expect(childDiff!.changed[0]!.name).toBe("bar");
    expect(childDiff!.changed[0]!.oldSignature).toContain("x: number");
    expect(childDiff!.changed[0]!.signature).toContain("y: string");
  });

  it("includes kind in diff entries", () => {
    const newSource = `export class Foo { bar(): void {} }`;
    const newOutline = extractOutline(newSource, "ts");
    const diff = diffOutlines([], newOutline.entries);
    expect(diff.added[0]!.kind).toBe("class");
    expect(diff.continuity).toEqual([]);
  });
});
