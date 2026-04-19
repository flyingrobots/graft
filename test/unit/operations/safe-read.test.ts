import { describe, it, expect, vi } from "vitest";
import { safeRead } from "../../../src/operations/safe-read.js";
import { CanonicalJsonCodec } from "../../../src/adapters/canonical-json.js";
import { fileOutline } from "../../../src/operations/file-outline.js";
import { FakeFileSystem } from "../../helpers/fake-fs.js";
import {
  SMALL_TS,
  MEDIUM_TS,
  BINARY_PNG,
  LOCKFILE_JSON,
  MINIFIED_JS,
  SECRET_ENV,
  makeLargeTs,
  makeLargeMarkdown,
  makeLargeMarkdownNoHeadings,
} from "../../helpers/fake-content.js";

const codec = new CanonicalJsonCodec();
const LARGE_TS = makeLargeTs();

const fs = new FakeFileSystem({
  "/virtual/small.ts": SMALL_TS,
  "/virtual/large.ts": LARGE_TS,
  "/virtual/medium.ts": MEDIUM_TS,
  "/virtual/ban-targets/image.png": BINARY_PNG,
  "/virtual/ban-targets/package-lock.json": LOCKFILE_JSON,
  "/virtual/ban-targets/bundle.min.js": MINIFIED_JS,
  "/virtual/ban-targets/.env": SECRET_ENV,
  "/virtual/large-readme.md": makeLargeMarkdown(),
  "/virtual/large-no-headings.md": makeLargeMarkdownNoHeadings(),
});

describe("operations: safe_read", () => {
  it("returns content for small files", async () => {
    const result = await safeRead("/virtual/small.ts", { fs, codec });
    expect(result.projection).toBe("content");
    expect(result.content).toBeDefined();
    expect(result.content).toContain("greet");
    expect(result.reason).toBe("CONTENT");
  });

  it("returns outline for large files", async () => {
    const result = await safeRead("/virtual/large.ts", { fs, codec });
    expect(result.projection).toBe("outline");
    expect(result.outline).toBeDefined();
    expect(result.outline!.length).toBeGreaterThan(0);
    expect(result.jumpTable).toBeDefined();
    expect(result.jumpTable!.length).toBeGreaterThan(0);
    expect(result.reason).toBe("OUTLINE");
  });

  it("returns refused for binary files", async () => {
    const result = await safeRead(
      "/virtual/ban-targets/image.png",
      { fs, codec },
    );
    expect(result.projection).toBe("refused");
    expect(result.reason).toBe("BINARY");
    expect(result.next).toBeDefined();
  });

  it("returns refused for lockfiles", async () => {
    const result = await safeRead(
      "/virtual/ban-targets/package-lock.json",
      { fs, codec },
    );
    expect(result.projection).toBe("refused");
    expect(result.reason).toBe("LOCKFILE");
  });

  it("returns refused for minified files", async () => {
    const result = await safeRead(
      "/virtual/ban-targets/bundle.min.js",
      { fs, codec },
    );
    expect(result.projection).toBe("refused");
    expect(result.reason).toBe("MINIFIED");
  });

  it("returns refused for secret files", async () => {
    const result = await safeRead(
      "/virtual/ban-targets/.env",
      { fs, codec },
    );
    expect(result.projection).toBe("refused");
    expect(result.reason).toBe("SECRET");
  });

  it("returns error for nonexistent files", async () => {
    const result = await safeRead(
      "/virtual/does-not-exist.ts",
      { fs, codec },
    );
    expect(result.projection).toBe("error");
    expect(result.reason).toBe("NOT_FOUND");
  });

  it("returns path in every result", async () => {
    const filePath = "/virtual/small.ts";
    const result = await safeRead(filePath, { fs, codec });
    expect(result.path).toBe(filePath);
  });

  it("includes actual dimensions in result", async () => {
    const result = await safeRead("/virtual/small.ts", { fs, codec });
    expect(result.actual).toBeDefined();
    expect(result.actual!.lines).toBeGreaterThan(0);
    expect(result.actual!.bytes).toBeGreaterThan(0);
  });

  it("includes threshold values in result", async () => {
    const result = await safeRead("/virtual/small.ts", { fs, codec });
    expect(result.thresholds).toBeDefined();
    expect(result.thresholds!.lines).toBe(150);
    expect(result.thresholds!.bytes).toBe(12288);
  });

  it("includes estimatedBytesAvoided when outline returned", async () => {
    const result = await safeRead("/virtual/large.ts", { fs, codec });
    expect(result.projection).toBe("outline");
    expect(result.estimatedBytesAvoided).toBeDefined();
    expect(result.estimatedBytesAvoided!).toBeGreaterThan(0);
  });

  it("returns a heading outline for large markdown files", async () => {
    const result = await safeRead("/virtual/large-readme.md", { fs, codec });
    expect(result.projection).toBe("outline");
    expect(result.reason).toBe("OUTLINE");
    expect(result.outline).toContainEqual(
      expect.objectContaining({ kind: "heading", name: "Section 0" }),
    );
    expect(result.jumpTable).toContainEqual(
      expect.objectContaining({ kind: "heading", symbol: "Section 0" }),
    );
    expect(result.next).toBeUndefined();
  });

  it("returns an empty outline for large markdown files with no headings", async () => {
    const result = await safeRead("/virtual/large-no-headings.md", { fs, codec });
    expect(result.projection).toBe("outline");
    expect(result.reason).toBe("OUTLINE");
    expect(result.outline).toEqual([]);
    expect(result.jumpTable).toEqual([]);
    expect(result.next).toBeUndefined();
  });

  it("accepts optional intent parameter without changing policy", async () => {
    const result = await safeRead(
      "/virtual/large.ts",
      { fs, codec, intent: "reviewing the class structure" },
    );
    // Intent is advisory only — still returns outline for large file
    expect(result.projection).toBe("outline");
  });

  it("respects session depth when provided", async () => {
    // medium.ts is under static thresholds but may exceed dynamic cap
    const result = await safeRead(
      "/virtual/medium.ts",
      { fs, codec, sessionDepth: "late" },
    );
    // medium.ts is ~3KB — check if it exceeds 4KB late cap
    // If under 4KB, should be content; if over, SESSION_CAP
    expect(["content", "outline"]).toContain(result.projection);
    if (result.projection === "outline") {
      expect(result.reason).toBe("SESSION_CAP");
    }
  });

  it("Is the filesystem posture async on daemon-heavy request paths, with remaining sync reads treated as deliberate debt rather than default behavior?", async () => {
    const filePath = "/virtual/app.ts";
    const content = [
      "export function greet(name: string): string {",
      "  return `hello ${name}`;",
      "}",
      "",
    ].join("\n");
    const asyncFs = new FakeFileSystem({ [filePath]: content });
    const syncRead = vi.fn(() => {
      throw new Error("readFileSync should not be used on async request paths");
    });
    asyncFs.readFileSync = syncRead;

    const safeReadResult = await safeRead(filePath, { fs: asyncFs, codec });
    const fileOutlineResult = await fileOutline(filePath, { fs: asyncFs });

    expect(safeReadResult.projection).toBe("content");
    expect(fileOutlineResult.outline).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "function", name: "greet" }),
    ]));
    expect(syncRead).not.toHaveBeenCalled();
  });
});
