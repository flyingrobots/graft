import { describe, it, expect } from "vitest";
import {
  CaptureHandleRegistry,
} from "../../../src/operations/capture-range.js";

describe("operations: capture-range", () => {
  it("registers a capture and returns an opaque handle", () => {
    const registry = new CaptureHandleRegistry();
    const handle = registry.register("session-1", "line1\nline2\nline3\n");

    expect(handle).toBeDefined();
    expect(typeof handle).toBe("string");
    expect(handle.length).toBeGreaterThan(0);
  });

  it("retrieves a slice via handle and line range", () => {
    const registry = new CaptureHandleRegistry();
    const content = "line1\nline2\nline3\nline4\nline5\n";
    const handle = registry.register("session-1", content);

    const result = registry.getRange(handle, "session-1", 2, 4);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.lines).toEqual(["line2", "line3", "line4"]);
    expect(result.totalLines).toBe(5);
  });

  it("rejects an invalid handle", () => {
    const registry = new CaptureHandleRegistry();
    const result = registry.getRange("bad-handle", "session-1", 1, 5);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("not found");
  });

  it("rejects a handle from a different session", () => {
    const registry = new CaptureHandleRegistry();
    const handle = registry.register("session-1", "data\n");

    const result = registry.getRange(handle, "session-2", 1, 1);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("session");
  });

  it("clamps range to actual content bounds", () => {
    const registry = new CaptureHandleRegistry();
    const handle = registry.register("s1", "a\nb\nc\n");

    const result = registry.getRange(handle, "s1", 1, 100);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.lines).toEqual(["a", "b", "c"]);
  });
});
