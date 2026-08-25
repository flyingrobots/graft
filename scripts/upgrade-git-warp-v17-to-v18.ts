#!/usr/bin/env tsx

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, parse } from "node:path";
import { fileURLToPath } from "node:url";

const EXPECTED_VERSIONS = Object.freeze({
  "@git-stunts/git-cas": "6.0.0",
  "@git-stunts/git-warp": "18.0.0",
  "@git-stunts/plumbing": "3.0.3",
});
const GRAPH_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/u;

interface MigrationArguments {
  readonly dryRun: boolean;
  readonly graph: string;
  readonly json: boolean;
  readonly repo: string;
  readonly writer: string;
}

interface WriterRef {
  readonly oid: string;
  readonly ref: string;
}

interface MaterializeResult {
  readonly checkpoint: string;
  readonly edges: number;
  readonly graph: string;
  readonly nodes: number;
  readonly patchCount: number;
  readonly properties: number;
  readonly writers: Readonly<Record<string, number>>;
}

interface MigrationReceipt {
  readonly archiveCheckpoint: string | null;
  readonly archiveRef: string;
  readonly checkpoint: string;
  readonly checkpointRef: string;
  readonly dryRun: boolean;
  readonly graph: string;
  readonly materialized: MaterializeResult | null;
  readonly previousCheckpoint: string;
  readonly status: "already-current" | "migrated" | "would-migrate";
  readonly versions: typeof EXPECTED_VERSIONS;
  readonly writerRefs: readonly WriterRef[];
}

function usage(): string {
  return [
    "Usage:",
    "  pnpm git-warp:migrate:v18 -- --repo <path> --graph <name> [options]",
    "",
    "Options:",
    "  --repo <path>    Git repository containing the graph.",
    "  --graph <name>   Graph to checkpoint through exact git-warp 18.0.0.",
    "  --writer <id>    Migration runtime writer id (default: graft-migration).",
    "  --dry-run        Verify versions and lineage without moving refs.",
    "  --json           Emit a machine-readable migration receipt.",
  ].join("\n");
}

function parseArguments(argv: readonly string[]): MigrationArguments {
  let repo: string | null = null;
  let graph: string | null = null;
  let writer = "graft-migration";
  let dryRun = false;
  let json = false;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--") continue;
    if (argument === "--repo" || argument === "--graph" || argument === "--writer") {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith("--")) {
        throw new Error(`${argument} requires a value`);
      }
      if (argument === "--repo") repo = value;
      if (argument === "--graph") graph = value;
      if (argument === "--writer") writer = value;
      index += 1;
      continue;
    }
    if (argument === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (argument === "--json") {
      json = true;
      continue;
    }
    throw new Error(`Unknown argument: ${String(argument)}`);
  }

  if (repo === null || graph === null) {
    throw new Error("--repo and --graph are required");
  }
  if (!GRAPH_NAME_PATTERN.test(graph)) {
    throw new Error(`Invalid graph name: ${graph}`);
  }
  if (!GRAPH_NAME_PATTERN.test(writer)) {
    throw new Error(`Invalid writer id: ${writer}`);
  }
  return { dryRun, graph, json, repo: realpathSync(repo), writer };
}

function readPackageVersion(packageJsonPath: string): string {
  const parsed: unknown = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  if (
    parsed === null
    || typeof parsed !== "object"
    || !("version" in parsed)
    || typeof parsed.version !== "string"
  ) {
    throw new Error(`Package metadata has no version: ${packageJsonPath}`);
  }
  return parsed.version;
}

function findPackageJson(entrypoint: string, packageName: string): string {
  let directory = dirname(entrypoint);
  const root = parse(directory).root;
  while (directory !== root) {
    const candidate = join(directory, "package.json");
    if (existsSync(candidate)) {
      const parsed: unknown = JSON.parse(readFileSync(candidate, "utf8"));
      if (
        parsed !== null
        && typeof parsed === "object"
        && "name" in parsed
        && parsed.name === packageName
      ) {
        return candidate;
      }
    }
    directory = dirname(directory);
  }
  throw new Error(`Could not locate ${packageName} package metadata`);
}

