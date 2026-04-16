import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runIndex } from "../../../src/cli/index-cmd.js";
import { createBufferWriter } from "../../helpers/init.js";

describe("cli: graft index", () => {
  let previousExitCode: typeof process.exitCode;

  beforeEach(() => {
    previousExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.exitCode = previousExitCode;
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
    expect(stderr.text()).toContain("Usage: graft index [<from-ref>] [--json]");
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
});
