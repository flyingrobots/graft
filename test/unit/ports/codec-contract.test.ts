import { describe, it, expect } from "vitest";
import { CanonicalJsonCodec } from "../../../src/adapters/canonical-json.js";
import { assertJsonCodec } from "../../../src/ports/guards.js";

describe("ports: JsonCodec contract (CanonicalJsonCodec)", () => {
  const codec = new CanonicalJsonCodec();

  it("passes the runtime guard", () => {
    assertJsonCodec(codec);
  });

  it("encode returns a string", () => {
    const result = codec.encode({ a: 1 });
    expect(typeof result).toBe("string");
  });

  it("decode returns the original value", () => {
    const result = codec.decode('{"a":1}');
    expect(result).toEqual({ a: 1 });
  });

  it("round-trips objects", () => {
    const original = { z: [1, 2, 3], a: { nested: true } };
    const encoded = codec.encode(original);
    const decoded = codec.decode(encoded);
    expect(decoded).toEqual(original);
  });

  it("round-trips primitives", () => {
    for (const value of [42, "hello", true, null]) {
      const decoded = codec.decode(codec.encode(value));
      expect(decoded).toEqual(value);
    }
  });

  it("encode handles empty structures", () => {
    expect(typeof codec.encode({})).toBe("string");
    expect(typeof codec.encode([])).toBe("string");
  });

  it("decode throws on invalid input", () => {
    expect(() => codec.decode("not json")).toThrow();
  });
});
