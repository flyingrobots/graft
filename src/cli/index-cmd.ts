import { CanonicalJsonCodec } from "../adapters/canonical-json.js";
import { nodeGit } from "../adapters/node-git.js";
import { nodePathOps } from "../adapters/node-paths.js";
import { attachCliSchemaMeta, validateCliOutput } from "../contracts/output-schemas.js";
import { indexHead } from "../warp/index-head.js";
import { openWarp } from "../warp/open.js";
import { writeCliError } from "./cli-error.js";
import {
  buildIndexCliFailure,
  buildIndexCliSuccess,
  parseIndexCommandArgs,
  type IndexCliResult,
} from "./index-model.js";

const codec = new CanonicalJsonCodec();

interface Writer {
  write(chunk: string): unknown;
}

export interface RunIndexOptions {
  cwd?: string | undefined;
  args?: readonly string[] | undefined;
  stdout?: Writer | undefined;
  stderr?: Writer | undefined;
}

function writeLine(writer: Writer, line = ""): void {
  writer.write(`${line}\n`);
}

function emitIndexJson(result: IndexCliResult, writer: Writer): void {
  writer.write(`${codec.encode(validateCliOutput("index", attachCliSchemaMeta("index", result)))}\n`);
}

export async function runIndex(options: RunIndexOptions = {}): Promise<void> {
  const cwd = options.cwd ?? process.cwd();
  const args = options.args ?? process.argv.slice(3);
  const stdout = options.stdout ?? process.stdout;
  const stderr = options.stderr ?? process.stderr;

  try {
    const { json } = parseIndexCommandArgs(args);
    const app = await openWarp({ cwd });
    const ctx = { app, strandId: null };
    const result = await indexHead({
      cwd,
      git: nodeGit,
      pathOps: nodePathOps,
      ctx,
    });

    if (json) {
      emitIndexJson(buildIndexCliSuccess({
        cwd,
        filesIndexed: result.filesIndexed,
        nodesEmitted: result.nodesEmitted,
      }), stdout);
      return;
    }

    writeLine(stdout);
    writeLine(stdout, `Indexing HEAD in ${cwd}`);
    writeLine(stdout);
    writeLine(stdout, `  files indexed: ${String(result.filesIndexed)}`);
    writeLine(stdout, `  nodes emitted: ${String(result.nodesEmitted)}`);
    writeLine(stdout);
    writeLine(stdout, "Done.");
    writeLine(stdout);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    process.exitCode = 1;
    const parsed = (() => {
      try {
        return parseIndexCommandArgs(args);
      } catch {
        return { json: args.includes("--json") };
      }
    })();
    if (parsed.json) {
      emitIndexJson(buildIndexCliFailure({ cwd, error: message }), stdout);
      return;
    }
    writeCliError(stderr, message, {
      usage: "graft index [--json]",
      nextSteps: ["Use `--json` if you want a machine-readable indexing report."],
    });
  }
}
