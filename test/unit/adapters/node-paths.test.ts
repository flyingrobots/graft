import { describe, it, expect } from "vitest";
import { nodePathOps } from "../../../src/adapters/node-paths.js";

describe("adapters: node-paths", () => {
  describe("normalize", () => {
    it("strips trailing slashes", () => {
      expect(nodePathOps.normalize("src/warp/")).toBe("src/warp");
    });

    it("collapses double slashes", () => {
      expect(nodePathOps.normalize("src//warp")).toBe("src/warp");
    });

    it("resolves parent references", () => {
      expect(nodePathOps.normalize("src/warp/../parser")).toBe("src/parser");
    });

    it("passes through already-clean paths", () => {
      expect(nodePathOps.normalize("src/warp")).toBe("src/warp");
    });

    it("preserves root slash", () => {
      expect(nodePathOps.normalize("/")).toBe("/");
    });
  });

  describe("isWithin", () => {
    it("returns true for exact file match", () => {
      expect(nodePathOps.isWithin("src/a.ts", "src/a.ts")).toBe(true);
    });

    it("returns true for file inside directory", () => {
      expect(nodePathOps.isWithin("src/warp/foo.ts", "src/warp")).toBe(true);
    });

    it("returns false for file outside directory", () => {
      expect(nodePathOps.isWithin("lib/foo.ts", "src")).toBe(false);
    });

    it("returns false for partial prefix match", () => {
      expect(nodePathOps.isWithin("src/warped/foo.ts", "src/warp")).toBe(false);
    });

    it("handles trailing slash on directory", () => {
      expect(nodePathOps.isWithin("src/warp/foo.ts", "src/warp/")).toBe(true);
    });

    it("handles unnormalized paths", () => {
      expect(nodePathOps.isWithin("src//warp/foo.ts", "src/warp")).toBe(true);
    });

    it("handles parent references in paths", () => {
      expect(nodePathOps.isWithin("src/warp/../warp/foo.ts", "src/warp")).toBe(true);
    });
  });

  describe("join", () => {
    it("joins segments with forward slashes", () => {
      expect(nodePathOps.join("src", "warp", "foo.ts")).toBe("src/warp/foo.ts");
    });

    it("normalizes the result", () => {
      expect(nodePathOps.join("src/", "/warp")).toBe("src/warp");
    });
  });
});
