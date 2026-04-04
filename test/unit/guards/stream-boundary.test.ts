import { describe, it, expect } from "vitest";
import {
  isAsyncIterable,
  assertNotStream,
  assertStream,
  guardPortReturn,
} from "../../../src/guards/stream-boundary.js";

// Helper: create a real async iterable
function* syncGen(): Generator<number> {
  yield 1;
  yield 2;
}

function fakeStream(): AsyncIterable<number> {
  const gen = syncGen();
  return {
    [Symbol.asyncIterator]() {
      return {
        next() {
          return Promise.resolve(gen.next());
        },
      };
    },
  };
}

describe("stream-boundary guards", () => {
  describe("isAsyncIterable", () => {
    it("returns true for async iterables", () => {
      expect(isAsyncIterable(fakeStream())).toBe(true);
    });

    it("returns true for objects with Symbol.asyncIterator", () => {
      const obj = { [Symbol.asyncIterator]() { return this; } };
      expect(isAsyncIterable(obj)).toBe(true);
    });

    it("returns false for plain objects", () => {
      expect(isAsyncIterable({ a: 1 })).toBe(false);
    });

    it("returns false for arrays", () => {
      expect(isAsyncIterable([1, 2, 3])).toBe(false);
    });

    it("returns false for strings", () => {
      expect(isAsyncIterable("hello")).toBe(false);
    });

    it("returns false for null", () => {
      expect(isAsyncIterable(null)).toBe(false);
    });

    it("returns false for undefined", () => {
      expect(isAsyncIterable(undefined)).toBe(false);
    });

    it("returns false for Buffers", () => {
      expect(isAsyncIterable(Buffer.from("test"))).toBe(false);
    });

    it("returns false for Promises", () => {
      expect(isAsyncIterable(Promise.resolve(42))).toBe(false);
    });
  });

  describe("assertNotStream", () => {
    it("does nothing for plain values", () => {
      assertNotStream("hello", "test");
      assertNotStream(42, "test");
      assertNotStream({ a: 1 }, "test");
      assertNotStream(null, "test");
      assertNotStream(Buffer.from("x"), "test");
    });

    it("throws for async iterables", () => {
      expect(() => { assertNotStream(fakeStream(), "Port.read()"); }).toThrow(
        /Port\.read\(\) produced a stream/,
      );
    });

    it("includes context in error message", () => {
      expect(() => { assertNotStream(fakeStream(), "FileSystem.readFile()"); }).toThrow(
        "FileSystem.readFile()",
      );
    });

    it("throws TypeError, not generic Error", () => {
      try {
        assertNotStream(fakeStream(), "test");
        expect.unreachable("should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(TypeError);
      }
    });
  });

  describe("assertStream", () => {
    it("does nothing for async iterables", () => {
      assertStream(fakeStream(), "test");
    });

    it("throws for plain values", () => {
      expect(() => { assertStream("hello", "Transform.apply()"); }).toThrow(
        /Transform\.apply\(\) expected AsyncIterable/,
      );
    });

    it("throws for null", () => {
      expect(() => { assertStream(null, "test"); }).toThrow();
    });

    it("throws for arrays (sync iterable, not async)", () => {
      expect(() => { assertStream([1, 2, 3], "test"); }).toThrow();
    });
  });

  describe("guardPortReturn", () => {
    it("passes through normal return values", async () => {
      const fn = (): Promise<string> => Promise.resolve("bounded artifact");
      const guarded = guardPortReturn("TestPort", "read", fn);
      const result = await guarded();
      expect(result).toBe("bounded artifact");
    });

    it("passes through object return values", async () => {
      const obj = { data: [1, 2, 3] };
      const fn = (): Promise<typeof obj> => Promise.resolve(obj);
      const guarded = guardPortReturn("TestPort", "fetch", fn);
      const result = await guarded();
      expect(result).toBe(obj);
    });

    it("throws if port returns an async iterable", async () => {
      const fn = (): Promise<unknown> => Promise.resolve(fakeStream());
      const guarded = guardPortReturn("BlobPort", "read", fn);
      await expect(guarded()).rejects.toThrow(
        /BlobPort\.read\(\) produced a stream/,
      );
    });

    it("preserves the original error if the function throws", async () => {
      const fn = (): Promise<never> => Promise.reject(new Error("disk failed"));
      const guarded = guardPortReturn("TestPort", "read", fn);
      await expect(guarded()).rejects.toThrow("disk failed");
    });
  });
});
