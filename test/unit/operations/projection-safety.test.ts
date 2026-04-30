import { describe, it, expect } from "vitest";
import {
  checkProjectionSafety,
  getQuestionClass,
  getSafetyClassMetadata,
} from "../../../src/operations/projection-safety.js";

describe("operations: projection-safety", () => {
  describe("getQuestionClass", () => {
    it("classifies code_find as existence", () => {
      expect(getQuestionClass("code_find")).toBe("existence");
    });

    it("classifies file_outline as structure", () => {
      expect(getQuestionClass("file_outline")).toBe("structure");
    });

    it("classifies code_show as behavior", () => {
      expect(getQuestionClass("code_show")).toBe("behavior");
    });

    it("classifies safe_read as behavior", () => {
      expect(getQuestionClass("safe_read")).toBe("behavior");
    });

    it("classifies graft_map as structure", () => {
      expect(getQuestionClass("graft_map")).toBe("structure");
    });
  });

  describe("checkProjectionSafety", () => {
    it("returns null when projection is sufficient", () => {
      // code_find (existence) at outline → safe
      const warning = checkProjectionSafety("code_find", "outline");
      expect(warning).toBeNull();
    });

    it("warns when outline is insufficient for behavior questions", () => {
      // code_show (behavior) at outline → warning
      const warning = checkProjectionSafety("code_show", "outline");
      expect(warning).not.toBeNull();
      expect(warning?.requiredProjection).toBe("content");
      expect(warning?.questionClass).toBe("behavior");
    });

    it("returns null for behavior questions at content level", () => {
      const warning = checkProjectionSafety("safe_read", "content");
      expect(warning).toBeNull();
    });

    it("returns null for structure questions at outline level", () => {
      const warning = checkProjectionSafety("file_outline", "outline");
      expect(warning).toBeNull();
    });
  });

  describe("getSafetyClassMetadata", () => {
    it("returns question classes answerable at outline level", () => {
      const meta = getSafetyClassMetadata("outline");
      expect(meta.answerable).toContain("existence");
      expect(meta.answerable).toContain("structure");
      expect(meta.answerable).not.toContain("behavior");
    });

    it("returns all question classes at content level", () => {
      const meta = getSafetyClassMetadata("content");
      expect(meta.answerable).toContain("existence");
      expect(meta.answerable).toContain("structure");
      expect(meta.answerable).toContain("behavior");
    });
  });
});
