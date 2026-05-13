import { describe, expect, it } from "vitest";
import {
  applyIsolatedVitestDefaults,
  normalizeVitestArgs,
} from "../../../scripts/isolated-test-args.js";

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

  it("bounds release-grade isolated Vitest worker concurrency by default", () => {
    expect(applyIsolatedVitestDefaults(["test/unit/example.test.ts"])).toEqual([
      "test/unit/example.test.ts",
      "--maxWorkers",
      "2",
    ]);
  });

  it("does not override explicit isolated Vitest worker concurrency", () => {
    expect(applyIsolatedVitestDefaults([
      "test/unit/example.test.ts",
      "--maxWorkers",
      "4",
    ])).toEqual([
      "test/unit/example.test.ts",
      "--maxWorkers",
      "4",
    ]);
    expect(applyIsolatedVitestDefaults([
      "test/unit/example.test.ts",
      "--maxWorkers=50%",
    ])).toEqual([
      "test/unit/example.test.ts",
      "--maxWorkers=50%",
    ]);
  });
});
