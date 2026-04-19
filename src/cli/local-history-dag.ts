import { CanonicalJsonCodec } from "../adapters/canonical-json.js";
import { attachCliSchemaMeta, validateCliOutput } from "../contracts/output-schemas.js";
import {
  DEFAULT_LOCAL_HISTORY_DAG_LIMIT,
  type LocalHistoryDagEdge,
  type LocalHistoryDagModel,
  type LocalHistoryDagNode,
  loadLocalHistoryDagModel,
} from "./local-history-dag-model.js";
import { renderLocalHistoryDag } from "./local-history-dag-render.js";

const codec = new CanonicalJsonCodec();

interface Writer {
  write(chunk: string): unknown;
}

export interface RunLocalHistoryDagOptions {
  readonly cwd: string;
  readonly limit: number;
  readonly json: boolean;
  readonly stdout?: Writer | undefined;
  readonly stderr?: Writer | undefined;
}

interface LocalHistoryDagPayload {
  readonly cwd: string;
  readonly repoId: string;
  readonly worktreeId: string;
  readonly requestedEventLimit: number;
  readonly totalEventCount: number;
  readonly shownEventCount: number;
  readonly nodeCount: number;
  readonly edgeCount: number;
  readonly truncated: boolean;
  readonly rendered: string;
  readonly nodes: readonly LocalHistoryDagNode[];
  readonly edges: readonly LocalHistoryDagEdge[];
  readonly error?: string | undefined;
}

function writeLine(writer: Writer, line = ""): void {
  writer.write(`${line}\n`);
}

function emitJson(payload: LocalHistoryDagPayload, writer: Writer): void {
  writer.write(
    `${codec.encode(validateCliOutput("diag_local_history_dag", attachCliSchemaMeta("diag_local_history_dag", payload)))}\n`,
  );
}

function toPayload(model: LocalHistoryDagModel): LocalHistoryDagPayload {
  return {
    ...model,
    rendered: renderLocalHistoryDag(model),
  };
}

function buildErrorPayload(cwd: string, limit: number, error: string): LocalHistoryDagPayload {
  return {
    cwd,
    repoId: "unknown",
    worktreeId: "unknown",
    requestedEventLimit: limit,
    totalEventCount: 0,
    shownEventCount: 0,
    nodeCount: 0,
    edgeCount: 0,
    truncated: false,
    rendered: "",
    nodes: [],
    edges: [],
    error,
  };
}

export async function runLocalHistoryDag(options: RunLocalHistoryDagOptions): Promise<void> {
  const stdout = options.stdout ?? process.stdout;
  const stderr = options.stderr ?? process.stderr;
  const limit = options.limit > 0 ? options.limit : DEFAULT_LOCAL_HISTORY_DAG_LIMIT;

  try {
    const payload = toPayload(await loadLocalHistoryDagModel({
      cwd: options.cwd,
      limit,
    }));

    if (options.json) {
      emitJson(payload, stdout);
      return;
    }

    writeLine(stdout, payload.rendered);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    process.exitCode = 1;
    if (options.json) {
      emitJson(buildErrorPayload(options.cwd, limit, message), stdout);
      return;
    }
    writeLine(stderr, `Error: ${message}`);
  }
}
