import { describe, it, expect } from "vitest";
import {
  detectSemanticDrift,
  type ReadingPathEntry,
} from "../../../src/operations/semantic-drift.js";

describe("operations: semantic-drift", () => {
  it("detects drift when re-reading a file after reading related files", () => {
    const path: ReadingPathEntry[] = [
      { filePath: "src/server.ts", timestamp: "t1" },
      { filePath: "src/policy.ts", timestamp: "t2" },
      { filePath: "src/server.ts", timestamp: "t3" }, // re-read
    ];

    const relatedFiles: ReadonlyMap<string, readonly string[]> = new Map([
      ["src/server.ts", ["src/policy.ts", "src/context.ts"]],
    ]);

    const warnings = detectSemanticDrift(path, relatedFiles);
    expect(warnings.length).toBe(1);
    expect(warnings[0]!.filePath).toBe("src/server.ts");
    expect(warnings[0]!.intervening).toContain("src/policy.ts");
  });

  it("does not warn when re-reading after unrelated files", () => {
    const path: ReadingPathEntry[] = [
      { filePath: "src/server.ts", timestamp: "t1" },
      { filePath: "README.md", timestamp: "t2" },
      { filePath: "src/server.ts", timestamp: "t3" },
    ];

    const relatedFiles: ReadonlyMap<string, readonly string[]> = new Map([
      ["src/server.ts", ["src/policy.ts"]],
    ]);

    const warnings = detectSemanticDrift(path, relatedFiles);
    expect(warnings).toEqual([]);
  });

  it("does not warn on first read", () => {
    const path: ReadingPathEntry[] = [
      { filePath: "src/app.ts", timestamp: "t1" },
    ];

    const warnings = detectSemanticDrift(path, new Map());
    expect(warnings).toEqual([]);
  });

  it("detects multiple drift warnings in one session", () => {
    const path: ReadingPathEntry[] = [
      { filePath: "a.ts", timestamp: "t1" },
      { filePath: "b.ts", timestamp: "t2" },
      { filePath: "a.ts", timestamp: "t3" },
      { filePath: "c.ts", timestamp: "t4" },
      { filePath: "b.ts", timestamp: "t5" },
    ];

    const relatedFiles: ReadonlyMap<string, readonly string[]> = new Map([
      ["a.ts", ["b.ts"]],
      ["b.ts", ["c.ts"]],
    ]);

    const warnings = detectSemanticDrift(path, relatedFiles);
    expect(warnings.length).toBe(2);
  });
});
