import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { stateSave, stateLoad } from "../../../src/operations/state.js";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

describe("operations: state_save / state_load", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("saves and loads state", async () => {
    const content = "Current task: fix the bug\nNext: write tests";
    const saveResult = await stateSave(content, { graftDir: tmpDir });
    expect(saveResult.ok).toBe(true);

    const loadResult = await stateLoad({ graftDir: tmpDir });
    expect(loadResult.content).toBe(content);
  });

  it("refuses state exceeding 8 KB", async () => {
    const oversized = "x".repeat(9000);
    const result = await stateSave(oversized, { graftDir: tmpDir });
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("8");
  });

  it("allows state at exactly 8192 bytes", async () => {
    const exact = "x".repeat(8192);
    const result = await stateSave(exact, { graftDir: tmpDir });
    expect(result.ok).toBe(true);
  });

  it("returns empty when no state saved", async () => {
    const result = await stateLoad({ graftDir: tmpDir });
    expect(result.content).toBeNull();
  });

  it("overwrites previous state", async () => {
    await stateSave("first", { graftDir: tmpDir });
    await stateSave("second", { graftDir: tmpDir });
    const result = await stateLoad({ graftDir: tmpDir });
    expect(result.content).toBe("second");
  });
});
