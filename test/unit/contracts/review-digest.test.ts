import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { CanonicalJsonCodec } from "../../../src/adapters/canonical-json.js";
import { canonicalJsonSha256Review } from "../../../src/contracts/review-digest.js";

const CODEC = new CanonicalJsonCodec();

function oracleDigest(domain: string, value: unknown): string {
  return `sha256:${createHash("sha256").update(CODEC.encode([domain, value])).digest("hex")}`;
}

describe("review digest contracts", () => {
  it("matches the canonical JSON SHA-256 oracle for valid JSON values", () => {
    const value = {
      b: [true, null, 3],
      a: {
        z: "last",
        first: "first",
      },
    };

    expect(canonicalJsonSha256Review("graft.test/v1", value)).toBe(oracleDigest("graft.test/v1", value));
  });

  it("rejects lossy non-JSON preimages before hashing", () => {
    expect(() => canonicalJsonSha256Review("graft.test/v1", { a: undefined })).toThrow(TypeError);
    expect(() => canonicalJsonSha256Review("graft.test/v1", [undefined])).toThrow(TypeError);
    expect(() => canonicalJsonSha256Review("graft.test/v1", Number.NaN)).toThrow(TypeError);
    expect(() => canonicalJsonSha256Review("graft.test/v1", Number.POSITIVE_INFINITY)).toThrow(TypeError);
    expect(() => canonicalJsonSha256Review("graft.test/v1", () => "x")).toThrow(TypeError);
    expect(() => canonicalJsonSha256Review("graft.test/v1", Symbol("x"))).toThrow(TypeError);
    expect(() => canonicalJsonSha256Review("graft.test/v1", 1n)).toThrow(TypeError);
    expect(() => canonicalJsonSha256Review("graft.test/v1", new Date(0))).toThrow(TypeError);
  });
});
