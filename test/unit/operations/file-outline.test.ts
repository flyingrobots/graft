import { describe, it, expect } from "vitest";
import { fileOutline } from "../../../src/operations/file-outline.js";
import path from "node:path";

const FIXTURES = path.resolve(import.meta.dirname, "../../fixtures");

describe("operations: file_outline", () => {
  it("returns outline for any file (never refused)", async () => {
    const result = await fileOutline(path.join(FIXTURES, "large.ts"));
    expect(result.outline).toBeDefined();
    expect(result.outline.length).toBeGreaterThan(0);
  });

  it("includes jump table", async () => {
    const result = await fileOutline(path.join(FIXTURES, "medium.ts"));
    expect(result.jumpTable).toBeDefined();
    expect(result.jumpTable.length).toBeGreaterThan(0);
    expect(result.jumpTable[0]).toHaveProperty("symbol");
    expect(result.jumpTable[0]).toHaveProperty("start");
    expect(result.jumpTable[0]).toHaveProperty("end");
    expect(result.jumpTable[0]).toHaveProperty("kind");
  });

  it("extracts classes, functions, interfaces, types from medium.ts", async () => {
    const result = await fileOutline(path.join(FIXTURES, "medium.ts"));
    const kinds = result.outline.map((e) => e.kind);
    expect(kinds).toContain("class");
    expect(kinds).toContain("function");
    expect(kinds).toContain("interface");
    expect(kinds).toContain("type");
  });

  it("returns error for nonexistent file", async () => {
    const result = await fileOutline(path.join(FIXTURES, "nope.ts"));
    expect(result.error).toBeDefined();
  });

  it("handles broken files with partial: true", async () => {
    const result = await fileOutline(path.join(FIXTURES, "broken.ts"));
    expect(result.partial).toBe(true);
    expect(result.outline.length).toBeGreaterThan(0);
  });

  it("includes path in result", async () => {
    const filePath = path.join(FIXTURES, "small.ts");
    const result = await fileOutline(filePath);
    expect(result.path).toBe(filePath);
  });
});
