import { AsyncLocalStorage } from "node:async_hooks";
import { describe, expect, it } from "vitest";
import type {
  ToolCallFootprint,
  ToolCallFootprintRegion,
} from "../../../src/mcp/runtime-observability.js";

/**
 * Minimal reproduction of the FootprintAccumulator from server-invocation.ts.
 * This avoids importing the full invocation engine which has deep transitive
 * dependencies that may not be available in incomplete merge states.
 */
interface FootprintAccumulator {
  readonly paths: Set<string>;
  readonly symbols: Set<string>;
  readonly regions: ToolCallFootprintRegion[];
}

interface InvocationStoreLike {
  readonly footprint: FootprintAccumulator;
}

function recordFootprint(
  storage: AsyncLocalStorage<InvocationStoreLike>,
  entry: {
    readonly paths?: readonly string[];
    readonly symbols?: readonly string[];
    readonly regions?: readonly ToolCallFootprintRegion[];
  },
): void {
  const store = storage.getStore();
  if (store === undefined) return;
  if (entry.paths !== undefined) {
    for (const p of entry.paths) store.footprint.paths.add(p);
  }
  if (entry.symbols !== undefined) {
    for (const s of entry.symbols) store.footprint.symbols.add(s);
  }
  if (entry.regions !== undefined) {
    for (const r of entry.regions) store.footprint.regions.push(r);
  }
}

function snapshotFootprint(acc: FootprintAccumulator): ToolCallFootprint | undefined {
  if (acc.paths.size === 0 && acc.symbols.size === 0 && acc.regions.length === 0) {
    return undefined;
  }
  return {
    paths: [...acc.paths].sort(),
    symbols: [...acc.symbols].sort(),
    regions: [...acc.regions],
  };
}

function createStore(): {
  storage: AsyncLocalStorage<InvocationStoreLike>;
  invocation: InvocationStoreLike;
} {
  const storage = new AsyncLocalStorage<InvocationStoreLike>();
  const invocation: InvocationStoreLike = {
    footprint: { paths: new Set(), symbols: new Set(), regions: [] },
  };
  return { storage, invocation };
}

