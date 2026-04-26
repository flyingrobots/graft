import { describe, expect, it } from "vitest";
import { normalizeVitestArgs } from "../../../scripts/isolated-test-args.js";

describe("isolated test argument normalization", () => {
  it("strips the pnpm argument separator before forwarding to Vitest", () => {
    expect(normalizeVitestArgs(["--", "test/unit/example.test.ts"])).toEqual([
      "test/unit/example.test.ts",
    ]);
  });

  it("preserves direct Vitest arguments", () => {
    expect(normalizeVitestArgs(["test/unit/example.test.ts", "--runInBand"])).toEqual([
      "test/unit/example.test.ts",
      "--runInBand",
    ]);
  });
});
