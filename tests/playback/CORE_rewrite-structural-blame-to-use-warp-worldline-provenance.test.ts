import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");

function readRepoText(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8");
}

describe("CORE_rewrite-structural-blame-to-use-warp-worldline-provenance playback", () => {
  it("Can I run structural blame on a symbol and see creation last signature change change count and reference count after multiple indexed commits?", () => {
    const source = readRepoText("src/warp/warp-structural-blame.ts");
    const tests = readRepoText("test/unit/warp/warp-structural-blame.test.ts");

    expect(source).toContain("createdInCommit");
    expect(source).toContain("lastSignatureChange");
    expect(source).toContain("changeCount");
    expect(source).toContain("referenceCount");
    expect(tests).toContain("tracks signature changes in blame history");
    expect(tests).toContain("includes reference count from WARP graph");
  });

  it("Does the result come from WARP provenance rather than walking git commit history?", () => {
    const timeline = readRepoText("src/warp/symbol-timeline.ts");
    const blame = readRepoText("src/warp/warp-structural-blame.ts");

    expect(timeline).toContain("patchesFor(symId)");
    expect(timeline).toContain("loadPatchBySha");
    expect(blame).not.toContain("GitClient");
    expect(blame).not.toContain(".run({ args: [\"log\"");
  });

  it("Does symbol timeline lookup ask WARP provenance for patches that touched a symbol id?", () => {
    const timeline = readRepoText("src/warp/symbol-timeline.ts");
    const tests = readRepoText("test/unit/warp/symbol-timeline.test.ts");

    expect(timeline).toContain("const patchShas = await core.patchesFor(symId)");
    expect(tests).toContain("expect(entityId).toBe(\"sym:src/app.ts:thing\")");
  });

  it("Does symbol timeline hydration seek a worldline to the touching patch tick before reading symbol properties?", () => {
    const timeline = readRepoText("src/warp/symbol-timeline.ts");
    const tests = readRepoText("test/unit/warp/symbol-timeline.test.ts");

    expect(timeline).toContain("ctx.app.worldline().seek");
    expect(timeline).toContain("ceiling: tick");
    expect(timeline).toContain("worldline.getNodeProps(symId)");
    expect(tests).toContain("expect(seekCeilings).toEqual([7, 9])");
  });

  it("Does the structural-blame MCP path still make zero GitClient calls?", () => {
    const tool = readRepoText("src/mcp/tools/structural-blame.ts");
    const blame = readRepoText("src/warp/warp-structural-blame.ts");

    expect(tool).toContain("structuralBlameFromGraph");
    expect(tool).not.toContain("GitClient");
    expect(tool).not.toContain("git.run");
    expect(blame).not.toContain("GitClient");
    expect(blame).not.toContain("git.run");
  });
});