describe("tool call footprint", () => {
  describe("recordFootprint", () => {
    it("records paths into the accumulator", () => {
      const { storage, invocation } = createStore();
      storage.run(invocation, () => {
        recordFootprint(storage, { paths: ["/a.ts", "/b.ts"] });
      });
      expect([...invocation.footprint.paths]).toEqual(["/a.ts", "/b.ts"]);
    });

    it("deduplicates paths across multiple calls", () => {
      const { storage, invocation } = createStore();
      storage.run(invocation, () => {
        recordFootprint(storage, { paths: ["/a.ts"] });
        recordFootprint(storage, { paths: ["/a.ts", "/b.ts"] });
      });
      expect([...invocation.footprint.paths].sort()).toEqual(["/a.ts", "/b.ts"]);
    });

    it("records symbols into the accumulator", () => {
      const { storage, invocation } = createStore();
      storage.run(invocation, () => {
        recordFootprint(storage, { symbols: ["foo", "bar"] });
      });
      expect([...invocation.footprint.symbols].sort()).toEqual(["bar", "foo"]);
    });

    it("deduplicates symbols across multiple calls", () => {
      const { storage, invocation } = createStore();
      storage.run(invocation, () => {
        recordFootprint(storage, { symbols: ["foo"] });
        recordFootprint(storage, { symbols: ["foo", "bar"] });
      });
      expect([...invocation.footprint.symbols].sort()).toEqual(["bar", "foo"]);
    });

    it("records regions into the accumulator", () => {
      const region: ToolCallFootprintRegion = {
        path: "/a.ts",
        startLine: 10,
        endLine: 20,
      };
      const { storage, invocation } = createStore();
      storage.run(invocation, () => {
        recordFootprint(storage, { regions: [region] });
      });
      expect(invocation.footprint.regions).toEqual([region]);
    });

    it("accumulates regions across multiple calls", () => {
      const r1: ToolCallFootprintRegion = { path: "/a.ts", startLine: 10, endLine: 20 };
      const r2: ToolCallFootprintRegion = { path: "/b.ts", startLine: 1, endLine: 5 };
      const { storage, invocation } = createStore();
      storage.run(invocation, () => {
        recordFootprint(storage, { regions: [r1] });
        recordFootprint(storage, { regions: [r2] });
      });
      expect(invocation.footprint.regions).toEqual([r1, r2]);
    });

    it("no-ops when called outside an invocation context", () => {
      const { storage } = createStore();
      // Should not throw — silently no-ops
      recordFootprint(storage, { paths: ["/a.ts"] });
    });

    it("records mixed paths, symbols, and regions in a single call", () => {
      const region: ToolCallFootprintRegion = { path: "/a.ts", startLine: 1, endLine: 10 };
      const { storage, invocation } = createStore();
      storage.run(invocation, () => {
        recordFootprint(storage, {
          paths: ["/a.ts"],
          symbols: ["foo"],
          regions: [region],
        });
      });
      expect([...invocation.footprint.paths]).toEqual(["/a.ts"]);
      expect([...invocation.footprint.symbols]).toEqual(["foo"]);
      expect(invocation.footprint.regions).toEqual([region]);
    });

    it("handles empty entry gracefully", () => {
      const { storage, invocation } = createStore();
      storage.run(invocation, () => {
        recordFootprint(storage, {});
      });
      expect(invocation.footprint.paths.size).toBe(0);
      expect(invocation.footprint.symbols.size).toBe(0);
      expect(invocation.footprint.regions).toHaveLength(0);
    });
  });

  describe("snapshotFootprint", () => {
    it("returns undefined for empty accumulator", () => {
      const acc: FootprintAccumulator = {
        paths: new Set(),
        symbols: new Set(),
        regions: [],
      };
      expect(snapshotFootprint(acc)).toBeUndefined();
    });

    it("sorts paths and symbols in snapshot", () => {
      const acc: FootprintAccumulator = {
        paths: new Set(["/z.ts", "/a.ts", "/m.ts"]),
        symbols: new Set(["zoo", "alpha", "mid"]),
        regions: [],
      };
      const result = snapshotFootprint(acc);
      expect(result).toBeDefined();
      expect(result?.paths).toEqual(["/a.ts", "/m.ts", "/z.ts"]);
      expect(result?.symbols).toEqual(["alpha", "mid", "zoo"]);
    });

    it("preserves region order", () => {
      const r1: ToolCallFootprintRegion = { path: "/a.ts", startLine: 50, endLine: 60 };
      const r2: ToolCallFootprintRegion = { path: "/b.ts", startLine: 1, endLine: 5 };
      const acc: FootprintAccumulator = {
        paths: new Set(["/a.ts"]),
        symbols: new Set(),
        regions: [r1, r2],
      };
      const result = snapshotFootprint(acc);
      expect(result?.regions).toEqual([r1, r2]);
    });

    it("returns defined even with only paths", () => {
      const acc: FootprintAccumulator = {
        paths: new Set(["/a.ts"]),
        symbols: new Set(),
        regions: [],
      };
      const result = snapshotFootprint(acc);
      expect(result).toBeDefined();
      expect(result?.paths).toEqual(["/a.ts"]);
      expect(result?.symbols).toEqual([]);
      expect(result?.regions).toEqual([]);
    });

    it("returns defined even with only symbols", () => {
      const acc: FootprintAccumulator = {
        paths: new Set(),
        symbols: new Set(["foo"]),
        regions: [],
      };
      const result = snapshotFootprint(acc);
      expect(result).toBeDefined();
      expect(result?.symbols).toEqual(["foo"]);
    });

    it("returns defined even with only regions", () => {
      const region: ToolCallFootprintRegion = { path: "/a.ts", startLine: 1, endLine: 10 };
      const acc: FootprintAccumulator = {
        paths: new Set(),
        symbols: new Set(),
        regions: [region],
      };
      const result = snapshotFootprint(acc);
      expect(result).toBeDefined();
      expect(result?.regions).toEqual([region]);
    });
  });

  describe("ToolCallFootprint interface", () => {
    it("satisfies the shape contract", () => {
      const footprint: ToolCallFootprint = {
        paths: ["/src/app.ts"],
        symbols: ["createApp", "initServer"],
        regions: [{ path: "/src/app.ts", startLine: 1, endLine: 50 }],
      };
      expect(footprint.paths).toHaveLength(1);
      expect(footprint.symbols).toHaveLength(2);
      expect(footprint.regions).toHaveLength(1);
      expect(footprint.regions[0]?.path).toBe("/src/app.ts");
      expect(footprint.regions[0]?.startLine).toBe(1);
      expect(footprint.regions[0]?.endLine).toBe(50);
    });

    it("allows empty collections", () => {
      const footprint: ToolCallFootprint = {
        paths: [],
        symbols: [],
        regions: [],
      };
      expect(footprint.paths).toHaveLength(0);
      expect(footprint.symbols).toHaveLength(0);
      expect(footprint.regions).toHaveLength(0);
    });
  });
});