function requireExpectedVersions(warpPackageJsonPath: string): void {
  const resolveFromWarp = createRequire(warpPackageJsonPath).resolve;
  const packagePaths = {
    "@git-stunts/git-cas": findPackageJson(
      resolveFromWarp("@git-stunts/git-cas"),
      "@git-stunts/git-cas",
    ),
    "@git-stunts/git-warp": warpPackageJsonPath,
    "@git-stunts/plumbing": findPackageJson(
      resolveFromWarp("@git-stunts/plumbing"),
      "@git-stunts/plumbing",
    ),
  };

  for (const packageName of Object.keys(EXPECTED_VERSIONS) as (keyof typeof EXPECTED_VERSIONS)[]) {
    const installed = readPackageVersion(packagePaths[packageName]);
    const expected = EXPECTED_VERSIONS[packageName];
    if (installed !== expected) {
      throw new Error(`Expected ${packageName} ${expected}, found ${installed}`);
    }
  }
}

function git(repo: string, arguments_: readonly string[], allowMissing = false): string | null {
  const result = spawnSync("git", ["-C", repo, ...arguments_], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  if (allowMissing && result.status === 1) return null;
  if (result.error !== undefined) throw result.error;
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `git ${arguments_.join(" ")} failed`);
  }
  return result.stdout.trim();
}

function readRef(repo: string, ref: string): string | null {
  return git(repo, ["rev-parse", "--verify", "--quiet", ref], true);
}

function readWriterRefs(repo: string, graph: string): WriterRef[] {
  const output = git(repo, [
    "for-each-ref",
    "--format=%(objectname) %(refname)",
    `refs/warp/${graph}/writers/`,
  ]);
  if (output === null || output.length === 0) return [];
  return output.split("\n").map((line) => {
    const separator = line.indexOf(" ");
    if (separator < 1) throw new Error(`Malformed writer ref inventory: ${line}`);
    return { oid: line.slice(0, separator), ref: line.slice(separator + 1) };
  });
}

function checkpointParents(repo: string, checkpoint: string): string[] {
  const output = git(repo, ["show", "-s", "--format=%P", checkpoint]);
  return output === null || output.length === 0 ? [] : output.split(" ").sort();
}

function sameWriterInventory(left: readonly WriterRef[], right: readonly WriterRef[]): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function isWriterAnchored(
  repo: string,
  checkpoint: string,
  writerRefs: readonly WriterRef[],
): boolean {
  return JSON.stringify(checkpointParents(repo, checkpoint))
    === JSON.stringify(writerRefs.map(({ oid }) => oid).sort());
}

function runMaterialize(
  warpPackageJsonPath: string,
  args: MigrationArguments,
): MaterializeResult {
  const entrypoint = realpathSync(
    join(dirname(warpPackageJsonPath), "dist", "bin", "warp-graph.js"),
  );
  const result = spawnSync(process.execPath, [
    entrypoint,
    "materialize",
    "--repo",
    args.repo,
    "--graph",
    args.graph,
    "--writer",
    args.writer,
    "--json",
  ], {
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
  });
  if (result.error !== undefined) throw result.error;
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || result.stdout.trim() || "v18 materialization failed");
  }
  const parsed: unknown = JSON.parse(result.stdout);
  if (
    parsed === null
    || typeof parsed !== "object"
    || !("graphs" in parsed)
    || !Array.isArray(parsed.graphs)
  ) {
    throw new Error("v18 materialization returned an invalid receipt");
  }
  const graphResult: unknown = parsed.graphs[0];
  if (
    graphResult === null
    || typeof graphResult !== "object"
    || !("checkpoint" in graphResult)
    || typeof graphResult.checkpoint !== "string"
  ) {
    const detail = graphResult !== null
      && typeof graphResult === "object"
      && "error" in graphResult
      ? String(graphResult.error)
      : "missing graph result";
    throw new Error(`v18 materialization did not create a checkpoint: ${detail}`);
  }
  return graphResult as MaterializeResult;
}

