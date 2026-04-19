import { describe, it, expect } from "vitest";
import { fileOutline } from "../../../src/operations/file-outline.js";
import { FakeFileSystem } from "../../helpers/fake-fs.js";
import {
  SMALL_TS,
  MEDIUM_TS,
  BROKEN_TS,
  MARKDOWN_WITH_HEADINGS,
  makeLargeTs,
} from "../../helpers/fake-content.js";

const LARGE_TS = makeLargeTs();

const fs = new FakeFileSystem({
  "/virtual/large.ts": LARGE_TS,
  "/virtual/medium.ts": MEDIUM_TS,
  "/virtual/small.ts": SMALL_TS,
  "/virtual/broken.ts": BROKEN_TS,
  "/virtual/README.md": MARKDOWN_WITH_HEADINGS,
});

describe("operations: file_outline", () => {
  it("returns outline for any file (never refused)", async () => {
    const result = await fileOutline("/virtual/large.ts", { fs });
    expect(result.outline).toBeDefined();
    expect(result.outline.length).toBeGreaterThan(0);
  });

  it("includes jump table", async () => {
    const result = await fileOutline("/virtual/medium.ts", { fs });
    expect(result.jumpTable).toBeDefined();
    expect(result.jumpTable.length).toBeGreaterThan(0);
    expect(result.jumpTable[0]).toHaveProperty("symbol");
    expect(result.jumpTable[0]).toHaveProperty("start");
    expect(result.jumpTable[0]).toHaveProperty("end");
    expect(result.jumpTable[0]).toHaveProperty("kind");
  });

  it("extracts classes, functions, interfaces, types from medium.ts", async () => {
    const result = await fileOutline("/virtual/medium.ts", { fs });
    const kinds = result.outline.map((e) => e.kind);
    expect(kinds).toContain("class");
    expect(kinds).toContain("function");
    expect(kinds).toContain("interface");
    expect(kinds).toContain("type");
  });

  it("returns error for nonexistent file", async () => {
    const result = await fileOutline("/virtual/nope.ts", { fs });
    expect(result.error).toBeDefined();
  });

  it("handles broken files with partial: true", async () => {
    const result = await fileOutline("/virtual/broken.ts", { fs });
    expect(result.partial).toBe(true);
    expect(result.outline.length).toBeGreaterThan(0);
  });

  it("includes path in result", async () => {
    const filePath = "/virtual/small.ts";
    const result = await fileOutline(filePath, { fs });
    expect(result.path).toBe(filePath);
  });

  it("returns a heading outline for markdown files", async () => {
    const result = await fileOutline("/virtual/README.md", { fs });
    expect(result.outline).toContainEqual(
      expect.objectContaining({
        kind: "heading",
        name: "Hello",
        children: expect.arrayContaining([
          expect.objectContaining({ kind: "heading", name: "Install" }),
        ]) as unknown[],
      }),
    );
    expect(result.jumpTable).toContainEqual(
      expect.objectContaining({ kind: "heading", symbol: "Install" }),
    );
    expect(result.error).toBeUndefined();
    expect(result.reason).toBeUndefined();
  });
});
