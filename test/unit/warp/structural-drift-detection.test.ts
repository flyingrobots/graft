import { describe, it, expect } from "vitest";
import {
  checkNumericClaim,
  checkPatternProhibition,

} from "../../../src/warp/structural-drift-detection.js";

describe("warp: structural-drift-detection", () => {
  describe("checkNumericClaim", () => {
    it("detects when a numeric claim is wrong", () => {
      const result = checkNumericClaim({
        docPath: "README.md",
        claim: "12 MCP tools",
        pattern: /(\d+)\s+MCP tools/,
        actual: 21,
      });

      expect(result.drifted).toBe(true);
      expect(result.expected).toBe("12");
      expect(result.actual).toBe("21");
      expect(result.docPath).toBe("README.md");
      expect(result.claim).toBe("12 MCP tools");
    });

    it("passes when a numeric claim matches", () => {
      const result = checkNumericClaim({
        docPath: "README.md",
        claim: "21 MCP tools",
        pattern: /(\d+)\s+MCP tools/,
        actual: 21,
      });

      expect(result.drifted).toBe(false);
    });

    it("reports drift when claim cannot be parsed", () => {
      const result = checkNumericClaim({
        docPath: "README.md",
        claim: "many MCP tools",
        pattern: /(\d+)\s+MCP tools/,
        actual: 21,
      });

      // Pattern didn't match — can't verify, report as drifted
      expect(result.drifted).toBe(true);
      expect(result.expected).toBe("no match");
    });
  });

  describe("checkPatternProhibition", () => {
    it("detects violation when prohibited pattern is found", () => {
      const files: Record<string, string> = {
        "src/app.ts": "const nodes = obs.getNodes();\n",
        "src/lib.ts": "export function clean(): void {}\n",
      };

      const result = checkPatternProhibition({
        docPath: "ARCHITECTURE.md",
        rule: "no getNodes calls in src/",
        pattern: /getNodes\(/,
        files,
      });

      expect(result.drifted).toBe(true);
      expect(result.violations.length).toBe(1);
      expect(result.violations[0]).toBe("src/app.ts");
    });

    it("passes when no violations found", () => {
      const files: Record<string, string> = {
        "src/app.ts": "const result = await query();\n",
        "src/lib.ts": "export function clean(): void {}\n",
      };

      const result = checkPatternProhibition({
        docPath: "ARCHITECTURE.md",
        rule: "no getNodes calls in src/",
        pattern: /getNodes\(/,
        files,
      });

      expect(result.drifted).toBe(false);
      expect(result.violations).toEqual([]);
    });

    it("reports all violating files", () => {
      const files: Record<string, string> = {
        "src/a.ts": "obs.getNodes();\n",
        "src/b.ts": "obs.getNodes();\n",
        "src/c.ts": "clean code\n",
      };

      const result = checkPatternProhibition({
        docPath: "ARCHITECTURE.md",
        rule: "no getNodes calls in src/",
        pattern: /getNodes\(/,
        files,
      });

      expect(result.drifted).toBe(true);
      expect(result.violations.sort()).toEqual(["src/a.ts", "src/b.ts"]);
    });
  });
});
