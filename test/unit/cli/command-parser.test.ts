import { describe, expect, it } from "vitest";
import { parseCommand } from "../../../src/cli/command-parser.js";

describe("cli: command parser", () => {
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

  it("routes symbol show --history into the code_show peer args", () => {
    expect(parseCommand([
      "symbol",
      "show",
      "greet",
      "--path",
      "app.ts",
      "--history",
      "--json",
    ])).toEqual({
      command: "symbol_show",
      json: true,
      args: {
        symbol: "greet",
        path: "app.ts",
        history: true,
      },
    });
  });
});
