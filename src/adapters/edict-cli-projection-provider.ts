import type { ProcessRunner } from "../ports/process-runner.js";
import {
  EdictProjectionError,
  projectEdictJsonlRecords,
} from "../operations/edict-projection.js";
import type {
  EdictProjectionBundle,
  EdictProjectionCompilerContext,
  EdictProjectionProvider,
  EdictProjectionRequest,
  EdictProjectionTargetSettings,
} from "../operations/edict-projection.js";

export interface CreateEdictCliProjectionProviderOptions {
  readonly processRunner: ProcessRunner;
  readonly cwd: string;
  readonly command?: string | undefined;
  readonly compilerContext?: EdictProjectionCompilerContext | undefined;
  readonly target?: EdictProjectionTargetSettings | undefined;
  readonly timeoutMs?: number | undefined;
  readonly maxBufferBytes?: number | undefined;
}

function parseJsonl(text: string): unknown[] {
  const records: unknown[] = [];
  const lines = text.split(/\r?\n/u);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]?.trim();
    if (line === undefined || line.length === 0) {
      continue;
    }
    try {
      records.push(JSON.parse(line) as unknown);
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown JSON parse error";
      throw new EdictProjectionError(`Edict projection JSONL line ${String(index + 1)} is invalid: ${message}`);
    }
  }
  return records;
}

function serializeJsonl(records: readonly unknown[]): string {
  return records.map((record) => JSON.stringify(record)).join("\n") + "\n";
}

function buildRequestJsonl(
  request: EdictProjectionRequest,
  options: CreateEdictCliProjectionProviderOptions,
): string {
  const compilerContext = request.compilerContext ?? options.compilerContext;
  const target = request.target ?? options.target;
  const settings = {
    schema: "edict.compiler.settings/v1",
    type: "compilerSettings",
    operation: "project",
    emit: request.emit,
    ...(compilerContext !== undefined ? { compilerContext } : {}),
    ...(target !== undefined ? { target } : {}),
  };
  return serializeJsonl([
    settings,
    {
      schema: "edict.compiler.input/v1",
      type: "compilerInput",
      kind: "source",
      name: request.name,
      source: request.content,
    },
  ]);
}

export function createEdictCliProjectionProvider(
  options: CreateEdictCliProjectionProviderOptions,
): EdictProjectionProvider {
  const command = options.command ?? "edict";
  const timeoutMs = options.timeoutMs ?? 5_000;
  const maxBufferBytes = options.maxBufferBytes ?? 8 * 1024 * 1024;

  return {
    project(input): EdictProjectionBundle {
      const result = options.processRunner.run({
        command,
        args: [],
        cwd: options.cwd,
        stdin: buildRequestJsonl(input, options),
        timeoutMs,
        maxBufferBytes,
      });

      if (result.error !== undefined || result.status !== 0) {
        const stderr = result.stderr.trim();
        const reason = result.error?.message ?? (stderr.length > 0 ? stderr : `status ${String(result.status)}`);
        throw new EdictProjectionError(`Edict projection command failed: ${reason}`);
      }
      if (result.stderr.trim().length > 0) {
        throw new EdictProjectionError("Edict projection command wrote stderr on successful status");
      }

      return projectEdictJsonlRecords(input, parseJsonl(result.stdout));
    },
  };
}
