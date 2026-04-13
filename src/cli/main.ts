import * as path from "node:path";
import { CanonicalJsonCodec } from "../adapters/canonical-json.js";
import {
  CAPABILITY_REGISTRY,
  cliCommandKey,
  cliCommandPath,
  type CliCommandName,
  type McpToolName,
} from "../contracts/capabilities.js";
import {
  attachCliSchemaMeta,
  cliCommandMcpTool,
  validateCliOutput,
} from "../contracts/output-schemas.js";
import { createGraftServer, type McpToolResult } from "../mcp/server.js";
import { startDaemonServer, type GraftDaemonServer } from "../mcp/daemon-server.js";
import { startStdioServer } from "../mcp/stdio-server.js";
import { runIndex } from "./index-cmd.js";
import { runInit } from "./init.js";
import { runLocalHistoryDag } from "./local-history-dag.js";

const codec = new CanonicalJsonCodec();

interface Writer {
  write(chunk: string): unknown;
}

export interface RunCliOptions {
  cwd?: string | undefined;
  args?: readonly string[] | undefined;
  stdout?: Writer | undefined;
  stderr?: Writer | undefined;
  startServer?: ((cwd: string) => Promise<void>) | undefined;
  startDaemon?: ((options: { socketPath?: string | undefined }) => Promise<GraftDaemonServer>) | undefined;
}

interface GlobalCliOptions {
  cwd: string;
  argv: string[];
}

interface ParsedCommand {
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

function writeLine(writer: Writer, line = ""): void {
  writer.write(`${line}\n`);
}

function parseToolResult(result: McpToolResult): Record<string, unknown> {
  const payload = result.content.find((item) => item.type === "text");
  if (payload === undefined) {
    throw new Error("Tool result did not contain a text payload");
  }
  const parsed = JSON.parse(payload.text) as unknown;
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Tool result was not a JSON object");
  }
  return parsed as Record<string, unknown>;
}

function emitPeerCommand(
  command: CliCommandName,
  data: Record<string, unknown>,
  json: boolean,
  writer: Writer,
): void {
  const { _schema: _mcpSchema, ...rest } = data;
  const validated = validateCliOutput(command, attachCliSchemaMeta(command, rest));
  if (json) {
    writer.write(`${codec.encode(validated)}\n`);
    return;
  }
  writer.write(`${JSON.stringify(validated, null, 2)}\n`);
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

function parseDaemonCommand(cwd: string, argv: string[]): { socketPath?: string } {
  const socketPath = consumeOption(argv, "--socket");
  expectNoArgs(argv);
  return socketPath !== undefined ? { socketPath: path.resolve(cwd, socketPath) } : {};
}

function parseGlobalOptions(
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

  throw new Error(`Unknown symbol subcommand: ${subcommand}`);
}

function parseDiagCommand(argv: string[]): ParsedCommand {
  const subcommand = consumePositional(argv, "diag subcommand");
  const json = consumeFlag(argv, "--json");

  if (subcommand === "doctor") {
    expectNoArgs(argv);
    return { command: "diag_doctor", json, args: {} };
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

function parseCommand(argv: string[]): ParsedCommand {
  const group = consumePositional(argv, "command");

  if (group === "read") return parseReadCommand(argv);
  if (group === "struct") return parseStructCommand(argv);
  if (group === "symbol") return parseSymbolCommand(argv);
  if (group === "diag") return parseDiagCommand(argv);

  throw new Error(`Unknown command: ${group}`);
}

function renderHelp(writer: Writer): void {
  writeLine(writer, "graft CLI");
  writeLine(writer);
  writeLine(writer, "No args prints help.");
  writeLine(writer);
  writeLine(writer, "Global options:");
  writeLine(writer, "  --cwd <path>    Run a command against another repo root");
  writeLine(writer, "  help            Show this help");
  writeLine(writer, "  serve           Start the MCP stdio server");
  writeLine(writer, "  daemon          Start the local MCP daemon");
  writeLine(writer);

  const grouped = new Map<string, { path: readonly string[]; description: string }[]>();
  for (const capability of CAPABILITY_REGISTRY) {
    if (capability.cliPath === undefined) continue;
    const section = capability.cliPath.length > 1 ? capability.cliPath[0] : "project";
    const bucket = grouped.get(section) ?? [];
    bucket.push({ path: capability.cliPath, description: capability.description });
    grouped.set(section, bucket);
  }

  for (const section of ["project", "read", "struct", "symbol", "diag"]) {
    const entries = grouped.get(section);
    if (entries === undefined) continue;
    writeLine(writer, `${section}:`);
    for (const entry of entries) {
      writeLine(writer, `  ${entry.path.join(" ")}    ${entry.description}`);
    }
    writeLine(writer);
  }
}

async function invokePeerCommand(
  cwd: string,
  command: CliCommandName,
  tool: McpToolName,
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const server = createGraftServer({
    projectRoot: cwd,
    graftDir: path.join(cwd, ".graft"),
  });
  return parseToolResult(await server.callTool(tool, args));
}

export async function runCli(options: RunCliOptions = {}): Promise<void> {
  const stdout = options.stdout ?? process.stdout;
  const stderr = options.stderr ?? process.stderr;
  const baseCwd = options.cwd ?? process.cwd();
  const { cwd, argv } = parseGlobalOptions(baseCwd, options.args ?? process.argv.slice(2));

  if (argv.length === 0 || argv[0] === "help" || argv[0] === "--help") {
    renderHelp(stdout);
    return;
  }

  if (argv[0] === "init") {
    runInit({ cwd, args: argv.slice(1), stdout, stderr });
    return;
  }

  if (argv[0] === "index") {
    await runIndex({ cwd, args: argv.slice(1), stdout, stderr });
    return;
  }

  if (argv[0] === "serve") {
    if (argv.length > 1) {
      process.exitCode = 1;
      writeLine(stderr, `Error: Unexpected arguments: ${argv.slice(1).join(" ")}`);
      return;
    }
    await (options.startServer ?? startStdioServer)(cwd);
    return;
  }

  if (argv[0] === "daemon") {
    try {
      const daemon = await (options.startDaemon ?? startDaemonServer)(parseDaemonCommand(cwd, argv.slice(1)));
      writeLine(stdout, `Daemon listening on ${daemon.socketPath}`);
    } catch (err: unknown) {
      process.exitCode = 1;
      writeLine(stderr, `Error: ${err instanceof Error ? err.message : String(err)}`);
    }
    return;
  }

  try {
    const parsed = parseCommand([...argv]);
    if (parsed.command === "diag_local_history_dag") {
      await runLocalHistoryDag({
        cwd,
        limit: typeof parsed.args["limit"] === "number" ? parsed.args["limit"] : 12,
        json: parsed.json,
        stdout,
        stderr,
      });
      return;
    }
    const tool = cliCommandMcpTool(parsed.command);
    if (tool === null) {
      throw new Error(`Command ${cliCommandKey(cliCommandPath(parsed.command))} has no MCP peer`);
    }
    const result = await invokePeerCommand(cwd, parsed.command, tool, parsed.args);
    emitPeerCommand(parsed.command, result, parsed.json, stdout);
  } catch (err: unknown) {
    process.exitCode = 1;
    writeLine(stderr, `Error: ${err instanceof Error ? err.message : String(err)}`);
  }
}
