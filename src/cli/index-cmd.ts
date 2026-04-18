import { CanonicalJsonCodec } from "../adapters/canonical-json.js";
import { nodeGit } from "../adapters/node-git.js";
import { attachCliSchemaMeta, validateCliOutput } from "../contracts/output-schemas.js";
import { indexCommits } from "../warp/indexer.js";
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
    const { json, from } = parseIndexCommandArgs(args);
    const warp = await openWarp({ cwd });
    const result = await indexCommits(warp, {
      cwd,
      git: nodeGit,
      ...(from !== null ? { from } : {}),
    });

    if (!result.ok) {
      throw new Error(result.error);
    }

    if (json) {
      emitIndexJson(buildIndexCliSuccess({
        cwd,
        from,
        commitsIndexed: result.commitsIndexed,
        patchesWritten: result.patchesWritten,
      }), stdout);
      return;
    }

    writeLine(stdout);
    writeLine(stdout, `Indexing structural history in ${cwd}`);
    writeLine(stdout);
    writeLine(stdout, `  commits indexed: ${String(result.commitsIndexed)}`);
    writeLine(stdout, `  patches written: ${String(result.patchesWritten)}`);
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
        return {
          json: args.includes("--json"),
          from: args.find((arg) => arg !== "--json" && !arg.startsWith("--")) ?? null,
        };
      }
    })();
    if (parsed.json) {
      emitIndexJson(buildIndexCliFailure({ cwd, from: parsed.from, error: message }), stdout);
      return;
    }
    writeCliError(stderr, message, {
      usage: "graft index [<from-ref>] [--json]",
      nextSteps: ["Use `--json` if you want a machine-readable indexing report."],
    });
  }
}
