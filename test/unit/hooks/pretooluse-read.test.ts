import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { handleReadHook } from "../../../src/hooks/pretooluse-read.js";
import fs from "node:fs";
import path from "node:path";
import { fixturePath } from "../../helpers/fixtures.js";
import {
  cleanupHookDir,
  createTempHookDir,
  expectGovernedReadGuidance,
  makeFixtureReadHookInput,
} from "../../helpers/hooks.js";

describe("hooks: pretooluse-read", () => {
  // Verify fixture files exist before running tests
  it("fixture small.ts exists", () => {
    expect(fs.existsSync(fixturePath("small.ts"))).toBe(true);
  });

  it("fixture large.ts exists", () => {
    expect(fs.existsSync(fixturePath("large.ts"))).toBe(true);
  });

  // -----------------------------------------------------------------------
  // Allowed (exit 0) — small files and unsupported large files pass through
  // -----------------------------------------------------------------------
  it("allows small files through (exit 0)", () => {
    const output = handleReadHook(
      makeFixtureReadHookInput(fixturePath("small.ts"), "PreToolUse"),
    );
    expect(output.exitCode).toBe(0);
  });

  it("redirects large JS/TS files to graft's bounded-read path", () => {
    const output = handleReadHook(
      makeFixtureReadHookInput(fixturePath("large.ts"), "PreToolUse"),
    );
    expect(output.exitCode).toBe(2);
    expectGovernedReadGuidance(output.stderr);
  });

  it("allows nonexistent files through (exit 0) — let Read handle error", () => {
    const tmpDir = createTempHookDir("graft-hook-missing-");
    try {
      const nonexistent = path.join(tmpDir, "graft-nonexistent-test-file.ts");
      const output = handleReadHook(
        makeFixtureReadHookInput(nonexistent, "PreToolUse"),
      );
      expect(output.exitCode).toBe(0);
    } finally {
      cleanupHookDir(tmpDir);
    }
  });

  it("allows paths outside cwd through (exit 0) — not our concern", () => {
    const outsidePath = path.resolve(process.cwd(), "..", "outside-file.ts");
    const output = handleReadHook(
      makeFixtureReadHookInput(outsidePath, "PreToolUse"),
    );
    expect(output.exitCode).toBe(0);
  });

  it("allows large markdown files through (exit 0) — default governance is code-only for now", () => {
    const tmpDir = createTempHookDir("graft-hook-md-");
    try {
      const markdownPath = path.join(tmpDir, "README.md");
      fs.writeFileSync(markdownPath, "# Heading\n\n" + "Body line.\n".repeat(250));
      const output = handleReadHook(
        makeFixtureReadHookInput(markdownPath, "PreToolUse", tmpDir),
      );
      expect(output.exitCode).toBe(0);
      expect(output.stderr).toBe("");
    } finally {
      cleanupHookDir(tmpDir);
    }
  });

  // -----------------------------------------------------------------------
  // Refused (exit 2) — only banned files are hard-blocked
  // -----------------------------------------------------------------------
  it("blocks binary files", () => {
    const output = handleReadHook(
      makeFixtureReadHookInput(fixturePath("ban-targets/image.png"), "PreToolUse"),
    );
    expect(output.exitCode).toBe(2);
    expect(output.stderr).toContain("Refused: BINARY");
  });

  it("blocks lockfiles", () => {
    const output = handleReadHook(
      makeFixtureReadHookInput(
        fixturePath("ban-targets/package-lock.json"),
        "PreToolUse",
      ),
    );
    expect(output.exitCode).toBe(2);
    expect(output.stderr).toContain("Refused: LOCKFILE");
  });

  it("blocks secret files", () => {
    const output = handleReadHook(
      makeFixtureReadHookInput(fixturePath("ban-targets/.env"), "PreToolUse"),
    );
    expect(output.exitCode).toBe(2);
    expect(output.stderr).toContain("Refused: SECRET");
  });

  it("refusal references graft tools", () => {
    const output = handleReadHook(
      makeFixtureReadHookInput(fixturePath("ban-targets/image.png"), "PreToolUse"),
    );
    expect(output.stderr).toContain("file_outline");
    expect(output.stderr).toContain("safe_read");
  });

  // -----------------------------------------------------------------------
  // .graftignore
  // -----------------------------------------------------------------------
  describe("graftignore", () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = createTempHookDir("graft-hook-");
    });

    afterEach(() => {
      cleanupHookDir(tmpDir);
    });

    it("blocks files matching .graftignore glob patterns", () => {
      fs.writeFileSync(path.join(tmpDir, ".graftignore"), "*.generated.ts\n");
      fs.writeFileSync(
        path.join(tmpDir, "schema.generated.ts"),
        "export const x = 1;",
      );
      const output = handleReadHook(
        makeFixtureReadHookInput(
          path.join(tmpDir, "schema.generated.ts"),
          "PreToolUse",
          tmpDir,
        ),
      );
      expect(output.exitCode).toBe(2);
      expect(output.stderr).toContain("Refused: GRAFTIGNORE");
    });

    it("blocks files matching .graftignore path patterns", () => {
      fs.writeFileSync(
        path.join(tmpDir, ".graftignore"),
        "vendor/**\n",
      );
      fs.mkdirSync(path.join(tmpDir, "vendor"));
      fs.writeFileSync(
        path.join(tmpDir, "vendor", "lib.ts"),
        "export const x = 1;",
      );
      const output = handleReadHook(
        makeFixtureReadHookInput(
          path.join(tmpDir, "vendor", "lib.ts"),
          "PreToolUse",
          tmpDir,
        ),
      );
      expect(output.exitCode).toBe(2);
      expect(output.stderr).toContain("Refused: GRAFTIGNORE");
    });
  });
});
