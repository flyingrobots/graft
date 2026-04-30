import { describe, it, expect } from "vitest";
import {
  detectReadabilityHorizon,
} from "../../../src/operations/horizon-of-readability.js";

describe("operations: horizon-of-readability", () => {
  it("detects horizon when outline is nearly the same size as content", () => {
    const result = detectReadabilityHorizon({
      contentLines: 20,
      contentBytes: 500,
      outlineLines: 18,
      outlineBytes: 460,
    });

    expect(result.horizonReached).toBe(true);
    expect(result.compressionRatio).toBeGreaterThan(0.8);
    expect(result.recommendation).toBe("content");
  });

  it("does not detect horizon when outline is much smaller", () => {
    const result = detectReadabilityHorizon({
      contentLines: 200,
      contentBytes: 8000,
      outlineLines: 30,
      outlineBytes: 1200,
    });

    expect(result.horizonReached).toBe(false);
    expect(result.compressionRatio).toBeLessThan(0.5);
    expect(result.recommendation).toBe("outline");
  });

  it("returns content recommendation at the boundary", () => {
    // 75% compression ratio — right at the edge
    const result = detectReadabilityHorizon({
      contentLines: 40,
      contentBytes: 1000,
      outlineLines: 30,
      outlineBytes: 750,
    });

    expect(result.recommendation).toBe("content");
  });

  it("handles zero-size files gracefully", () => {
    const result = detectReadabilityHorizon({
      contentLines: 0,
      contentBytes: 0,
      outlineLines: 0,
      outlineBytes: 0,
    });

    expect(result.horizonReached).toBe(true);
    expect(result.recommendation).toBe("content");
  });
});
