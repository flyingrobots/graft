import { describe, it, expect } from "vitest";
import { CanonicalJsonCodec } from "../../../src/adapters/canonical-json.js";

describe("CanonicalJsonCodec", () => {
  const codec = new CanonicalJsonCodec();

  describe("encode", () => {
    it("sorts top-level object keys", () => {
      const result = codec.encode({ z: 1, a: 2, m: 3 });
      expect(result).toBe('{"a":2,"m":3,"z":1}');
    });

    it("sorts nested object keys recursively", () => {
      const result = codec.encode({ b: { z: 1, a: 2 }, a: 1 });
      expect(result).toBe('{"a":1,"b":{"a":2,"z":1}}');
    });

    it("preserves array element order", () => {
      const result = codec.encode({ items: [3, 1, 2] });
      expect(result).toBe('{"items":[3,1,2]}');
    });

    it("sorts objects inside arrays", () => {
      const result = codec.encode([{ z: 1, a: 2 }, { b: 3, a: 4 }]);
      expect(result).toBe('[{"a":2,"z":1},{"a":4,"b":3}]');
    });

    it("handles null values", () => {
      const result = codec.encode({ b: null, a: 1 });
      expect(result).toBe('{"a":1,"b":null}');
    });

    it("handles primitives directly", () => {
      expect(codec.encode(42)).toBe("42");
      expect(codec.encode("hello")).toBe('"hello"');
      expect(codec.encode(true)).toBe("true");
      expect(codec.encode(null)).toBe("null");
    });

    it("produces compact output with no whitespace", () => {
      const result = codec.encode({ a: { b: [1, 2] } });
      expect(result).not.toContain(" ");
      expect(result).not.toContain("\n");
    });

    it("is deterministic — same input always produces same output", () => {
      const obj = { c: 3, a: 1, b: { z: 26, y: 25 } };
      const first = codec.encode(obj);
      const second = codec.encode(obj);
      expect(first).toBe(second);
    });

    it("produces identical output regardless of key insertion order", () => {
      const a = { x: 1, y: 2, z: 3 };
      const b = { z: 3, x: 1, y: 2 };
      expect(codec.encode(a)).toBe(codec.encode(b));
    });

    it("handles empty objects and arrays", () => {
      expect(codec.encode({})).toBe("{}");
      expect(codec.encode([])).toBe("[]");
      expect(codec.encode({ a: {}, b: [] })).toBe('{"a":{},"b":[]}');
    });

    it("handles deeply nested structures", () => {
      const deep = { c: { b: { a: { z: 1 } } } };
      expect(codec.encode(deep)).toBe('{"c":{"b":{"a":{"z":1}}}}');
    });
  });

  describe("decode", () => {
    it("parses valid JSON", () => {
      expect(codec.decode('{"a":1}')).toEqual({ a: 1 });
    });

    it("throws on invalid JSON", () => {
      expect(() => codec.decode("not json")).toThrow();
    });
  });

  describe("non-plain objects", () => {
    it("preserves Date via toJSON", () => {
      const date = new Date("2026-01-01T00:00:00.000Z");
      const result = codec.encode({ ts: date });
      expect(result).toContain("2026-01-01T00:00:00.000Z");
    });

    it("throws on circular references", () => {
      const a: Record<string, unknown> = {};
      a["self"] = a;
      expect(() => codec.encode(a)).toThrow("circular");
    });
  });

  describe("round-trip", () => {
    it("decode(encode(value)) preserves data", () => {
      const original = { z: [1, 2], a: { nested: true } };
      const roundTripped = codec.decode(codec.encode(original));
      expect(roundTripped).toEqual(original);
    });
  });
});
