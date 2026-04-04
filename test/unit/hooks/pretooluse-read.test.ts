import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { handleReadHook } from "../../../src/hooks/pretooluse-read.js";
import type { HookInput } from "../../../src/hooks/pretooluse-read.js";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const FIXTURES = path.resolve(import.meta.dirname, "../../fixtures");

function makeInput(filePath: string, cwd?: string): HookInput {
  return {
    session_id: "test-session",
    cwd: cwd ?? process.cwd(),
    hook_event_name: "PreToolUse",
    tool_name: "Read",
    tool_input: { file_path: filePath },
  };
}

describe("hooks: pretooluse-read", () => {
  // -----------------------------------------------------------------------
  // Allowed (exit 0) — everything except banned files passes through
  // -----------------------------------------------------------------------
  it("allows small files through (exit 0)", () => {
    const output = handleReadHook(makeInput(path.join(FIXTURES, "small.ts")));
    expect(output.exitCode).toBe(0);
  });

  it("allows large files through (exit 0) — PostToolUse educates", () => {
    const output = handleReadHook(makeInput(path.join(FIXTURES, "large.ts")));
    expect(output.exitCode).toBe(0);
  });

  it("allows nonexistent files through (exit 0) — let Read handle error", () => {
    const output = handleReadHook(makeInput("/nonexistent/file.ts"));
    expect(output.exitCode).toBe(0);
  });

  // -----------------------------------------------------------------------
  // Refused (exit 2) — only banned files are hard-blocked
  // -----------------------------------------------------------------------
  it("blocks binary files", () => {
    const output = handleReadHook(makeInput(path.join(FIXTURES, "ban-targets/image.png")));
    expect(output.exitCode).toBe(2);
    expect(output.stderr).toContain("Refused: BINARY");
  });

  it("blocks lockfiles", () => {
    const output = handleReadHook(makeInput(path.join(FIXTURES, "ban-targets/package-lock.json")));
    expect(output.exitCode).toBe(2);
    expect(output.stderr).toContain("Refused: LOCKFILE");
  });

  it("blocks secret files", () => {
    const output = handleReadHook(makeInput(path.join(FIXTURES, "ban-targets/.env")));
    expect(output.exitCode).toBe(2);
    expect(output.stderr).toContain("Refused: SECRET");
  });

  it("refusal references graft tools", () => {
    const output = handleReadHook(makeInput(path.join(FIXTURES, "ban-targets/image.png")));
    expect(output.stderr).toContain("file_outline");
    expect(output.stderr).toContain("safe_read");
  });

  // -----------------------------------------------------------------------
  // .graftignore
  // -----------------------------------------------------------------------
  describe("graftignore", () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-hook-"));
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it("blocks files matching .graftignore", () => {
      fs.writeFileSync(path.join(tmpDir, ".graftignore"), "*.generated.ts\n");
      fs.writeFileSync(path.join(tmpDir, "schema.generated.ts"), "export const x = 1;");
      const output = handleReadHook(makeInput(
        path.join(tmpDir, "schema.generated.ts"),
        tmpDir,
      ));
      expect(output.exitCode).toBe(2);
      expect(output.stderr).toContain("Refused: GRAFTIGNORE");
    });
  });
});
