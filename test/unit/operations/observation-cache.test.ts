import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { CanonicalJsonCodec } from "../../../src/adapters/canonical-json.js";
import { RepoWorkspace } from "../../../src/index.js";
import { ObservationCache, hashContent } from "../../../src/operations/observation-cache.js";
import { FakeFileSystem } from "../../helpers/fake-fs.js";

// Two realistic one-line files that collide under 32-bit FNV-1a, the hash the
// observation cache used before it identified content by SHA-256. Reproduce:
// both strings hash to the same FNV-1a value over UTF-16 code units.
const BEFORE = "export const limit = 33149;";
const AFTER = "export const limit = 908276;";

function workspaceOver(files: Record<string, string>): RepoWorkspace {
  return new RepoWorkspace({
    projectRoot: "/repo",
    fs: new FakeFileSystem(files),
    codec: new CanonicalJsonCodec(),
    resolvePath: (input) => `/repo/${input}`,
  });
}

describe("operations: observation cache content identity", () => {
  it("treats the colliding FNV-1a pair as changed content", () => {
    const cache = new ObservationCache(() => "2026-10-20T00:00:00.000Z");
    cache.record("/repo/limit.ts", hashContent(BEFORE), [], [], { lines: 1, bytes: BEFORE.length });

    const result = cache.check("/repo/limit.ts", AFTER);

    expect(result.hit).toBe(false);
    expect(result).toMatchObject({ hit: false, stale: { readCount: 1 } });
  });

  it("still recognizes byte-identical content as unchanged", () => {
    const cache = new ObservationCache(() => "2026-10-20T00:00:00.000Z");
    cache.record("/repo/limit.ts", hashContent(BEFORE), [], [], { lines: 1, bytes: BEFORE.length });

    expect(cache.check("/repo/limit.ts", BEFORE).hit).toBe(true);
  });

  it("identifies well-formed content by the SHA-256 of its UTF-8 bytes", () => {
    // The read path decodes observed bytes strictly and keeps any BOM, so this
    // is the SHA-256 of the observed bytes, the identity a delivery ledger uses.
    const samples = ["", BEFORE, AFTER, "\uFEFFconst é = '😀';\n", "x".repeat(70_000)];
    for (const sample of samples) {
      const expected = createHash("sha256").update(Buffer.from(sample, "utf8")).digest("hex");
      expect(hashContent(sample)).toBe(`sha256:${expected}`);
    }
  });

  it("does not alias a lone surrogate with the replacement character", () => {
    // UTF-8 encoding maps a lone surrogate to U+FFFD's bytes; content identity
    // must not inherit that alias for strings that are not well-formed.
    expect(hashContent("a\uD800b")).not.toBe(hashContent("a\uFFFDb"));
    expect(hashContent("a\uDC00b")).not.toBe(hashContent("a\uD800b"));
  });

  it("does not suppress a safe_read reread after a colliding edit", async () => {
    const files: Record<string, string> = { "/repo/limit.ts": `${BEFORE}\n` };
    const workspace = workspaceOver(files);

    const first = await workspace.safeRead({ path: "limit.ts" });
    expect(first.projection).toBe("content");
    const unchanged = await workspace.safeRead({ path: "limit.ts" });
    expect(unchanged).toMatchObject({ projection: "cache_hit", reason: "REREAD_UNCHANGED" });

    files["/repo/limit.ts"] = `${AFTER}\n`;
    const changed = await workspace.safeRead({ path: "limit.ts" });

    // A changed reread is answered with a diff against the prior observation,
    // never with REREAD_UNCHANGED.
    expect(changed.projection).toBe("diff");
    expect(changed).not.toMatchObject({ reason: "REREAD_UNCHANGED" });
  });

  it("does not serve a stale outline after a colliding edit", async () => {
    const files: Record<string, string> = { "/repo/limit.ts": `${BEFORE}\n` };
    const workspace = workspaceOver(files);

    await workspace.fileOutline({ path: "limit.ts" });
    const cached = await workspace.fileOutline({ path: "limit.ts" });
    expect(cached).toMatchObject({ cacheHit: true });

    files["/repo/limit.ts"] = `${AFTER}\n`;
    const changed = await workspace.fileOutline({ path: "limit.ts" });

    expect(changed).not.toMatchObject({ cacheHit: true });
  });
});
