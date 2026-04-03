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
  // Content projection (small files)
  // -----------------------------------------------------------------------
  it("returns content for small files", async () => {
    const input = makeInput(path.join(FIXTURES, "small.ts"));
    const output = await handleReadHook(input);
    expect(output.exitCode).toBe(2);
    expect(output.stderr).toContain("[graft]");
    expect(output.stderr).toContain("export function greet");
  });

  it("includes line count and byte count in content response", async () => {
    const input = makeInput(path.join(FIXTURES, "small.ts"));
    const output = await handleReadHook(input);
    expect(output.stderr).toMatch(/\d+ lines/);
    expect(output.stderr).toMatch(/\d+ bytes/);
  });

  it("respects offset and limit for content", async () => {
    const input = makeInput(path.join(FIXTURES, "medium.ts"));
    input.tool_input.offset = 0;
    input.tool_input.limit = 3;
    const output = await handleReadHook(input);
    const contentLines = output.stderr.split("\n").slice(2); // skip header + blank
    expect(contentLines.length).toBeLessThanOrEqual(5); // 3 content lines + some metadata
  });

  // -----------------------------------------------------------------------
  // Outline projection (large files)
  // -----------------------------------------------------------------------
  it("returns outline for large files", async () => {
    const input = makeInput(path.join(FIXTURES, "large.ts"));
    const output = await handleReadHook(input);
    expect(output.exitCode).toBe(2);
    expect(output.stderr).toContain("exceeds threshold");
    expect(output.stderr).toContain("read_range");
    expect(output.stderr).toContain("outline");
    expect(output.stderr).toContain("jumpTable");
  });

  it("outline includes jump table entries", async () => {
    const input = makeInput(path.join(FIXTURES, "large.ts"));
    const output = await handleReadHook(input);
    expect(output.stderr).toContain('"symbol"');
    expect(output.stderr).toContain('"start"');
    expect(output.stderr).toContain('"end"');
  });

  // -----------------------------------------------------------------------
  // Refused projection (banned files)
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

  it("refused response includes next steps", async () => {
    const input = makeInput(path.join(FIXTURES, "ban-targets/image.png"));
    const output = await handleReadHook(input);
    expect(output.stderr).toContain("Next steps:");
  });

  // -----------------------------------------------------------------------
  // Error handling
  // -----------------------------------------------------------------------
  it("returns error for nonexistent files", async () => {
    const input = makeInput("/nonexistent/file.ts");
    const output = await handleReadHook(input);
    expect(output.exitCode).toBe(2);
    expect(output.stderr).toContain("File not found");
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
  // Always exits 2
  // -----------------------------------------------------------------------
  it("always exits with code 2", async () => {
    const small = await handleReadHook(makeInput(path.join(FIXTURES, "small.ts")));
    const large = await handleReadHook(makeInput(path.join(FIXTURES, "large.ts")));
    const banned = await handleReadHook(makeInput(path.join(FIXTURES, "ban-targets/.env")));
    const missing = await handleReadHook(makeInput("/nope"));
    expect(small.exitCode).toBe(2);
    expect(large.exitCode).toBe(2);
    expect(banned.exitCode).toBe(2);
    expect(missing.exitCode).toBe(2);
  });
});
