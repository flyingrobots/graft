import { CanonicalJsonCodec } from "../adapters/canonical-json.js";
import { nodeGit } from "../adapters/node-git.js";
import { attachCliSchemaMeta, validateCliOutput } from "../contracts/output-schemas.js";
import { indexCommits } from "../warp/indexer.js";
import { openWarp } from "../warp/open.js";

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

function parseIndexArgs(args: readonly string[]): { json: boolean; from: string | null } {
  let json = false;
  let from: string | null = null;

  for (const arg of args) {
    if (arg === "--json") {
      json = true;
      continue;
    }
    from ??= arg;
  }

  return { json, from };
}

function writeLine(writer: Writer, line = ""): void {
  writer.write(`${line}\n`);
}

function emitIndexJson(result: Record<string, unknown>, writer: Writer): void {
  writer.write(`${codec.encode(validateCliOutput("index", attachCliSchemaMeta("index", result)))}\n`);
}

export async function runIndex(options: RunIndexOptions = {}): Promise<void> {
  const cwd = options.cwd ?? process.cwd();
  const args = options.args ?? process.argv.slice(3);
  const stdout = options.stdout ?? process.stdout;
  const stderr = options.stderr ?? process.stderr;
  const { json, from } = parseIndexArgs(args);

  try {
    const warp = await openWarp({ cwd });
    const result = await indexCommits(warp, {
      cwd,
      git: nodeGit,
      ...(from !== null ? { from } : {}),
    });

    if (json) {
      emitIndexJson({
        ok: true,
        cwd,
        from,
        commitsIndexed: result.commitsIndexed,
        patchesWritten: result.patchesWritten,
      }, stdout);
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
    if (json) {
      emitIndexJson({ ok: false, cwd, from, error: message }, stdout);
      return;
    }
    writeLine(stderr, `Error: ${message}`);
  }
}
