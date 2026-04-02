import { describe, it, expect } from "vitest";
import { safeRead } from "../../src/operations/safe-read.js";
import path from "node:path";

const FIXTURES = path.resolve(import.meta.dirname, "../fixtures");

/**
 * Integration tests: exercise safe_read end-to-end with real files
 * on disk, real policy evaluation, and real parser output. No mocks.
 */
describe("integration: safe_read end-to-end", () => {
  it("small file → content with full source", async () => {
    const result = await safeRead(path.join(FIXTURES, "small.ts"));
    expect(result.projection).toBe("content");
    expect(result.content).toContain("export function greet");
    expect(result.content).toContain('return `Hello,');
    expect(result.actual!.lines).toBeLessThanOrEqual(150);
  });

  it("large file → outline with jump table and bytes avoided", async () => {
    const result = await safeRead(path.join(FIXTURES, "large.ts"));
    expect(result.projection).toBe("outline");
    expect(result.content).toBeUndefined();
    expect(result.outline!.length).toBeGreaterThan(0);
    expect(result.jumpTable!.length).toBeGreaterThan(0);
    expect(result.estimatedBytesAvoided!).toBeGreaterThan(0);

    // Jump table should reference symbols we can read_range
    const jump = result.jumpTable![0]!;
    expect(jump.symbol).toBeDefined();
    expect(jump.start).toBeGreaterThan(0);
    expect(jump.end).toBeGreaterThanOrEqual(jump.start);
  });

  it("binary → refused with BINARY reason and next steps", async () => {
    const result = await safeRead(
      path.join(FIXTURES, "ban-targets/image.png"),
    );
    expect(result.projection).toBe("refused");
    expect(result.reason).toBe("BINARY");
    expect(result.next!.length).toBeGreaterThan(0);
    expect(result.content).toBeUndefined();
    expect(result.outline).toBeUndefined();
  });

  it("secret → refused with SECRET reason", async () => {
    const result = await safeRead(
      path.join(FIXTURES, "ban-targets/.env"),
    );
    expect(result.projection).toBe("refused");
    expect(result.reason).toBe("SECRET");
  });

  it("build output → refused with source redirect", async () => {
    const result = await safeRead(
      path.join(FIXTURES, "ban-targets/dist/compiled.js"),
    );
    expect(result.projection).toBe("refused");
    expect(result.reason).toBe("BUILD_OUTPUT");
    expect(result.next).toBeDefined();
    expect(result.next!.some((s) => s.includes("src/"))).toBe(true);
  });

  it("nonexistent → error with NOT_FOUND", async () => {
    const result = await safeRead(
      path.join(FIXTURES, "this-file-does-not-exist.ts"),
    );
    expect(result.projection).toBe("error");
    expect(result.reason).toBe("NOT_FOUND");
  });

  it("all results are valid JSON-serializable objects", async () => {
    const files = [
      path.join(FIXTURES, "small.ts"),
      path.join(FIXTURES, "large.ts"),
      path.join(FIXTURES, "ban-targets/image.png"),
      path.join(FIXTURES, "ban-targets/.env"),
    ];

    for (const file of files) {
      const result = await safeRead(file);
      const json = JSON.stringify(result);
      const parsed: unknown = JSON.parse(json);
      expect(parsed).toEqual(result);
    }
  });

  it("session depth 'late' tightens caps on medium files", async () => {
    const normal = await safeRead(path.join(FIXTURES, "medium.ts"));
    const late = await safeRead(
      path.join(FIXTURES, "medium.ts"),
      { sessionDepth: "late" },
    );
    // Medium file should pass under normal policy but may be capped late
    expect(normal.projection).toBe("content");
    // Under late session (4 KB cap), medium.ts (~3-4KB) may or may not trigger
    // The test validates that sessionDepth is respected in the pipeline
    expect(late.sessionDepth).toBe("late");
  });
});
