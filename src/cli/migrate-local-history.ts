import * as path from "node:path";
import { CanonicalJsonCodec } from "../adapters/canonical-json.js";
import { nodeFs } from "../adapters/node-fs.js";
import { attachCliSchemaMeta, validateCliOutput } from "../contracts/output-schemas.js";
import { migrateLegacyPersistedLocalHistoryToGraph } from "../mcp/persisted-local-history.js";
import { openWarp } from "../warp/open.js";

const codec = new CanonicalJsonCodec();

interface Writer {
  write(chunk: string): unknown;
}

export interface RunMigrateLocalHistoryOptions {
  readonly cwd: string;
  readonly json: boolean;
  readonly stdout?: Writer | undefined;
  readonly stderr?: Writer | undefined;
}

interface MigrateLocalHistoryPayload {
  readonly cwd: string;
  readonly graftDir: string;
  readonly discoveredArtifacts: number;
  readonly migratedArtifacts: number;
  readonly malformedArtifacts: number;
  readonly importedContinuityRecords: number;
  readonly importedReadEvents: number;
  readonly importedStageEvents: number;
  readonly importedTransitionEvents: number;
  readonly skippedContinuityRecords: number;
  readonly skippedReadEvents: number;
  readonly skippedStageEvents: number;
  readonly skippedTransitionEvents: number;
  readonly error?: string | undefined;
}

function writeLine(writer: Writer, line = ""): void {
  writer.write(`${line}\n`);
}

function emitJson(payload: MigrateLocalHistoryPayload, writer: Writer): void {
  writer.write(
    `${codec.encode(validateCliOutput("migrate_local_history", attachCliSchemaMeta("migrate_local_history", payload)))}\n`,
  );
}

function renderHuman(payload: MigrateLocalHistoryPayload): string {
  return [
    "Local History Migration",
    `cwd: ${payload.cwd}`,
    `graftDir: ${payload.graftDir}`,
    `legacy artifacts discovered: ${String(payload.discoveredArtifacts)}`,
    `legacy artifacts migrated: ${String(payload.migratedArtifacts)}`,
    `malformed artifacts: ${String(payload.malformedArtifacts)}`,
    `continuity records imported: ${String(payload.importedContinuityRecords)}`,
    `read events imported: ${String(payload.importedReadEvents)}`,
    `stage events imported: ${String(payload.importedStageEvents)}`,
    `transition events imported: ${String(payload.importedTransitionEvents)}`,
    `continuity records skipped: ${String(payload.skippedContinuityRecords)}`,
    `read events skipped: ${String(payload.skippedReadEvents)}`,
    `stage events skipped: ${String(payload.skippedStageEvents)}`,
    `transition events skipped: ${String(payload.skippedTransitionEvents)}`,
  ].join("\n");
}

export async function runMigrateLocalHistory(options: RunMigrateLocalHistoryOptions): Promise<void> {
  const stdout = options.stdout ?? process.stdout;
  const stderr = options.stderr ?? process.stderr;
  const graftDir = path.join(options.cwd, ".graft");

  try {
    const app = await openWarp({ cwd: options.cwd });
    const warpCtx = { app, strandId: null };
    const payload: MigrateLocalHistoryPayload = {
      cwd: options.cwd,
      ...await migrateLegacyPersistedLocalHistoryToGraph({
        fs: nodeFs,
        codec,
        graftDir,
        graph: {
          warp: warpCtx,
          worktreeRoot: options.cwd,
        },
      }),
    };

    if (options.json) {
      emitJson(payload, stdout);
      return;
    }

    writeLine(stdout, renderHuman(payload));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    process.exitCode = 1;
    const payload: MigrateLocalHistoryPayload = {
      cwd: options.cwd,
      graftDir,
      discoveredArtifacts: 0,
      migratedArtifacts: 0,
      malformedArtifacts: 0,
      importedContinuityRecords: 0,
      importedReadEvents: 0,
      importedStageEvents: 0,
      importedTransitionEvents: 0,
      skippedContinuityRecords: 0,
      skippedReadEvents: 0,
      skippedStageEvents: 0,
      skippedTransitionEvents: 0,
      error: message,
    };
    if (options.json) {
      emitJson(payload, stdout);
      return;
    }
    writeLine(stderr, `Error: ${message}`);
  }
}
