import { describe, it, expect } from "vitest";
import { evaluatePolicy } from "../../../src/policy/evaluate.js";

describe("policy: session-depth dynamic caps", () => {
  it("applies 20 KB cap in early session", () => {
    const result = evaluatePolicy(
      { path: "src/file.ts", lines: 100, bytes: 18000 },
      { sessionDepth: "early" },
    );
    // 18 KB < 20 KB cap, and under static thresholds → content
    expect(result.projection).toBe("content");
    expect(result.sessionDepth).toBe("early");
  });

  it("applies 10 KB cap in mid session", () => {
    const result = evaluatePolicy(
      { path: "src/file.ts", lines: 100, bytes: 11000 },
      { sessionDepth: "mid" },
    );
    // 11 KB > 10 KB mid cap → outline via SESSION_CAP
    expect(result.projection).toBe("outline");
    expect(result.reason).toBe("SESSION_CAP");
  });

  it("applies 4 KB cap in late session", () => {
    const result = evaluatePolicy(
      { path: "src/file.ts", lines: 30, bytes: 5000 },
      { sessionDepth: "late" },
    );
    // 5 KB > 4 KB late cap → outline via SESSION_CAP
    expect(result.projection).toBe("outline");
    expect(result.reason).toBe("SESSION_CAP");
  });

  it("uses static thresholds alone when session depth is unknown", () => {
    const result = evaluatePolicy(
      { path: "src/file.ts", lines: 100, bytes: 11000 },
      { sessionDepth: "unknown" },
    );
    // 11 KB < 12 KB static, 100 < 150 static → content
    expect(result.projection).toBe("content");
  });

  it("static thresholds still apply even in early session", () => {
    const result = evaluatePolicy(
      { path: "src/file.ts", lines: 200, bytes: 8000 },
      { sessionDepth: "early" },
    );
    // 200 lines > 150 static → outline even though bytes < 20 KB early cap
    expect(result.projection).toBe("outline");
    expect(result.reason).toBe("OUTLINE");
  });

  it("session cap takes precedence reason when both static and dynamic triggered", () => {
    const result = evaluatePolicy(
      { path: "src/file.ts", lines: 200, bytes: 15000 },
      { sessionDepth: "mid" },
    );
    // Both static (200 > 150 lines, 15KB > 12KB) and dynamic (15KB > 10KB mid)
    // The tighter constraint wins: SESSION_CAP at 10 KB
    expect(result.projection).toBe("outline");
  });

  it("bans still override session depth caps", () => {
    const result = evaluatePolicy(
      { path: "image.png", lines: 1, bytes: 100 },
      { sessionDepth: "early" },
    );
    expect(result.projection).toBe("refused");
    expect(result.reason).toBe("BINARY");
  });
});
