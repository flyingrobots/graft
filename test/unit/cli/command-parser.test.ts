import { describe, expect, it } from "vitest";
import { parseCommand } from "../../../src/cli/command-parser.js";

describe("cli: command parser", () => {
  it("routes top-level review into the structural review peer command", () => {
    expect(parseCommand(["review", "--base", "HEAD~1"])).toEqual({
      command: "struct_review",
      json: false,
      args: { base: "HEAD~1" },
    });

    expect(parseCommand(["review", "--base", "origin/main", "--head", "HEAD", "--json"])).toEqual({
      command: "struct_review",
      json: true,
      args: { base: "origin/main", head: "HEAD" },
    });
  });

  it("requires --base for structural review commands", () => {
    expect(() => parseCommand(["review"])).toThrow("Missing --base");
    expect(() => parseCommand(["review", "--head", "HEAD"])).toThrow("Missing --base");
    expect(() => parseCommand(["struct", "review"])).toThrow("Missing --base");
    expect(() => parseCommand(["struct", "review", "--head", "HEAD"])).toThrow("Missing --base");
  });

  it("routes structural test coverage into the peer command", () => {
    expect(parseCommand(["struct", "test-coverage"])).toEqual({
      command: "struct_test_coverage",
      json: false,
      args: {},
    });

    expect(parseCommand([
      "struct",
      "test-coverage",
      "--src",
      "packages/core/src",
      "--tests",
      "packages/core/test",
      "--json",
    ])).toEqual({
      command: "struct_test_coverage",
      json: true,
      args: { sourcePath: "packages/core/src", testPath: "packages/core/test" },
    });
  });

  it("routes dead symbol detection into the peer command", () => {
    expect(parseCommand(["struct", "dead-symbols", "--limit", "12", "--json"])).toEqual({
      command: "struct_dead_symbols",
      json: true,
      args: { maxCommits: 12 },
    });
  });

  it("routes review cooldown into a CLI-only command", () => {
    expect(parseCommand([
      "review",
      "cooldown",
      "--pr",
      "48",
      "--comments-file",
      "comments.json",
      "--now",
      "2026-05-05T15:10:00.000Z",
      "--json",
    ])).toEqual({
      command: "review_cooldown",
      json: true,
      args: {
        pr: "48",
        commentsFile: "comments.json",
        now: "2026-05-05T15:10:00.000Z",
      },
    });
  });

  it("routes symbol history through the structural blame peer command", () => {
    expect(parseCommand(["symbol", "history", "buildThing", "--path", "src/api.ts"])).toEqual({
      command: "symbol_blame",
      json: false,
      args: { symbol: "buildThing", path: "src/api.ts" },
    });
  });

  it("routes enhance --since with optional --head and --json into one CLI command", () => {
    expect(parseCommand(["enhance", "--since", "HEAD~1"])).toEqual({
      command: "git_graft_enhance",
      json: false,
      args: { since: "HEAD~1" },
    });

    expect(parseCommand(["enhance", "--since", "HEAD~1", "--head", "HEAD"])).toEqual({
      command: "git_graft_enhance",
      json: false,
      args: { since: "HEAD~1", head: "HEAD" },
    });

    expect(parseCommand(["enhance", "--since", "HEAD~1", "--json"])).toEqual({
      command: "git_graft_enhance",
      json: true,
      args: { since: "HEAD~1" },
    });
  });

  it("rejects unsupported enhance subcommands instead of wrapping arbitrary git commands", () => {
    expect(() => parseCommand(["enhance", "log", "HEAD~3"])).toThrow("Unexpected arguments");
    expect(() => parseCommand(["enhance", "--since", "HEAD~1", "diff"])).toThrow("Unexpected arguments");
  });
});
