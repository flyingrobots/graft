import { describe, it, expect } from "vitest";
import { generateTeachingHint, type ProjectionContext } from "../../../src/operations/teaching-hints.js";

describe("operations: teaching-hints", () => {
  it("suggests file_outline for outline-projected large files", () => {
    const hint = generateTeachingHint({
      projection: "outline",
      reason: "SESSION_CAP",
      filePath: "src/big-file.ts",
      fileLines: 500,
      fileBytes: 15000,
      readCount: 1,
    });

    expect(hint).toBeDefined();
    expect(hint).toContain("file_outline");
  });

  it("suggests changed_since for re-reads of unchanged files", () => {
    const hint = generateTeachingHint({
      projection: "content",
      reason: "ok",
      filePath: "src/app.ts",
      fileLines: 50,
      fileBytes: 1200,
      readCount: 3,
      changedSinceLastRead: false,
    });

    expect(hint).toBeDefined();
    expect(hint).toContain("changed_since");
  });

  it("suggests src/ for refused build output", () => {
    const hint = generateTeachingHint({
      projection: "refused",
      reason: "GRAFTIGNORE",
      filePath: "dist/bundle.js",
      fileLines: 0,
      fileBytes: 0,
      readCount: 1,
    });

    expect(hint).toBeDefined();
    expect(hint).toContain("src/");
  });

  it("returns undefined when the read decision was optimal", () => {
    const hint = generateTeachingHint({
      projection: "content",
      reason: "ok",
      filePath: "src/small.ts",
      fileLines: 20,
      fileBytes: 400,
      readCount: 1,
    });

    expect(hint).toBeUndefined();
  });

  it("suggests read_range for large content reads", () => {
    const hint = generateTeachingHint({
      projection: "content",
      reason: "ok",
      filePath: "src/large.ts",
      fileLines: 300,
      fileBytes: 10000,
      readCount: 1,
    });

    expect(hint).toBeDefined();
    expect(hint).toContain("read_range");
  });
});
