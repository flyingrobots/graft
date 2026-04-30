import { describe, it, expect } from "vitest";
import {
  computeFootprint,
  findParallelGroups,
  type ToolFootprint,
} from "../../../src/operations/footprint-parallelism.js";

describe("operations: footprint-parallelism", () => {
  describe("computeFootprint", () => {
    it("returns files and symbols touched by a tool call", () => {
      const fp = computeFootprint("safe_read", { path: "src/app.ts" });
      expect(fp.files).toContain("src/app.ts");
    });

    it("returns empty footprint for diagnostic tools", () => {
      const fp = computeFootprint("daemon_status", {});
      expect(fp.files).toEqual([]);
      expect(fp.symbols).toEqual([]);
    });
  });

  describe("findParallelGroups", () => {
    it("groups non-overlapping footprints as parallel", () => {
      const footprints: ToolFootprint[] = [
        { tool: "safe_read", files: ["a.ts"], symbols: [] },
        { tool: "safe_read", files: ["b.ts"], symbols: [] },
        { tool: "safe_read", files: ["c.ts"], symbols: [] },
      ];

      const groups = findParallelGroups(footprints);
      // All 3 can run in parallel — 1 group
      expect(groups.length).toBe(1);
      expect(groups[0]!.length).toBe(3);
    });

    it("serializes overlapping footprints", () => {
      const footprints: ToolFootprint[] = [
        { tool: "safe_read", files: ["a.ts"], symbols: [] },
        { tool: "safe_read", files: ["a.ts"], symbols: [] }, // overlaps with first
        { tool: "safe_read", files: ["b.ts"], symbols: [] },
      ];

      const groups = findParallelGroups(footprints);
      // First and third can be parallel; second conflicts with first
      expect(groups.length).toBe(2);
    });

    it("handles empty input", () => {
      const groups = findParallelGroups([]);
      expect(groups).toEqual([]);
    });

    it("treats symbol overlap as conflict", () => {
      const footprints: ToolFootprint[] = [
        { tool: "code_show", files: ["a.ts"], symbols: ["fn1"] },
        { tool: "code_show", files: ["b.ts"], symbols: ["fn1"] }, // same symbol
      ];

      const groups = findParallelGroups(footprints);
      expect(groups.length).toBe(2); // serialized
    });
  });
});
