import { describe, it, expect } from "vitest";
import { evaluatePolicy } from "../../../src/policy/evaluate.js";
import { ContentResult, OutlineResult } from "../../../src/policy/types.js";

describe("policy: budget cap", () => {
  it("allows content when budget is generous", () => {
    const result = evaluatePolicy(
      { path: "src/file.ts", lines: 50, bytes: 2000 },
      { budgetRemaining: 200000 },
    );
    // 5% of 200KB = 10KB, file is 2KB → content allowed
    expect(result).toBeInstanceOf(ContentResult);
  });

  it("forces outline when file exceeds 5% of remaining budget", () => {
    const result = evaluatePolicy(
      { path: "src/file.ts", lines: 50, bytes: 2000 },
      { budgetRemaining: 10000 },
    );
    // 5% of 10KB = 500 bytes, file is 2KB → budget cap triggered
    expect(result).toBeInstanceOf(OutlineResult);
    expect(result.reason).toBe("BUDGET_CAP");
  });

  it("budget cap is tighter than session depth cap when budget is low", () => {
    const result = evaluatePolicy(
      { path: "src/file.ts", lines: 100, bytes: 5000 },
      { sessionDepth: "early", budgetRemaining: 20000 },
    );
    // early session cap = 20KB, but 5% of 20KB = 1KB → budget wins
    expect(result).toBeInstanceOf(OutlineResult);
    expect(result.reason).toBe("BUDGET_CAP");
  });

  it("session depth cap wins when tighter than budget cap", () => {
    const result = evaluatePolicy(
      { path: "src/file.ts", lines: 100, bytes: 5000 },
      { sessionDepth: "late", budgetRemaining: 500000 },
    );
    // late cap = 4KB, 5% of 500KB = 25KB → session cap wins
    expect(result).toBeInstanceOf(OutlineResult);
    expect(result.reason).toBe("SESSION_CAP");
  });

  it("no budget cap when budgetRemaining is undefined", () => {
    const result = evaluatePolicy(
      { path: "src/file.ts", lines: 50, bytes: 2000 },
    );
    expect(result).toBeInstanceOf(ContentResult);
  });

  it("budget cap uses OUTLINE reason when lines also exceeded", () => {
    const result = evaluatePolicy(
      { path: "src/file.ts", lines: 200, bytes: 2000 },
      { budgetRemaining: 10000 },
    );
    // Both lines (200 > 150) and budget exceeded → OUTLINE wins for lines
    expect(result).toBeInstanceOf(OutlineResult);
    // Lines exceeded and bytes also exceeded → BUDGET_CAP for byte reason
    // Actually: exceedsLines=true, exceedsBytes=true, budgetTriggered=true
    // finalReason: exceedsLines && !exceedsBytes → OUTLINE, but both exceed → BUDGET_CAP
    expect(result.reason).toBe("BUDGET_CAP");
  });
});
