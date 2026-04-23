import { describe, it, expect } from "vitest";
import { ObservationCache } from "../../../src/operations/observation-cache.js";
import { buildHandoff, type HandoffPayload } from "../../../src/operations/agent-handoff.js";

describe("operations: agent-handoff", () => {
  it("produces handoff with files read and symbols inspected", () => {
    const cache = new ObservationCache();
    cache.record("src/app.ts", "h1",
      [{ name: "main", kind: "function", signature: "main(): void", exported: true, startLine: 1, endLine: 1 }],
      [], { lines: 1, bytes: 30 });
    cache.record("src/lib.ts", "h2",
      [{ name: "helper", kind: "function", signature: "helper(): string", exported: true, startLine: 1, endLine: 1 },
       { name: "util", kind: "function", signature: "util(): void", exported: false, startLine: 2, endLine: 2 }],
      [], { lines: 2, bytes: 60 });

    const handoff = buildHandoff({ cache, sessionId: "sess-1" });

    expect(handoff.filesRead.sort()).toEqual(["src/app.ts", "src/lib.ts"]);
    expect(handoff.symbolsInspected).toContain("main");
    expect(handoff.symbolsInspected).toContain("helper");
    expect(handoff.symbolsInspected).toContain("util");
    expect(handoff.observations).toBe(2);
    expect(handoff.sessionId).toBe("sess-1");
  });

  it("returns empty handoff for fresh session", () => {
    const cache = new ObservationCache();
    const handoff = buildHandoff({ cache, sessionId: "fresh" });

    expect(handoff.filesRead).toEqual([]);
    expect(handoff.symbolsInspected).toEqual([]);
    expect(handoff.observations).toBe(0);
  });

  it("includes budget consumed percentage", () => {
    const cache = new ObservationCache();
    cache.record("a.ts", "h",
      [{ name: "x", kind: "variable", signature: "x: number", exported: true, startLine: 1, endLine: 1 }],
      [], { lines: 1, bytes: 100 });

    const handoff = buildHandoff({
      cache,
      sessionId: "s1",
      budgetTotal: 500000,
      budgetConsumed: 150000,
    });

    expect(handoff.budgetConsumed).toBe("30%");
  });

  it("handoff is JSON-serializable", () => {
    const cache = new ObservationCache();
    cache.record("x.ts", "h",
      [{ name: "fn", kind: "function", signature: "fn(): void", exported: true, startLine: 1, endLine: 1 }],
      [], { lines: 1, bytes: 10 });

    const handoff = buildHandoff({ cache, sessionId: "s" });
    const json = JSON.stringify(handoff);
    const parsed = JSON.parse(json) as HandoffPayload;

    expect(parsed.filesRead).toEqual(handoff.filesRead);
    expect(parsed.sessionId).toBe("s");
  });
});
