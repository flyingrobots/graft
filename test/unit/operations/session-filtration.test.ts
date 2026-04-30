import { describe, it, expect } from "vitest";
import {
  computeFiltrationLevel,
  shouldEscalateDetail,
} from "../../../src/operations/session-filtration.js";

describe("operations: session-filtration", () => {
  describe("computeFiltrationLevel", () => {
    it("returns 0 for a fresh session with no observations", () => {
      expect(computeFiltrationLevel({ observedFiles: 0, totalFiles: 100, reReadCount: 0 })).toBe(0);
    });

    it("increases with more observed files", () => {
      const low = computeFiltrationLevel({ observedFiles: 5, totalFiles: 100, reReadCount: 0 });
      const high = computeFiltrationLevel({ observedFiles: 50, totalFiles: 100, reReadCount: 0 });
      expect(high).toBeGreaterThan(low);
    });

    it("increases with re-reads", () => {
      const noReread = computeFiltrationLevel({ observedFiles: 10, totalFiles: 100, reReadCount: 0 });
      const withReread = computeFiltrationLevel({ observedFiles: 10, totalFiles: 100, reReadCount: 5 });
      expect(withReread).toBeGreaterThan(noReread);
    });

    it("caps at 1.0", () => {
      const level = computeFiltrationLevel({ observedFiles: 100, totalFiles: 100, reReadCount: 50 });
      expect(level).toBeLessThanOrEqual(1);
    });
  });

  describe("shouldEscalateDetail", () => {
    it("escalates when filtration is high and file was previously outlined", () => {
      const result = shouldEscalateDetail({
        filtrationLevel: 0.7,
        previousProjection: "outline",
        readCount: 2,
      });

      expect(result.escalate).toBe(true);
      expect(result.suggestedProjection).toBe("content");
    });

    it("does not escalate on first read", () => {
      const result = shouldEscalateDetail({
        filtrationLevel: 0.5,
        previousProjection: "outline",
        readCount: 1,
      });

      expect(result.escalate).toBe(false);
    });

    it("does not escalate at low filtration", () => {
      const result = shouldEscalateDetail({
        filtrationLevel: 0.1,
        previousProjection: "outline",
        readCount: 3,
      });

      expect(result.escalate).toBe(false);
    });

    it("does not escalate when already at content", () => {
      const result = shouldEscalateDetail({
        filtrationLevel: 0.8,
        previousProjection: "content",
        readCount: 3,
      });

      expect(result.escalate).toBe(false);
    });
  });
});
