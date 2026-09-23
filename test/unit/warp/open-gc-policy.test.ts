/**
 * The AST graph must open with compaction enabled.
 *
 * git-warp ships auto-GC disabled, so a graph opened with defaults never
 * compacts — the daemon accumulated tombstones and property registers for
 * ten days without a single GC run.
 */

import { describe, expect, it } from "vitest";
import { WARP_GC_POLICY } from "../../../src/warp/open.js";

describe("WARP GC policy", () => {
  it("enables automatic compaction", () => {
    expect(WARP_GC_POLICY.enabled).toBe(true);
    expect(WARP_GC_POLICY.compactOnCheckpoint).toBe(true);
  });

  it("uses thresholds tighter than the library defaults", () => {
    // git-warp 16 defaults: ratio 0.3, entries 50_000, patches 1_000.
    expect(WARP_GC_POLICY.tombstoneRatioThreshold).toBeLessThan(0.3);
    expect(WARP_GC_POLICY.entryCountThreshold).toBeLessThan(50_000);
    expect(WARP_GC_POLICY.minPatchesSinceCompaction).toBeLessThan(1_000);
  });

  it("names the fields the installed git-warp major accepts", async () => {
    // A renamed field is silently ignored, which would leave GC misconfigured
    // while every assertion above still passed. Check against the shipped
    // declaration rather than trusting the spelling.
    const declaration = await import("node:fs/promises").then((fs) => fs.readFile(
      new URL("../../../node_modules/@git-stunts/git-warp/index.d.ts", import.meta.url),
      "utf8",
    ));
    const gcPolicyBlock = /gcPolicy\?: \{([^}]*)\}/.exec(declaration)?.[1] ?? "";

    expect(gcPolicyBlock).not.toBe("");
    for (const field of Object.keys(WARP_GC_POLICY)) {
      expect(gcPolicyBlock).toContain(field);
    }
  });
});
