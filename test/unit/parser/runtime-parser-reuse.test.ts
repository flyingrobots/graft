/**
 * The tree-sitter runtime must reuse one Parser per language.
 *
 * `WebAssembly.Memory` linear pages only ever grow; they are never returned
 * to the OS. Constructing a Parser per parse therefore ratchets the WASM
 * heap under the indexer's parse churn even though every C struct is freed.
 */

import { beforeAll, describe, expect, it } from "vitest";
import {
  ensureParserReady,
  parseStructuredTree,
  parserInstanceCount,
} from "../../../src/parser/runtime.js";

beforeAll(async () => {
  await ensureParserReady();
});

describe("parser reuse", () => {
  it("does not construct a new parser per parse", () => {
    // Warm the language so the count reflects reuse, not first construction.
    parseStructuredTree("ts", "const warm = 0;").delete();
    const before = parserInstanceCount();

    for (let i = 0; i < 20; i++) {
      const parsed = parseStructuredTree("ts", `const x${String(i)} = ${String(i)};`);
      parsed.delete();
    }

    expect(parserInstanceCount()).toBe(before);
  });

  it("holds at most one parser per language", () => {
    for (const format of ["ts", "js", "python"] as const) {
      parseStructuredTree(format, "").delete();
      parseStructuredTree(format, "").delete();
    }
    expect(parserInstanceCount()).toBeLessThanOrEqual(3);
  });

  it("keeps the shared parser usable after a tree is deleted", () => {
    const first = parseStructuredTree("ts", "const a = 1;");
    first.delete();
    const second = parseStructuredTree("ts", "const b = 2;");
    try {
      expect(second.root.type).toBe("program");
      expect(second.root.childCount).toBeGreaterThan(0);
    } finally {
      second.delete();
    }
  });

  it("produces the same tree shape on a reused parser as on a fresh one", () => {
    const source = "export function greet(name: string): string { return name; }";
    const first = parseStructuredTree("ts", source);
    const firstShape = first.root.toString();
    first.delete();

    // Interleave another language to force a setLanguage round-trip.
    parseStructuredTree("python", "def greet(name):\n    return name\n").delete();

    const second = parseStructuredTree("ts", source);
    try {
      expect(second.root.toString()).toBe(firstShape);
    } finally {
      second.delete();
    }
  });

  it("keeps an already-parsed tree valid across a later parse", () => {
    const held = parseStructuredTree("ts", "const held = 1;");
    try {
      parseStructuredTree("ts", "const other = 2;").delete();
      // The held tree predates the second parse on the same parser.
      expect(held.root.type).toBe("program");
      expect(held.source).toBe("const held = 1;");
    } finally {
      held.delete();
    }
  });

  it("tolerates a double delete without corrupting the shared parser", () => {
    const parsed = parseStructuredTree("ts", "const a = 1;");
    parsed.delete();
    expect(() => { parsed.delete(); }).not.toThrow();

    const next = parseStructuredTree("ts", "const b = 2;");
    try {
      expect(next.root.type).toBe("program");
    } finally {
      next.delete();
    }
  });
});
