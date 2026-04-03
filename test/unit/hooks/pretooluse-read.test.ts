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
  // Content projection (small files) — exit 0, let Read proceed
  // -----------------------------------------------------------------------
  it("allows small files through (exit 0)", async () => {
    const input = makeInput(path.join(FIXTURES, "small.ts"));
    const output = await handleReadHook(input);
    expect(output.exitCode).toBe(0);
    expect(output.stderr).toBe("");
  });

  // -----------------------------------------------------------------------
  // Outline projection (large files) — exit 2, return outline
  // -----------------------------------------------------------------------
  it("blocks large files with structural outline (exit 2)", async () => {
    const input = makeInput(path.join(FIXTURES, "large.ts"));
    const output = await handleReadHook(input);
    expect(output.exitCode).toBe(2);
    expect(output.stderr).toContain("exceeds policy threshold");
    expect(output.stderr).toContain("outline");
    expect(output.stderr).toContain("jumpTable");
  });

  it("outline message references graft tools", async () => {
    const input = makeInput(path.join(FIXTURES, "large.ts"));
    const output = await handleReadHook(input);
    expect(output.stderr).toContain("read_range");
    expect(output.stderr).toContain("file_outline");
    expect(output.stderr).toContain("safe_read");
  });

  it("outline includes jump table entries", async () => {
    const input = makeInput(path.join(FIXTURES, "large.ts"));
    const output = await handleReadHook(input);
    expect(output.stderr).toContain('"symbol"');
    expect(output.stderr).toContain('"start"');
    expect(output.stderr).toContain('"end"');
  });

  // -----------------------------------------------------------------------
  // Refused projection (banned files) — exit 2, return refusal
  // -----------------------------------------------------------------------
  it("refuses binary files", async () => {
    const input = makeInput(path.join(FIXTURES, "ban-targets/image.png"));
    const output = await handleReadHook(input);
    expect(output.exitCode).toBe(2);
    expect(output.stderr).toContain("Refused: BINARY");
  });

  it("refuses lockfiles", async () => {
    const input = makeInput(path.join(FIXTURES, "ban-targets/package-lock.json"));
    const output = await handleReadHook(input);
    expect(output.exitCode).toBe(2);
    expect(output.stderr).toContain("Refused: LOCKFILE");
  });

  it("refuses secret files", async () => {
    const input = makeInput(path.join(FIXTURES, "ban-targets/.env"));
    const output = await handleReadHook(input);
    expect(output.exitCode).toBe(2);
    expect(output.stderr).toContain("Refused: SECRET");
  });

  it("refusal message references graft tools", async () => {
    const input = makeInput(path.join(FIXTURES, "ban-targets/image.png"));
    const output = await handleReadHook(input);
    expect(output.stderr).toContain("Next steps:");
    expect(output.stderr).toContain("file_outline");
    expect(output.stderr).toContain("safe_read");
  });

  // -----------------------------------------------------------------------
  // Error handling
  // -----------------------------------------------------------------------
  it("blocks nonexistent files (exit 2)", async () => {
    const input = makeInput("/nonexistent/file.ts");
    const output = await handleReadHook(input);
    expect(output.exitCode).toBe(2);
    expect(output.stderr).toContain("File not found");
  });

  // -----------------------------------------------------------------------
  // Non-JS/TS files — exit 0, let Read proceed (no outline available)
  // -----------------------------------------------------------------------
  describe("non-parseable files", () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-hook-lang-"));
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it("allows large non-JS/TS files through (exit 0)", async () => {
      const largeMd = "# Heading\n\n" + "Lorem ipsum dolor sit amet.\n".repeat(200);
      fs.writeFileSync(path.join(tmpDir, "README.md"), largeMd);
      const input = makeInput(path.join(tmpDir, "README.md"), tmpDir);
      const output = await handleReadHook(input);
      expect(output.exitCode).toBe(0);
      expect(output.stderr).toBe("");
    });
  });

  // -----------------------------------------------------------------------
  // .graftignore support
  // -----------------------------------------------------------------------
  describe("graftignore", () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-hook-"));
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it("refuses files matching .graftignore patterns", async () => {
      fs.writeFileSync(path.join(tmpDir, ".graftignore"), "*.generated.ts\n");
      fs.writeFileSync(path.join(tmpDir, "schema.generated.ts"), "export const x = 1;");
      const input = makeInput(
        path.join(tmpDir, "schema.generated.ts"),
        tmpDir,
      );
      const output = await handleReadHook(input);
      expect(output.exitCode).toBe(2);
      expect(output.stderr).toContain("Refused: GRAFTIGNORE");
    });
  });

  // -----------------------------------------------------------------------
  // Exit code correctness
  // -----------------------------------------------------------------------
  it("exit 0 for allowed, exit 2 for governed", async () => {
    const small = await handleReadHook(makeInput(path.join(FIXTURES, "small.ts")));
    const large = await handleReadHook(makeInput(path.join(FIXTURES, "large.ts")));
    const banned = await handleReadHook(makeInput(path.join(FIXTURES, "ban-targets/.env")));
    const missing = await handleReadHook(makeInput("/nope"));
    expect(small.exitCode).toBe(0);
    expect(large.exitCode).toBe(2);
    expect(banned.exitCode).toBe(2);
    expect(missing.exitCode).toBe(2);
  });
});
