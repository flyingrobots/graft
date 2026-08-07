import { describe, it, expect } from "vitest";
import { readRange } from "../../../src/operations/read-range.js";
import { FakeFileSystem } from "../../helpers/fake-fs.js";
import { observe } from "../../helpers/observed.js";
import { SMALL_TS, MEDIUM_TS, makeLargeTs } from "../../helpers/fake-content.js";

const LARGE_TS = makeLargeTs();

const fs = new FakeFileSystem({
  "/virtual/medium.ts": MEDIUM_TS,
  "/virtual/large.ts": LARGE_TS,
  "/virtual/small.ts": SMALL_TS,
});

describe("operations: read_range", () => {
  it("returns requested line range with line numbers", async () => {
    const result = readRange(await observe(fs, "/virtual/medium.ts"), 1, 10);
    expect(result.content).toBeDefined();
    expect(result.startLine).toBe(1);
    expect(result.endLine).toBe(10);
    expect(result.content!.split("\n").length).toBeLessThanOrEqual(10);
  });

  it("refuses ranges exceeding 250 lines", async () => {
    const result = readRange(await observe(fs, "/virtual/large.ts"), 1, 300);
    expect(result.reason).toBe("RANGE_EXCEEDED");
    expect(result.truncated).toBe(true);
    // Should still return clipped content (250 lines)
    expect(result.content).toBeDefined();
    expect(result.content!.split("\n").length).toBeLessThanOrEqual(250);
  });

  it("clips to file end if range extends past EOF", async () => {
    const result = readRange(await observe(fs, "/virtual/small.ts"), 1, 1000);
    expect(result.content).toBeDefined();
    expect(result.clipped).toBe(true);
  });

  it("cannot be reached for a nonexistent file", async () => {
    // Absence is the observation's answer, not the projection's. readRange no
    // longer takes a filesystem, so there is no path on which it could invent
    // a NOT_FOUND for a file it was never given. RepoWorkspace.readRange
    // covers the result shape a caller actually sees.
    await expect(observe(fs, "/virtual/nope.ts")).rejects.toThrow();
  });

  it("returns error for invalid range (start > end)", async () => {
    const result = readRange(await observe(fs, "/virtual/small.ts"), 10, 5);
    expect(result.reason).toBeDefined();
  });

  it("includes path in result", async () => {
    const filePath = "/virtual/medium.ts";
    const result = readRange(await observe(fs, filePath), 1, 5);
    expect(result.path).toBe(filePath);
  });
});
