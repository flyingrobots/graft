import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runIndex } from "../../../src/cli/index-cmd.js";
import { cleanupTestRepo, createTestRepo, git } from "../../helpers/git.js";
import { createBufferWriter } from "../../helpers/init.js";

describe("cli: graft index", () => {
  let previousExitCode: typeof process.exitCode;
  const cleanups: string[] = [];

  beforeEach(() => {
    previousExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.exitCode = previousExitCode;
    while (cleanups.length > 0) {
      cleanupTestRepo(cleanups.pop()!);
    }
  });

  it("reports argument errors with usage guidance", async () => {
    const stdout = createBufferWriter();
    const stderr = createBufferWriter();

    await runIndex({
      args: ["--bad-flag"],
      stdout,
      stderr,
    });

    expect(stdout.text()).toBe("");
    expect(stderr.text()).toContain("Unknown index arguments: --bad-flag");
    expect(stderr.text()).toContain("Usage: graft index [--path <path>] [--json]");
    expect(stderr.text()).toContain("docs/CLI.md");
    expect(process.exitCode).toBe(1);
  });

  it("keeps json-mode failures machine-readable even when argument parsing fails", async () => {
    const stdout = createBufferWriter();
    const stderr = createBufferWriter();

    await runIndex({
      args: ["--json", "--bad-flag"],
      stdout,
      stderr,
    });

    expect(stderr.text()).toBe("");
    const parsed = JSON.parse(stdout.text()) as {
      _schema: { id: string };
      ok: boolean;
      error: string;
    };
    expect(parsed._schema.id).toBe("graft.cli.index");
    expect(parsed.ok).toBe(false);
    expect(parsed.error).toContain("Unknown index arguments: --bad-flag");
    expect(process.exitCode).toBe(1);
  });

  it("calls the injected exit hook after successful json output", async () => {
    const repoDir = createTestRepo("graft-index-exit-");
    cleanups.push(repoDir);
    fs.writeFileSync(path.join(repoDir, "app.ts"), "export const ready = true;\n");
    git(repoDir, "add -A");
    git(repoDir, "commit -m init");
    const stdout = createBufferWriter();
    const stderr = createBufferWriter();
    const exits: number[] = [];

    await runIndex({
      cwd: repoDir,
      args: ["--json"],
      stdout,
      stderr,
      exit: (code = 0) => {
        exits.push(code);
        return undefined as never;
      },
    });

    expect(stderr.text()).toBe("");
    expect(JSON.parse(stdout.text())).toMatchObject({ ok: true });
    expect(exits).toEqual([0]);
  });
});
