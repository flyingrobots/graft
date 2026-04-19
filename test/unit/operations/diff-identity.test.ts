import { describe, it, expect } from "vitest";
import { enrichDiffWithIdentity, type IdentityResolver } from "../../../src/operations/diff-identity.js";
import { DiffEntry, OutlineDiff, DiffContinuity } from "../../../src/parser/diff.js";
import type { GraftDiffResult } from "../../../src/operations/graft-diff.js";

/**
 * Build an IdentityResolver backed by a static lookup table.
 * Files not in the table return empty identity maps.
 */
function mockResolver(
  identitiesByFile: Record<string, Record<string, string>>,
): IdentityResolver {
  return (filePath: string) => {
    const entries = identitiesByFile[filePath] ?? {};
    return Promise.resolve(new Map(Object.entries(entries)));
  };
}

function makeDiffResult(files: GraftDiffResult["files"]): GraftDiffResult {
  return { base: "HEAD~1", head: "HEAD", files };
}

describe("operations: diff identity enrichment", () => {
  it("attaches identityId to added entries when WARP has indexed identity", async () => {
    const diff = new OutlineDiff({
      added: [new DiffEntry({ name: "greet", kind: "function" })],
      removed: [],
      changed: [],
      unchangedCount: 0,
    });
    const result = makeDiffResult([{ path: "a.ts", status: "added", summary: "", diff }]);
    const resolve = mockResolver({ "a.ts": { greet: "sid:abc123" } });

    const enriched = await enrichDiffWithIdentity(result, resolve);

    expect(enriched.files[0]!.diff.added[0]!.identityId).toBe("sid:abc123");
  });

  it("attaches identityId to removed entries", async () => {
    const diff = new OutlineDiff({
      added: [],
      removed: [new DiffEntry({ name: "obsolete", kind: "function" })],
      changed: [],
      unchangedCount: 0,
    });
    const result = makeDiffResult([{ path: "b.ts", status: "deleted", summary: "", diff }]);
    const resolve = mockResolver({ "b.ts": { obsolete: "sid:def456" } });

    const enriched = await enrichDiffWithIdentity(result, resolve);

    expect(enriched.files[0]!.diff.removed[0]!.identityId).toBe("sid:def456");
  });

  it("attaches identityId to changed entries while preserving Level 1 address truth", async () => {
    const diff = new OutlineDiff({
      added: [],
      removed: [],
      changed: [new DiffEntry({
        name: "process",
        kind: "function",
        signature: "process(x: number): string",
        oldSignature: "process(x: number): number",
      })],
      unchangedCount: 1,
    });
    const result = makeDiffResult([{ path: "c.ts", status: "modified", summary: "", diff }]);
    const resolve = mockResolver({ "c.ts": { process: "sid:789aaa" } });

    const enriched = await enrichDiffWithIdentity(result, resolve);

    const entry = enriched.files[0]!.diff.changed[0]!;
    expect(entry.identityId).toBe("sid:789aaa");
    // Level 1 address truth preserved
    expect(entry.name).toBe("process");
    expect(entry.signature).toBe("process(x: number): string");
    expect(entry.oldSignature).toBe("process(x: number): number");
  });

  it("leaves entries without indexed identity unchanged (identityId undefined)", async () => {
    const diff = new OutlineDiff({
      added: [
        new DiffEntry({ name: "indexed", kind: "function" }),
        new DiffEntry({ name: "unindexed", kind: "function" }),
      ],
      removed: [],
      changed: [],
      unchangedCount: 0,
    });
    const result = makeDiffResult([{ path: "d.ts", status: "added", summary: "", diff }]);
    const resolve = mockResolver({ "d.ts": { indexed: "sid:only_one" } });

    const enriched = await enrichDiffWithIdentity(result, resolve);

    expect(enriched.files[0]!.diff.added[0]!.identityId).toBe("sid:only_one");
    expect(enriched.files[0]!.diff.added[1]!.identityId).toBeUndefined();
  });

  it("returns original result unchanged when resolver has no data for any file", async () => {
    const diff = new OutlineDiff({
      added: [new DiffEntry({ name: "foo", kind: "function" })],
      removed: [],
      changed: [],
      unchangedCount: 0,
    });
    const result = makeDiffResult([{ path: "e.ts", status: "added", summary: "", diff }]);
    const resolve = mockResolver({});

    const enriched = await enrichDiffWithIdentity(result, resolve);

    // Same reference — no allocation
    expect(enriched).toBe(result);
  });

  it("handles multiple files with mixed identity availability", async () => {
    const diff1 = new OutlineDiff({
      added: [new DiffEntry({ name: "alpha", kind: "function" })],
      removed: [],
      changed: [],
      unchangedCount: 0,
    });
    const diff2 = new OutlineDiff({
      added: [new DiffEntry({ name: "beta", kind: "function" })],
      removed: [],
      changed: [],
      unchangedCount: 0,
    });
    const result = makeDiffResult([
      { path: "indexed.ts", status: "added", summary: "", diff: diff1 },
      { path: "unindexed.ts", status: "added", summary: "", diff: diff2 },
    ]);
    const resolve = mockResolver({ "indexed.ts": { alpha: "sid:aaa" } });

    const enriched = await enrichDiffWithIdentity(result, resolve);

    expect(enriched.files[0]!.diff.added[0]!.identityId).toBe("sid:aaa");
    expect(enriched.files[1]!.diff.added[0]!.identityId).toBeUndefined();
  });

  it("preserves continuity hints alongside identity enrichment", async () => {
    const diff = new OutlineDiff({
      added: [new DiffEntry({ name: "welcome", kind: "function", signature: "welcome(name: string): string" })],
      removed: [new DiffEntry({ name: "greet", kind: "function", signature: "greet(name: string): string" })],
      changed: [],
      continuity: [new DiffContinuity({
        kind: "rename",
        confidence: "likely",
        basis: "matching_signature_shape",
        symbolKind: "function",
        oldName: "greet",
        newName: "welcome",
      })],
      unchangedCount: 0,
    });
    const result = makeDiffResult([{ path: "f.ts", status: "modified", summary: "", diff }]);
    const resolve = mockResolver({
      "f.ts": {
        welcome: "sid:new_identity",
        greet: "sid:old_identity",
      },
    });

    const enriched = await enrichDiffWithIdentity(result, resolve);

    expect(enriched.files[0]!.diff.added[0]!.identityId).toBe("sid:new_identity");
    expect(enriched.files[0]!.diff.removed[0]!.identityId).toBe("sid:old_identity");
    // Continuity preserved
    expect(enriched.files[0]!.diff.continuity).toHaveLength(1);
    expect(enriched.files[0]!.diff.continuity[0]!.oldName).toBe("greet");
    expect(enriched.files[0]!.diff.continuity[0]!.newName).toBe("welcome");
  });

  it("preserves childDiff on changed entries during enrichment", async () => {
    const childDiff = new OutlineDiff({
      added: [new DiffEntry({ name: "newMethod", kind: "function" })],
      removed: [],
      changed: [],
      unchangedCount: 1,
    });
    const diff = new OutlineDiff({
      added: [],
      removed: [],
      changed: [new DiffEntry({ name: "MyClass", kind: "class", childDiff })],
      unchangedCount: 0,
    });
    const result = makeDiffResult([{ path: "g.ts", status: "modified", summary: "", diff }]);
    const resolve = mockResolver({ "g.ts": { MyClass: "sid:class_id" } });

    const enriched = await enrichDiffWithIdentity(result, resolve);

    const entry = enriched.files[0]!.diff.changed[0]!;
    expect(entry.identityId).toBe("sid:class_id");
    expect(entry.childDiff).toBeDefined();
    expect(entry.childDiff!.added).toHaveLength(1);
    expect(entry.childDiff!.added[0]!.name).toBe("newMethod");
  });
});
