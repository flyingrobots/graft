import {
  CAPABILITY_REGISTRY,
  cliCommandKey,
  cliCommandPath,
} from "../contracts/capabilities.js";
import {
  cliCommandMcpTool,
} from "../contracts/output-schemas.js";
import { startDaemonServer, type GraftDaemonServer } from "../mcp/daemon-server.js";
import { startDaemonBackedStdioBridge, type StartDaemonBackedStdioBridgeOptions } from "../mcp/daemon-stdio-bridge.js";
import { startStdioServer } from "../mcp/stdio-server.js";
import {
  parseCommand,
  parseDaemonCommand,
  parseGlobalOptions,
  parseServeCommand,
} from "./command-parser.js";
import { describeCliFailure, writeCliError } from "./cli-error.js";
import { runIndex } from "./index-cmd.js";
import { runInit } from "./init.js";
import { runLocalHistoryDag } from "./local-history-dag.js";
import { runMigrateLocalHistory } from "./migrate-local-history.js";
import { emitPeerCommand, invokePeerCommand, writeLine, type Writer } from "./peer-command.js";

export { resolveEntrypointArgs } from "./command-parser.js";

export interface RunCliOptions {
  cwd?: string | undefined;
  args?: readonly string[] | undefined;
  stdout?: Writer | undefined;
  stderr?: Writer | undefined;
  startServer?: ((cwd: string) => Promise<void>) | undefined;
  startDaemonBridge?: ((options: StartDaemonBackedStdioBridgeOptions) => Promise<void>) | undefined;
  startDaemon?: ((options: { socketPath?: string | undefined }) => Promise<GraftDaemonServer>) | undefined;
}

function renderHelp(writer: Writer): void {
  writeLine(writer, "graft CLI");
  writeLine(writer);
  writeLine(writer, "No args prints help.");
  writeLine(writer);
  writeLine(writer, "Global options:");
  writeLine(writer, "  --cwd <path>    Run a command against another repo root");
  writeLine(writer, "  help            Show this help");
  writeLine(writer, "  serve           Start the repo-local MCP stdio server");
  writeLine(writer, "  serve --runtime daemon");
  writeLine(writer, "                  Start stdio bridge to the local graft daemon");
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

  for (const section of ["project", "migrate", "read", "struct", "symbol", "diag"]) {
    const entries = grouped.get(section);
    if (entries === undefined) continue;
    writeLine(writer, `${section}:`);
    for (const entry of entries) {
      writeLine(writer, `  ${entry.path.join(" ")}    ${entry.description}`);
    }
    writeLine(writer);
  }
}

export async function runCli(options: RunCliOptions = {}): Promise<void> {
  const stdout = options.stdout ?? process.stdout;
  const stderr = options.stderr ?? process.stderr;
  const baseCwd = options.cwd ?? process.cwd();
  let cwd: string;
  let argv: string[];
  try {
    ({ cwd, argv } = parseGlobalOptions(baseCwd, options.args ?? process.argv.slice(2)));
  } catch (err: unknown) {
    process.exitCode = 1;
    writeCliError(stderr, err instanceof Error ? err.message : String(err), {
      usage: "graft [--cwd <path>] <command> ...",
      nextSteps: ["Run `graft help` to see the grouped command surface."],
    });
    return;
  }

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
    try {
      const parsedServe = parseServeCommand(cwd, argv.slice(1));
      if (parsedServe.runtime === "daemon") {
        await (options.startDaemonBridge ?? startDaemonBackedStdioBridge)({
          ...(parsedServe.socketPath !== undefined ? { socketPath: parsedServe.socketPath } : {}),
          ...(parsedServe.spawnIfMissing !== undefined ? { spawnIfMissing: parsedServe.spawnIfMissing } : {}),
        });
        return;
      }
      await (options.startServer ?? startStdioServer)(cwd);
    } catch (err: unknown) {
      process.exitCode = 1;
      writeCliError(stderr, err instanceof Error ? err.message : String(err), describeCliFailure(argv));
    }
    return;
  }

  if (argv[0] === "daemon") {
    try {
      const daemon = await (options.startDaemon ?? startDaemonServer)(parseDaemonCommand(cwd, argv.slice(1)));
      writeLine(stdout, `Daemon listening on ${daemon.socketPath}`);
    } catch (err: unknown) {
      process.exitCode = 1;
      writeCliError(stderr, err instanceof Error ? err.message : String(err), describeCliFailure(argv));
    }
    return;
  }

  try {
    const parsed = parseCommand([...argv]);
    if (parsed.command === "migrate_local_history") {
      await runMigrateLocalHistory({
        cwd,
        json: parsed.json,
        stdout,
        stderr,
      });
      return;
    }
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
    const result = await invokePeerCommand(cwd, tool, parsed.args);
    emitPeerCommand(parsed.command, result, parsed.json, stdout);
  } catch (err: unknown) {
    process.exitCode = 1;
    writeCliError(stderr, err instanceof Error ? err.message : String(err), describeCliFailure(argv));
  }
}
