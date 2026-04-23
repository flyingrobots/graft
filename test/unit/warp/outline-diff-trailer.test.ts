import { describe, it, expect } from "vitest";
import {
  formatStructuralDiffTrailer,
  parseStructuralDiffTrailer,
  type SymbolDiffEntry,
} from "../../../src/warp/outline-diff-trailer.js";

describe("warp: outline-diff-trailer", () => {
  describe("formatStructuralDiffTrailer", () => {
    it("formats added, removed, and changed symbols", () => {
      const entries: SymbolDiffEntry[] = [
        { name: "createServer", kind: "function", changeKind: "added" },
        { name: "OldHelper", kind: "class", changeKind: "removed" },
        { name: "processRequest", kind: "function", changeKind: "changed" },
      ];

      const trailer = formatStructuralDiffTrailer(entries);

      expect(trailer).toContain("Structural-Diff:");
      expect(trailer).toContain("added fn:createServer");
      expect(trailer).toContain("removed class:OldHelper");
      expect(trailer).toContain("changed fn:processRequest");
    });

    it("returns empty trailer for no structural changes", () => {
      const trailer = formatStructuralDiffTrailer([]);
      expect(trailer).toBe("");
    });

    it("truncates beyond a threshold", () => {
      const entries: SymbolDiffEntry[] = Array.from({ length: 50 }, (_, i) => ({
        name: `sym${i}`,
        kind: "function",
        changeKind: "added" as const,
      }));

      const trailer = formatStructuralDiffTrailer(entries, { maxEntries: 10 });
      expect(trailer).toContain("...");
      expect(trailer).toContain("50 total");
      // Should not list all 50
      expect(trailer.split(";").length).toBeLessThan(50);
    });
  });

  describe("parseStructuralDiffTrailer", () => {
    it("round-trips through format and parse", () => {
      const entries: SymbolDiffEntry[] = [
        { name: "serve", kind: "function", changeKind: "added" },
        { name: "Config", kind: "interface", changeKind: "removed" },
      ];

      const trailer = formatStructuralDiffTrailer(entries);
      const parsed = parseStructuralDiffTrailer(trailer);

      expect(parsed.length).toBe(2);
      expect(parsed[0]).toEqual({ name: "serve", kind: "function", changeKind: "added" });
      expect(parsed[1]).toEqual({ name: "Config", kind: "interface", changeKind: "removed" });
    });

    it("returns empty array for empty or missing trailer", () => {
      expect(parseStructuralDiffTrailer("")).toEqual([]);
      expect(parseStructuralDiffTrailer("No trailer here")).toEqual([]);
    });

    it("handles malformed entries gracefully", () => {
      const trailer = "Structural-Diff: added fn:valid; garbage; changed fn:also_valid";
      const parsed = parseStructuralDiffTrailer(trailer);

      // Should parse valid entries, skip garbage
      expect(parsed.length).toBe(2);
      expect(parsed[0]!.name).toBe("valid");
      expect(parsed[1]!.name).toBe("also_valid");
    });
  });
});
