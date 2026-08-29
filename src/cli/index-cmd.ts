import * as path from "node:path";
import { CanonicalJsonCodec } from "../adapters/canonical-json.js";
import { nodeGit } from "../adapters/node-git.js";
import { nodePathOps } from "../adapters/node-paths.js";
import { attachCliSchemaMeta, validateCliOutput } from "../contracts/output-schemas.js";
import { indexHead } from "../warp/index-head.js";
import { writeCliError } from "./cli-error.js";
import { openCliWarp } from "./warp-sidecar.js";
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
  graphRoot?: string | undefined;
  args?: readonly string[] | undefined;
  stdout?: Writer | undefined;
  stderr?: Writer | undefined;
  exit?: ((code?: number) => never) | undefined;
}

function writeLine(writer: Writer, line = ""): void {
  writer.write(`${line}\n`);
}

function emitIndexJson(result: IndexCliResult, writer: Writer): void {
  writer.write(`${codec.encode(validateCliOutput("index", attachCliSchemaMeta("index", result)))}\n`);
}

function resolveIndexPaths(
  requestedCwd: string,
  worktreeRoot: string,
  requestedPaths: readonly string[],
): readonly string[] {
  return requestedPaths.map((requestedPath) => {
    const relative = path.relative(worktreeRoot, path.resolve(requestedCwd, requestedPath));
    if (relative === "" || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
      throw new Error(`Index path is outside the resolved Git worktree: ${requestedPath}`);
    }
    return relative.split(path.sep).join("/");
  });
}

export async function runIndex(options: RunIndexOptions = {}): Promise<void> {
  const cwd = options.cwd ?? process.cwd();
  const args = options.args ?? process.argv.slice(3);
  const stdout = options.stdout ?? process.stdout;
  const stderr = options.stderr ?? process.stderr;
  const exit = options.exit;

  try {
    const { json, paths } = parseIndexCommandArgs(args);
    const opened = await openCliWarp({
      cwd,
      ...(options.graphRoot !== undefined ? { graphRoot: options.graphRoot } : {}),
    });
    const { app } = opened;
    const worktreeRoot = opened.workspace.worktreeRoot;
    const resolvedPaths = resolveIndexPaths(cwd, worktreeRoot, paths);
    const ctx = { app, strandId: null };
    const result = await indexHead({
      cwd: worktreeRoot,
      git: nodeGit,
      pathOps: nodePathOps,
      ctx,
      ...(resolvedPaths.length > 0 ? { paths: resolvedPaths } : {}),
    });

    if (json) {
      emitIndexJson(buildIndexCliSuccess({
        cwd,
        filesIndexed: result.filesIndexed,
        nodesEmitted: result.nodesEmitted,
      }), stdout);
      exit?.(0);
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
    exit?.(0);
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
      usage: "graft index [--path <path>] [--json]",
      nextSteps: ["Use `--path <path>` for lazy per-file indexing and `--json` for machine-readable output."],
    });
  }
}
