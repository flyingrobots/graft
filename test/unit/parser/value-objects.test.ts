import { describe, it, expect } from "vitest";
import { OutlineEntry, JumpEntry } from "../../../src/parser/types.js";
import { DiffEntry, OutlineDiff } from "../../../src/parser/diff.js";

describe("value objects: OutlineEntry", () => {
  it("constructs with required fields", () => {
    const entry = new OutlineEntry({
      kind: "function",
      name: "greet",
      exported: true,
    });
    expect(entry.kind).toBe("function");
    expect(entry.name).toBe("greet");
    expect(entry.exported).toBe(true);
    expect(entry.signature).toBeUndefined();
    expect(entry.children).toBeUndefined();
  });

  it("constructs with optional signature", () => {
    const entry = new OutlineEntry({
      kind: "function",
      name: "greet",
      signature: "greet(name: string): string",
      exported: true,
    });
    expect(entry.signature).toBe("greet(name: string): string");
  });

  it("constructs with children", () => {
    const child = new OutlineEntry({
      kind: "method",
      name: "bar",
      exported: false,
    });
    const parent = new OutlineEntry({
      kind: "class",
      name: "Foo",
      exported: true,
      children: [child],
    });
    expect(parent.children).toHaveLength(1);
    expect(parent.children![0]!.name).toBe("bar");
  });

  it("is frozen after construction", () => {
    const entry = new OutlineEntry({
      kind: "function",
      name: "greet",
      exported: true,
    });
    expect(Object.isFrozen(entry)).toBe(true);
  });

  it("freezes children array", () => {
    const child = new OutlineEntry({
      kind: "method",
      name: "bar",
      exported: false,
    });
    const parent = new OutlineEntry({
      kind: "class",
      name: "Foo",
      exported: true,
      children: [child],
    });
    expect(Object.isFrozen(parent.children)).toBe(true);
  });

  it("throws on empty name", () => {
    expect(
      () => new OutlineEntry({ kind: "function", name: "", exported: true }),
    ).toThrow("non-empty");
  });

  it("throws on whitespace-only name", () => {
    expect(
      () => new OutlineEntry({ kind: "function", name: "   ", exported: true }),
    ).toThrow("non-empty");
  });

  it("trims name", () => {
    const entry = new OutlineEntry({
      kind: "function",
      name: "  greet  ",
      exported: true,
    });
    expect(entry.name).toBe("greet");
  });

  it("is an instanceof OutlineEntry", () => {
    const entry = new OutlineEntry({
      kind: "function",
      name: "greet",
      exported: true,
    });
    expect(entry).toBeInstanceOf(OutlineEntry);
  });
});

describe("value objects: JumpEntry", () => {
  it("constructs with valid range", () => {
    const entry = new JumpEntry({
      symbol: "greet",
      kind: "function",
      start: 1,
      end: 10,
    });
    expect(entry.symbol).toBe("greet");
    expect(entry.kind).toBe("function");
    expect(entry.start).toBe(1);
    expect(entry.end).toBe(10);
  });

  it("is frozen after construction", () => {
    const entry = new JumpEntry({
      symbol: "greet",
      kind: "function",
      start: 1,
      end: 10,
    });
    expect(Object.isFrozen(entry)).toBe(true);
  });

  it("throws when start < 1", () => {
    expect(
      () => new JumpEntry({ symbol: "greet", kind: "function", start: 0, end: 10 }),
    ).toThrow("start");
  });

  it("throws when end < start", () => {
    expect(
      () => new JumpEntry({ symbol: "greet", kind: "function", start: 10, end: 5 }),
    ).toThrow("end");
  });

  it("throws on NaN start", () => {
    expect(
      () => new JumpEntry({ symbol: "greet", kind: "function", start: NaN, end: 10 }),
    ).toThrow("start");
  });

  it("throws on fractional start", () => {
    expect(
      () => new JumpEntry({ symbol: "greet", kind: "function", start: 1.5, end: 10 }),
    ).toThrow("start");
  });

  it("throws on NaN end", () => {
    expect(
      () => new JumpEntry({ symbol: "greet", kind: "function", start: 1, end: NaN }),
    ).toThrow("end");
  });

  it("throws on fractional end", () => {
    expect(
      () => new JumpEntry({ symbol: "greet", kind: "function", start: 1, end: 5.5 }),
    ).toThrow("end");
  });

  it("allows single-line range (start === end)", () => {
    const entry = new JumpEntry({
      symbol: "x",
      kind: "type",
      start: 5,
      end: 5,
    });
    expect(entry.start).toBe(5);
    expect(entry.end).toBe(5);
  });

  it("is an instanceof JumpEntry", () => {
    const entry = new JumpEntry({
      symbol: "greet",
      kind: "function",
      start: 1,
      end: 10,
    });
    expect(entry).toBeInstanceOf(JumpEntry);
  });
});

