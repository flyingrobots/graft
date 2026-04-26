import * as path from "node:path";
import type { CliCommandName } from "../contracts/capabilities.js";

export interface GlobalCliOptions {
  cwd: string;
  argv: string[];
}

export interface ParsedCommand {
  command: CliCommandName;
  json: boolean;
  args: Record<string, unknown>;
}

export function resolveEntrypointArgs(
  args: readonly string[],
  stdinIsTTY: boolean | undefined,
  stdoutIsTTY: boolean | undefined,
): string[] {
  if (args.length === 0 && stdinIsTTY !== true && stdoutIsTTY !== true) {
    return ["serve"];
  }
  return [...args];
}

function consumeFlag(args: string[], flag: string): boolean {
  const index = args.indexOf(flag);
  if (index === -1) return false;
  args.splice(index, 1);
  return true;
}

function consumeOption(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index === -1) return undefined;
  if (index === args.length - 1) {
    throw new Error(`Missing value for ${flag}`);
  }
  const [value] = args.splice(index, 2).slice(1);
  return value;
}

function consumePositional(args: string[], label: string): string {
  const value = args.shift();
  if (value === undefined) {
    throw new Error(`Missing ${label}`);
  }
  return value;
}

function expectNoArgs(args: string[]): void {
  if (args.length > 0) {
    throw new Error(`Unexpected arguments: ${args.join(" ")}`);
  }
}

