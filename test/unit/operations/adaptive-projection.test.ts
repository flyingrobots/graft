import { describe, it, expect } from "vitest";
import {
  selectProjection,
} from "../../../src/operations/adaptive-projection.js";

describe("operations: adaptive-projection-selection", () => {
  it("selects outline for large dense files", () => {
    const result = selectProjection({
      fileLines: 500,
      fileBytes: 15000,
      symbolCount: 30,
      outlineCompressionRatio: 0.15,
    });

    expect(result.projection).toBe("outline");
  });

  it("selects content for small config files", () => {
    const result = selectProjection({
      fileLines: 10,
      fileBytes: 200,
      symbolCount: 1,
      outlineCompressionRatio: 0.9,
    });

    expect(result.projection).toBe("content");
  });

  it("selects range when a specific symbol is targeted", () => {
    const result = selectProjection({
      fileLines: 300,
      fileBytes: 10000,
      symbolCount: 20,
      outlineCompressionRatio: 0.2,
      targetSymbol: "handleRequest",
    });

    expect(result.projection).toBe("range");
  });

  it("selects content when compression ratio is near 1", () => {
    const result = selectProjection({
      fileLines: 30,
      fileBytes: 800,
      symbolCount: 5,
      outlineCompressionRatio: 0.85,
    });

    expect(result.projection).toBe("content");
  });

  it("includes reasoning in the result", () => {
    const result = selectProjection({
      fileLines: 200,
      fileBytes: 6000,
      symbolCount: 15,
      outlineCompressionRatio: 0.25,
    });

    expect(result.reason).toBeDefined();
    expect(result.reason.length).toBeGreaterThan(0);
  });
});
