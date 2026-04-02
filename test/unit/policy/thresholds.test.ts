import { describe, it, expect } from "vitest";
import { evaluatePolicy } from "../../../src/policy/evaluate.js";
import type { PolicyResult } from "../../../src/policy/types.js";

describe("policy: dual threshold", () => {
  it("allows files under both line and byte thresholds", () => {
    const result: PolicyResult = evaluatePolicy({
      path: "src/small.ts",
      lines: 50,
      bytes: 2000,
    });
    expect(result.projection).toBe("content");
    expect(result.reason).toBe("CONTENT");
  });

  it("triggers outline when line threshold exceeded (150 lines)", () => {
    const result: PolicyResult = evaluatePolicy({
      path: "src/large.ts",
      lines: 200,
      bytes: 8000,
    });
    expect(result.projection).toBe("outline");
    expect(result.reason).toBe("OUTLINE");
  });

  it("triggers outline when byte threshold exceeded (12 KB)", () => {
    const result: PolicyResult = evaluatePolicy({
      path: "src/dense.ts",
      lines: 80,
      bytes: 15000,
    });
    expect(result.projection).toBe("outline");
    expect(result.reason).toBe("OUTLINE");
  });

  it("triggers outline when both thresholds exceeded", () => {
    const result: PolicyResult = evaluatePolicy({
      path: "src/huge.ts",
      lines: 500,
      bytes: 50000,
    });
    expect(result.projection).toBe("outline");
    expect(result.reason).toBe("OUTLINE");
  });

  it("allows files at exactly the line threshold (150)", () => {
    const result: PolicyResult = evaluatePolicy({
      path: "src/edge.ts",
      lines: 150,
      bytes: 5000,
    });
    expect(result.projection).toBe("content");
    expect(result.reason).toBe("CONTENT");
  });

  it("allows files at exactly the byte threshold (12288)", () => {
    const result: PolicyResult = evaluatePolicy({
      path: "src/edge.ts",
      lines: 50,
      bytes: 12288,
    });
    expect(result.projection).toBe("content");
    expect(result.reason).toBe("CONTENT");
  });

  it("triggers outline at line threshold + 1", () => {
    const result: PolicyResult = evaluatePolicy({
      path: "src/edge.ts",
      lines: 151,
      bytes: 5000,
    });
    expect(result.projection).toBe("outline");
  });

  it("triggers outline at byte threshold + 1", () => {
    const result: PolicyResult = evaluatePolicy({
      path: "src/edge.ts",
      lines: 50,
      bytes: 12289,
    });
    expect(result.projection).toBe("outline");
  });

  it("includes actual dimensions in result", () => {
    const result: PolicyResult = evaluatePolicy({
      path: "src/file.ts",
      lines: 200,
      bytes: 15000,
    });
    expect(result.actual).toEqual({ lines: 200, bytes: 15000 });
  });

  it("includes threshold values in result", () => {
    const result: PolicyResult = evaluatePolicy({
      path: "src/file.ts",
      lines: 50,
      bytes: 2000,
    });
    expect(result.thresholds).toEqual({ lines: 150, bytes: 12288 });
  });
});
