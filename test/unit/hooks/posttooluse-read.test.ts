import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { handlePostReadHook } from "../../../src/hooks/posttooluse-read.js";
import type { HookInput } from "../../../src/hooks/shared.js";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const FIXTURES = path.resolve(import.meta.dirname, "../../fixtures");

function makeInput(filePath: string, cwd?: string): HookInput {
  return {
    session_id: "test-session",
    cwd: cwd ?? process.cwd(),
    hook_event_name: "PostToolUse",
    tool_name: "Read",
    tool_input: { file_path: filePath },
  };
}

describe("hooks: posttooluse-read", () => {
  // -----------------------------------------------------------------------
  // No feedback for small files
  // -----------------------------------------------------------------------
  it("no feedback for small files — Read was the right call", async () => {
    const output = await handlePostReadHook(
      makeInput(path.join(FIXTURES, "small.ts")),
    );
    expect(output.exitCode).toBe(0);
    expect(output.stderr).toBe("");
  });

  // -----------------------------------------------------------------------
  // Education for large files
  // -----------------------------------------------------------------------
  it("educates on large file reads with context cost", async () => {
    const output = await handlePostReadHook(
      makeInput(path.join(FIXTURES, "large.ts")),
    );
    expect(output.exitCode).toBe(0);
    expect(output.stderr).toContain("[graft]");
    expect(output.stderr).toContain("safe_read");
    expect(output.stderr).toContain("saving");
  });

  it("shows line count and KB in feedback", async () => {
    const output = await handlePostReadHook(
      makeInput(path.join(FIXTURES, "large.ts")),
    );
    expect(output.stderr).toMatch(/\d+ lines/);
    expect(output.stderr).toMatch(/\d+(\.\d+)?KB/);
  });

  it("mentions read_range and jump tables", async () => {
    const output = await handlePostReadHook(
      makeInput(path.join(FIXTURES, "large.ts")),
    );
    expect(output.stderr).toContain("read_range");
  });

  it("shows threshold in feedback", async () => {
    const output = await handlePostReadHook(
      makeInput(path.join(FIXTURES, "large.ts")),
    );
    expect(output.stderr).toContain("Threshold:");
  });

  // -----------------------------------------------------------------------
  // No feedback for non-JS/TS
  // -----------------------------------------------------------------------
  describe("non-parseable files", () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-post-"));
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it("no feedback for large non-JS/TS files", async () => {
      const largeMd = "# Heading\n\n" + "Lorem ipsum.\n".repeat(200);
      fs.writeFileSync(path.join(tmpDir, "big.md"), largeMd);
      const output = await handlePostReadHook(
        makeInput(path.join(tmpDir, "big.md"), tmpDir),
      );
      expect(output.exitCode).toBe(0);
      expect(output.stderr).toBe("");
    });
  });

  // -----------------------------------------------------------------------
  // No feedback for nonexistent / outside cwd
  // -----------------------------------------------------------------------
  it("no feedback for nonexistent files", async () => {
    const nonexistent = path.join(os.tmpdir(), "graft-nonexistent-test-file.ts");
    const output = await handlePostReadHook(makeInput(nonexistent));
    expect(output.exitCode).toBe(0);
    expect(output.stderr).toBe("");
  });

  it("no feedback for paths outside cwd", async () => {
    const outsidePath = path.resolve(process.cwd(), "..", "outside-file.ts");
    const output = await handlePostReadHook(makeInput(outsidePath));
    expect(output.exitCode).toBe(0);
    expect(output.stderr).toBe("");
  });

  // -----------------------------------------------------------------------
  // Always exit 0 — never blocks
  // -----------------------------------------------------------------------
  it("always exits 0", async () => {
    const small = await handlePostReadHook(
      makeInput(path.join(FIXTURES, "small.ts")),
    );
    const large = await handlePostReadHook(
      makeInput(path.join(FIXTURES, "large.ts")),
    );
    const missing = await handlePostReadHook(
      makeInput(path.join(os.tmpdir(), "graft-nope.ts")),
    );
    expect(small.exitCode).toBe(0);
    expect(large.exitCode).toBe(0);
    expect(missing.exitCode).toBe(0);
  });
});