function parsePositiveInt(raw: string | undefined, flag: string): number {
  if (raw === undefined) {
    throw new Error(`Missing value for ${flag}`);
  }
  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${flag} must be a positive integer`);
  }
  return value;
}

export function parseDaemonCommand(cwd: string, argv: string[]): { socketPath?: string } {
  const socketPath = consumeOption(argv, "--socket");
  expectNoArgs(argv);
  return socketPath !== undefined ? { socketPath: path.resolve(cwd, socketPath) } : {};
}

export function parseGlobalOptions(
  cwd: string,
  args: readonly string[],
): GlobalCliOptions {
  const rest = [...args];
  const override = consumeOption(rest, "--cwd");
  return {
    cwd: override !== undefined ? path.resolve(cwd, override) : cwd,
    argv: rest,
  };
}

function parseReadCommand(argv: string[]): ParsedCommand {
  const subcommand = consumePositional(argv, "read subcommand");
  const json = consumeFlag(argv, "--json");

  if (subcommand === "safe") {
    const filePath = consumePositional(argv, "path");
    expectNoArgs(argv);
    return { command: "read_safe", json, args: { path: filePath } };
  }

  if (subcommand === "outline") {
    const filePath = consumePositional(argv, "path");
    expectNoArgs(argv);
    return { command: "read_outline", json, args: { path: filePath } };
  }

  if (subcommand === "range") {
    const filePath = consumePositional(argv, "path");
    const start = parsePositiveInt(consumeOption(argv, "--start"), "--start");
    const end = parsePositiveInt(consumeOption(argv, "--end"), "--end");
    expectNoArgs(argv);
    return { command: "read_range", json, args: { path: filePath, start, end } };
  }

  if (subcommand === "changed") {
    const filePath = consumePositional(argv, "path");
    const consume = consumeFlag(argv, "--consume");
    expectNoArgs(argv);
    return { command: "read_changed", json, args: { path: filePath, consume } };
  }

  throw new Error(`Unknown read subcommand: ${subcommand}`);
}

function parseStructCommand(argv: string[]): ParsedCommand {
  const subcommand = consumePositional(argv, "struct subcommand");
  const json = consumeFlag(argv, "--json");

  if (subcommand === "diff") {
    const base = consumeOption(argv, "--base");
    const head = consumeOption(argv, "--head");
    const filePath = consumeOption(argv, "--path");
    expectNoArgs(argv);
    return {
      command: "struct_diff",
      json,
      args: {
        ...(base !== undefined ? { base } : {}),
        ...(head !== undefined ? { head } : {}),
        ...(filePath !== undefined ? { path: filePath } : {}),
      },
    };
  }

  if (subcommand === "since") {
    const base = consumePositional(argv, "base ref");
    const head = consumeOption(argv, "--head");
    expectNoArgs(argv);
    return {
      command: "struct_since",
      json,
      args: {
        base,
        ...(head !== undefined ? { head } : {}),
      },
    };
  }

  if (subcommand === "map") {
    const directory = argv[0]?.startsWith("--") === false ? consumePositional(argv, "directory") : undefined;
    expectNoArgs(argv);
    return {
      command: "struct_map",
      json,
      args: directory !== undefined ? { path: directory } : {},
    };
  }

  if (subcommand === "churn") {
    const filePath = consumeOption(argv, "--path");
    const limitRaw = consumeOption(argv, "--limit");
    expectNoArgs(argv);
    return {
      command: "struct_churn",
      json,
      args: {
        ...(filePath !== undefined ? { path: filePath } : {}),
        ...(limitRaw !== undefined ? { limit: parsePositiveInt(limitRaw, "--limit") } : {}),
      },
    };
  }

  if (subcommand === "exports") {
    const base = argv[0]?.startsWith("--") === false ? consumePositional(argv, "base ref") : undefined;
    const head = argv[0]?.startsWith("--") === false ? consumePositional(argv, "head ref") : undefined;
    expectNoArgs(argv);
    return {
      command: "struct_exports",
      json,
      args: {
        ...(base !== undefined ? { base } : {}),
        ...(head !== undefined ? { head } : {}),
      },
    };
  }

  if (subcommand === "log") {
    const since = consumeOption(argv, "--since");
    const filePath = consumeOption(argv, "--path");
    const limitRaw = consumeOption(argv, "--limit");
    expectNoArgs(argv);
    return {
      command: "struct_log",
      json,
      args: {
        ...(since !== undefined ? { since } : {}),
        ...(filePath !== undefined ? { path: filePath } : {}),
        ...(limitRaw !== undefined ? { limit: parsePositiveInt(limitRaw, "--limit") } : {}),
      },
    };
  }

  if (subcommand === "review") {
    const base = consumeOption(argv, "--base");
    const head = consumeOption(argv, "--head");
    expectNoArgs(argv);
    return {
      command: "struct_review",
      json,
      args: {
        ...(base !== undefined ? { base } : {}),
        ...(head !== undefined ? { head } : {}),
      },
    };
  }

  throw new Error(`Unknown struct subcommand: ${subcommand}`);
}

function parseSymbolCommand(argv: string[]): ParsedCommand {
  const subcommand = consumePositional(argv, "symbol subcommand");
  const json = consumeFlag(argv, "--json");

  if (subcommand === "show") {
    const symbol = consumePositional(argv, "symbol");
    const filePath = consumeOption(argv, "--path");
    const ref = consumeOption(argv, "--ref");
    expectNoArgs(argv);
    return {
      command: "symbol_show",
      json,
      args: {
        symbol,
        ...(filePath !== undefined ? { path: filePath } : {}),
        ...(ref !== undefined ? { ref } : {}),
      },
    };
  }

  if (subcommand === "find") {
    const query = consumePositional(argv, "query");
    const kind = consumeOption(argv, "--kind");
    const filePath = consumeOption(argv, "--path");
    expectNoArgs(argv);
    return {
      command: "symbol_find",
      json,
      args: {
        query,
        ...(kind !== undefined ? { kind } : {}),
        ...(filePath !== undefined ? { path: filePath } : {}),
      },
    };
  }

  if (subcommand === "blame") {
    const symbol = consumePositional(argv, "symbol");
    const filePath = consumeOption(argv, "--path");
    expectNoArgs(argv);
    return {
      command: "symbol_blame",
      json,
      args: {
        symbol,
        ...(filePath !== undefined ? { path: filePath } : {}),
      },
    };
  }

  if (subcommand === "difficulty") {
    const symbol = consumePositional(argv, "symbol");
    const filePath = consumeOption(argv, "--path");
    const limitRaw = consumeOption(argv, "--limit");
    expectNoArgs(argv);
    return {
      command: "symbol_difficulty",
      json,
      args: {
        symbol,
        ...(filePath !== undefined ? { path: filePath } : {}),
        ...(limitRaw !== undefined ? { limit: parsePositiveInt(limitRaw, "--limit") } : {}),
      },
    };
  }

  throw new Error(`Unknown symbol subcommand: ${subcommand}`);
}

function parseMigrateCommand(argv: string[]): ParsedCommand {
  const subcommand = consumePositional(argv, "migrate subcommand");
  const json = consumeFlag(argv, "--json");

  if (subcommand === "local-history") {
    expectNoArgs(argv);
    return {
      command: "migrate_local_history",
      json,
      args: {},
    };
  }

  throw new Error(`Unknown migrate subcommand: ${subcommand}`);
}

function parseDiagCommand(argv: string[]): ParsedCommand {
  const subcommand = consumePositional(argv, "diag subcommand");
  const json = consumeFlag(argv, "--json");

  if (subcommand === "doctor") {
    const sludge = consumeFlag(argv, "--sludge");
    const filePath = consumeOption(argv, "--path");
    expectNoArgs(argv);
    return {
      command: "diag_doctor",
      json,
      args: {
        ...(sludge ? { sludge } : {}),
        ...(filePath !== undefined ? { path: filePath } : {}),
      },
    };
  }

  if (subcommand === "activity") {
    const limit = consumeOption(argv, "--limit");
    expectNoArgs(argv);
    return {
      command: "diag_activity",
      json,
      args: {
        ...(limit !== undefined ? { limit: parsePositiveInt(limit, "--limit") } : {}),
      },
    };
  }

  if (subcommand === "local-history-dag") {
    const limit = consumeOption(argv, "--limit");
    expectNoArgs(argv);
    return {
      command: "diag_local_history_dag",
      json,
      args: {
        ...(limit !== undefined ? { limit: parsePositiveInt(limit, "--limit") } : {}),
      },
    };
  }

  if (subcommand === "explain") {
    const code = consumePositional(argv, "reason code");
    expectNoArgs(argv);
    return { command: "diag_explain", json, args: { code } };
  }

  if (subcommand === "stats") {
    expectNoArgs(argv);
    return { command: "diag_stats", json, args: {} };
  }

  if (subcommand === "capture") {
    const tail = consumeOption(argv, "--tail");
    const separator = argv.indexOf("--");
    const commandTokens = separator === -1 ? [...argv] : argv.slice(separator + 1);
    if (separator !== -1) {
      argv.splice(separator);
    } else {
      argv.length = 0;
    }
    expectNoArgs(argv);
    if (commandTokens.length === 0) {
      throw new Error("Missing shell command");
    }
    return {
      command: "diag_capture",
      json,
      args: {
        command: commandTokens.join(" "),
        ...(tail !== undefined ? { tail: parsePositiveInt(tail, "--tail") } : {}),
      },
    };
  }

  throw new Error(`Unknown diag subcommand: ${subcommand}`);
}

export function parseCommand(argv: string[]): ParsedCommand {
  const group = consumePositional(argv, "command");

  if (group === "doctor") {
    const json = consumeFlag(argv, "--json");
    const sludge = consumeFlag(argv, "--sludge");
    const filePath = consumeOption(argv, "--path");
    expectNoArgs(argv);
    return {
      command: "diag_doctor",
      json,
      args: {
        ...(sludge ? { sludge } : {}),
        ...(filePath !== undefined ? { path: filePath } : {}),
      },
    };
  }
  if (group === "read") return parseReadCommand(argv);
  if (group === "struct") return parseStructCommand(argv);
  if (group === "symbol") return parseSymbolCommand(argv);
  if (group === "migrate") return parseMigrateCommand(argv);
  if (group === "diag") return parseDiagCommand(argv);

  throw new Error(`Unknown command: ${group}`);
}
