import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { handlePostReadHook } from "../../../src/hooks/posttooluse-read.js";
import fs from "node:fs";
import path from "node:path";
import { fixturePath } from "../../helpers/fixtures.js";
import {
  cleanupHookDir,
  createTempHookDir,
  expectPostReadEducation,
  makeFixtureReadHookInput,
} from "../../helpers/hooks.js";

describe("hooks: posttooluse-read", () => {
  // -----------------------------------------------------------------------
  // No feedback for small files
  // -----------------------------------------------------------------------
  it("no feedback for small files — Read was the right call", async () => {
    const output = await handlePostReadHook(
      makeFixtureReadHookInput(fixturePath("small.ts"), "PostToolUse"),
    );
    expect(output.exitCode).toBe(0);
    expect(output.stderr).toBe("");
  });

  // -----------------------------------------------------------------------
  // Education for large files
  // -----------------------------------------------------------------------
  it("educates on large file reads with context cost", async () => {
    const output = await handlePostReadHook(
      makeFixtureReadHookInput(fixturePath("large.ts"), "PostToolUse"),
    );
    expect(output.exitCode).toBe(0);
    expectPostReadEducation(output.stderr);
  });

  it("shows line count and KB in feedback", async () => {
    const output = await handlePostReadHook(
      makeFixtureReadHookInput(fixturePath("large.ts"), "PostToolUse"),
    );
    expect(output.stderr).toMatch(/\d+ lines/);
    expect(output.stderr).toMatch(/\d+(\.\d+)?KB/);
  });

  it("mentions read_range and jump tables", async () => {
    const output = await handlePostReadHook(
      makeFixtureReadHookInput(fixturePath("large.ts"), "PostToolUse"),
    );
    expect(output.stderr).toContain("read_range");
  });

  it("shows threshold in feedback", async () => {
    const output = await handlePostReadHook(
      makeFixtureReadHookInput(fixturePath("large.ts"), "PostToolUse"),
    );
    expect(output.stderr).toContain("Threshold:");
  });

  // -----------------------------------------------------------------------
  // No feedback for non-JS/TS
  // -----------------------------------------------------------------------
  describe("non-parseable files", () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = createTempHookDir("graft-post-");
    });

    afterEach(() => {
      cleanupHookDir(tmpDir);
    });

    it("no feedback for large non-JS/TS files", async () => {
      const largeMd = "# Heading\n\n" + "Lorem ipsum.\n".repeat(200);
      fs.writeFileSync(path.join(tmpDir, "big.md"), largeMd);
      const output = await handlePostReadHook(
        makeFixtureReadHookInput(path.join(tmpDir, "big.md"), "PostToolUse", tmpDir),
      );
      expect(output.exitCode).toBe(0);
      expect(output.stderr).toBe("");
    });
  });

  // -----------------------------------------------------------------------
  // No feedback for nonexistent / outside cwd
  // -----------------------------------------------------------------------
  it("no feedback for nonexistent files", async () => {
    const tmpDir = createTempHookDir("graft-post-missing-");
    try {
      const nonexistent = path.join(tmpDir, "graft-nonexistent-test-file.ts");
      const output = await handlePostReadHook(
        makeFixtureReadHookInput(nonexistent, "PostToolUse"),
      );
      expect(output.exitCode).toBe(0);
      expect(output.stderr).toBe("");
    } finally {
      cleanupHookDir(tmpDir);
    }
  });

  it("no feedback for paths outside cwd", async () => {
    const outsidePath = path.resolve(process.cwd(), "..", "outside-file.ts");
    const output = await handlePostReadHook(
      makeFixtureReadHookInput(outsidePath, "PostToolUse"),
    );
    expect(output.exitCode).toBe(0);
    expect(output.stderr).toBe("");
  });

  // -----------------------------------------------------------------------
  // Always exit 0 — never blocks
  // -----------------------------------------------------------------------
  it("always exits 0", async () => {
    const small = await handlePostReadHook(
      makeFixtureReadHookInput(fixturePath("small.ts"), "PostToolUse"),
    );
    const large = await handlePostReadHook(
      makeFixtureReadHookInput(fixturePath("large.ts"), "PostToolUse"),
    );
    const tmpDir = createTempHookDir("graft-post-exit-");
    try {
      const missing = await handlePostReadHook(
        makeFixtureReadHookInput(
          path.join(tmpDir, "graft-nope.ts"),
          "PostToolUse",
        ),
      );
      expect(small.exitCode).toBe(0);
      expect(large.exitCode).toBe(0);
      expect(missing.exitCode).toBe(0);
    } finally {
      cleanupHookDir(tmpDir);
    }
  });
});
