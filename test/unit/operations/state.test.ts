import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  STATE_FILENAME,
  stateSave,
  stateLoad,
  StateSaveResult,
  StateLoadResult,
} from "../../../src/operations/state.js";
import { nodeFs } from "../../../src/adapters/node-fs.js";
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
    const saveResult = await stateSave(content, {
      stateDir: tmpDir,
      statePath: path.join(tmpDir, STATE_FILENAME),
      fs: nodeFs,
    });
    expect(saveResult).toBeInstanceOf(StateSaveResult);
    expect(saveResult.ok).toBe(true);

    const loadResult = await stateLoad({ statePath: path.join(tmpDir, STATE_FILENAME), fs: nodeFs });
    expect(loadResult).toBeInstanceOf(StateLoadResult);
    expect(loadResult.content).toBe(content);
  });

  it("refuses state exceeding 8 KB", async () => {
    const oversized = "x".repeat(9000);
    const result = await stateSave(oversized, {
      stateDir: tmpDir,
      statePath: path.join(tmpDir, STATE_FILENAME),
      fs: nodeFs,
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("8");
  });

  it("allows state at exactly 8192 bytes", async () => {
    const exact = "x".repeat(8192);
    const result = await stateSave(exact, {
      stateDir: tmpDir,
      statePath: path.join(tmpDir, STATE_FILENAME),
      fs: nodeFs,
    });
    expect(result.ok).toBe(true);
  });

  it("returns empty when no state saved", async () => {
    const result = await stateLoad({ statePath: path.join(tmpDir, STATE_FILENAME), fs: nodeFs });
    expect(result.content).toBeNull();
  });

  it("overwrites previous state", async () => {
    await stateSave("first", {
      stateDir: tmpDir,
      statePath: path.join(tmpDir, STATE_FILENAME),
      fs: nodeFs,
    });
    await stateSave("second", {
      stateDir: tmpDir,
      statePath: path.join(tmpDir, STATE_FILENAME),
      fs: nodeFs,
    });
    const result = await stateLoad({ statePath: path.join(tmpDir, STATE_FILENAME), fs: nodeFs });
    expect(result.content).toBe("second");
  });
});
