import { describe, it, expect } from "vitest";
import { evaluatePolicy } from "../../../src/policy/evaluate.js";
import { loadGraftignore } from "../../../src/policy/graftignore.js";

describe("policy: .graftignore", () => {
  it("refuses files matching .graftignore patterns", () => {
    const patterns = loadGraftignore("*.generated.ts\n*.snap\n");
    const result = evaluatePolicy(
      { path: "auto.generated.ts", lines: 10, bytes: 500 },
      { graftignorePatterns: patterns },
    );
    expect(result.projection).toBe("refused");
    expect(result.reason).toBe("GRAFTIGNORE");
  });

  it("allows files not matching .graftignore patterns", () => {
    const patterns = loadGraftignore("*.generated.ts\n");
    const result = evaluatePolicy(
      { path: "src/index.ts", lines: 10, bytes: 500 },
      { graftignorePatterns: patterns },
    );
    expect(result.projection).toBe("content");
  });

  it("supports directory patterns in .graftignore", () => {
    const patterns = loadGraftignore("vendor/**\n");
    const result = evaluatePolicy(
      { path: "vendor/lib/util.js", lines: 10, bytes: 500 },
      { graftignorePatterns: patterns },
    );
    expect(result.projection).toBe("refused");
    expect(result.reason).toBe("GRAFTIGNORE");
  });

  it("ignores blank lines and comments in .graftignore", () => {
    const patterns = loadGraftignore("# a comment\n\n*.snap\n");
    expect(patterns.length).toBe(1);
  });

  it("returns empty array for missing .graftignore", () => {
    const patterns = loadGraftignore("");
    expect(patterns).toEqual([]);
  });
});