describe("value objects: DiffEntry", () => {
  it("constructs with required fields", () => {
    const entry = new DiffEntry({ name: "greet", kind: "function" });
    expect(entry.name).toBe("greet");
    expect(entry.kind).toBe("function");
    expect(entry.signature).toBeUndefined();
    expect(entry.oldSignature).toBeUndefined();
    expect(entry.childDiff).toBeUndefined();
  });

  it("constructs with optional fields", () => {
    const entry = new DiffEntry({
      name: "greet",
      kind: "function",
      signature: "greet(name: string)",
      oldSignature: "greet()",
    });
    expect(entry.signature).toBe("greet(name: string)");
    expect(entry.oldSignature).toBe("greet()");
  });

  it("is frozen after construction", () => {
    const entry = new DiffEntry({ name: "greet", kind: "function" });
    expect(Object.isFrozen(entry)).toBe(true);
  });

  it("throws on empty name", () => {
    expect(
      () => new DiffEntry({ name: "", kind: "function" }),
    ).toThrow("non-empty");
  });

  it("throws on whitespace-only name", () => {
    expect(
      () => new DiffEntry({ name: "   ", kind: "function" }),
    ).toThrow("non-empty");
  });

  it("trims name", () => {
    const entry = new DiffEntry({ name: "  greet  ", kind: "function" });
    expect(entry.name).toBe("greet");
  });

  it("is an instanceof DiffEntry", () => {
    const entry = new DiffEntry({ name: "greet", kind: "function" });
    expect(entry).toBeInstanceOf(DiffEntry);
  });
});

describe("value objects: OutlineDiff", () => {
  it("constructs with arrays and count", () => {
    const diff = new OutlineDiff({
      added: [],
      removed: [],
      changed: [],
      unchangedCount: 5,
    });
    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
    expect(diff.changed).toEqual([]);
    expect(diff.unchangedCount).toBe(5);
  });

  it("is frozen after construction", () => {
    const diff = new OutlineDiff({
      added: [],
      removed: [],
      changed: [],
      unchangedCount: 0,
    });
    expect(Object.isFrozen(diff)).toBe(true);
  });

  it("freezes the added/removed/changed arrays", () => {
    const diff = new OutlineDiff({
      added: [],
      removed: [],
      changed: [],
      unchangedCount: 0,
    });
    expect(Object.isFrozen(diff.added)).toBe(true);
    expect(Object.isFrozen(diff.removed)).toBe(true);
    expect(Object.isFrozen(diff.changed)).toBe(true);
  });

  it("throws on negative unchangedCount", () => {
    expect(
      () => new OutlineDiff({ added: [], removed: [], changed: [], unchangedCount: -1 }),
    ).toThrow("unchangedCount");
  });

  it("throws on fractional unchangedCount", () => {
    expect(
      () => new OutlineDiff({ added: [], removed: [], changed: [], unchangedCount: 2.5 }),
    ).toThrow("unchangedCount");
  });

  it("throws on NaN unchangedCount", () => {
    expect(
      () => new OutlineDiff({ added: [], removed: [], changed: [], unchangedCount: NaN }),
    ).toThrow("unchangedCount");
  });

  it("is an instanceof OutlineDiff", () => {
    const diff = new OutlineDiff({
      added: [],
      removed: [],
      changed: [],
      unchangedCount: 0,
    });
    expect(diff).toBeInstanceOf(OutlineDiff);
  });
});