function printReceipt(receipt: MigrationReceipt, json: boolean): void {
  if (json) {
    process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
    return;
  }
  process.stdout.write([
    `git-warp v17 to v18 checkpoint bridge: ${receipt.status}`,
    `Previous checkpoint: ${receipt.previousCheckpoint}`,
    `Current checkpoint:  ${receipt.checkpoint}`,
    `Archive ref:         ${receipt.archiveRef}`,
    "",
  ].join("\n"));
}

function run(): void {
  const args = parseArguments(process.argv.slice(2));
  const warpPackageJsonPath = fileURLToPath(
    import.meta.resolve("@git-stunts/git-warp/package.json"),
  );
  requireExpectedVersions(warpPackageJsonPath);

  const checkpointRef = `refs/warp/${args.graph}/checkpoints/head`;
  const archiveRef = `refs/graft/migrations/git-warp-v17-to-v18/${args.graph}/checkpoint`;
  const previousCheckpoint = readRef(args.repo, checkpointRef);
  if (previousCheckpoint === null) {
    throw new Error(`No checkpoint exists at ${checkpointRef}; run the v17 migration first`);
  }
  const beforeWriters = readWriterRefs(args.repo, args.graph);
  if (beforeWriters.length === 0) {
    throw new Error(`No writer refs exist for graph ${args.graph}`);
  }
  const existingArchive = readRef(args.repo, archiveRef);
  const alreadyCurrent = isWriterAnchored(args.repo, previousCheckpoint, beforeWriters);
  if (alreadyCurrent || args.dryRun) {
    printReceipt({
      archiveCheckpoint: existingArchive,
      archiveRef,
      checkpoint: previousCheckpoint,
      checkpointRef,
      dryRun: args.dryRun,
      graph: args.graph,
      materialized: null,
      previousCheckpoint,
      status: alreadyCurrent ? "already-current" : "would-migrate",
      versions: EXPECTED_VERSIONS,
      writerRefs: beforeWriters,
    }, args.json);
    return;
  }

  if (existingArchive !== null && existingArchive !== previousCheckpoint) {
    throw new Error(
      `${archiveRef} already preserves ${existingArchive}, not ${previousCheckpoint}`,
    );
  }
  if (existingArchive === null) {
    git(args.repo, ["update-ref", archiveRef, previousCheckpoint, ""]);
  }

  const materialized = runMaterialize(warpPackageJsonPath, args);
  const checkpoint = readRef(args.repo, checkpointRef);
  if (checkpoint === null || checkpoint !== materialized.checkpoint) {
    throw new Error("v18 materialization receipt does not match the checkpoint ref");
  }
  const afterWriters = readWriterRefs(args.repo, args.graph);
  if (!sameWriterInventory(beforeWriters, afterWriters)) {
    throw new Error("Writer refs changed during the v18 checkpoint bridge");
  }
  if (!isWriterAnchored(args.repo, checkpoint, afterWriters)) {
    throw new Error("The v18 checkpoint is not parented by the complete writer frontier");
  }
  if (readRef(args.repo, archiveRef) !== previousCheckpoint) {
    throw new Error("The archived v17 checkpoint moved during the v18 bridge");
  }

  printReceipt({
    archiveCheckpoint: previousCheckpoint,
    archiveRef,
    checkpoint,
    checkpointRef,
    dryRun: false,
    graph: args.graph,
    materialized,
    previousCheckpoint,
    status: "migrated",
    versions: EXPECTED_VERSIONS,
    writerRefs: afterWriters,
  }, args.json);
}

try {
  run();
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n\n${usage()}\n`);
  process.exitCode = 1;
}
