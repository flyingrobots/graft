import { describe, expect, it } from "vitest";
import { compactObjectDefaults } from "../../../src/parser/extractors/common.js";

describe("parser extractor common helpers", () => {
  it("compacts only single-level object literal defaults", () => {
    expect(compactObjectDefaults("function config(opts = { a: 1, b: true }): void"))
      .toBe("function config(opts = {…}): void");

    expect(compactObjectDefaults("function config(opts = { nested: { a: 1 } }): void"))
      .toBe("function config(opts = { nested: { a: 1 } }): void");
  });
});
