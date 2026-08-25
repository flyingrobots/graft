import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  cleanupTestRepo,
  createTestRepo,
  git,
  runIsolatedGit,
} from "../../helpers/git.js";
import { openWarp } from "../../../src/warp/open.js";

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
const migrationCommand = join(repoRoot, "scripts", "upgrade-git-warp-v17-to-v18.ts");
const tsxCommand = join(repoRoot, "node_modules", ".bin", "tsx");
const warpPackage: unknown = JSON.parse(readFileSync(
  fileURLToPath(import.meta.resolve("@git-stunts/git-warp/package.json")),
  "utf8",
));
const installedWarpVersion = warpPackage !== null
  && typeof warpPackage === "object"
  && "version" in warpPackage
  && typeof warpPackage.version === "string"
  ? warpPackage.version
  : "unknown";
const bridgeIt = installedWarpVersion === "18.0.0" ? it : it.skip;
const postBridgeIt = installedWarpVersion === "18.0.0" ? it.skip : it;
const graph = "graft-ast";
const checkpointRef = `refs/warp/${graph}/checkpoints/head`;
const writerRef = `refs/warp/${graph}/writers/graft`;
const archiveRef = `refs/graft/migrations/git-warp-v17-to-v18/${graph}/checkpoint`;

const tempDirs: string[] = [];

interface MigrationReceipt {
  readonly archiveCheckpoint: string | null;
  readonly checkpoint: string;
  readonly materialized: {
    readonly edges: number;
    readonly nodes: number;
    readonly patchCount: number;
  } | null;
  readonly previousCheckpoint: string;
  readonly status: "already-current" | "migrated" | "would-migrate";
  readonly versions: Readonly<Record<string, string>>;
}

function runMigration(repo: string, ...extraArguments: string[]) {
  return spawnSync(tsxCommand, [
    migrationCommand,
    "--repo",
    repo,
    "--graph",
    graph,
    "--json",
    ...extraArguments,
  ], {
    cwd: repoRoot,
    encoding: "utf8",
    timeout: 30_000,
  });
}

function syntheticCheckpoint(repo: string, checkpoint: string): string {
  const tree = git(repo, `show -s --format=%T ${checkpoint}`);
  const message = git(repo, `show -s --format=%B ${checkpoint}`);
  const result = spawnSync("git", ["commit-tree", tree, "-p", checkpoint], {
    cwd: repo,
    encoding: "utf8",
    input: `${message}\n`,
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || "git commit-tree failed");
  }
  return result.stdout.trim();
}

afterEach(() => {
  for (const tempDir of tempDirs.splice(0)) cleanupTestRepo(tempDir);
});

describe("git-warp v17 to v18 checkpoint bridge", () => {
  bridgeIt("archives the v17 checkpoint and publishes a writer-anchored v18 checkpoint", async () => {
    const repo = createTestRepo("graft-git-warp-v18-migration-");
    tempDirs.push(repo);
    const warp = await openWarp({ cwd: repo, checkpointEvery: 1 });
    await warp.patch((patch) => {
      patch.addNode("migration:node").setProperty("migration:node", "status", "retained");
    });
    await warp.core().materialize();

    const currentCheckpoint = git(repo, `rev-parse --verify ${checkpointRef}`);
    const writerHead = git(repo, `rev-parse --verify ${writerRef}`);
    expect(git(repo, `show -s --format=%P ${currentCheckpoint}`)).toBe(writerHead);

    const retiredCheckpoint = syntheticCheckpoint(repo, currentCheckpoint);
    git(repo, `update-ref ${checkpointRef} ${retiredCheckpoint} ${currentCheckpoint}`);
    expect(git(repo, `show -s --format=%P ${retiredCheckpoint}`)).toBe(currentCheckpoint);

    const dryRun = runMigration(repo, "--dry-run");
    expect(dryRun.status, dryRun.stderr).toBe(0);
    const dryRunReceipt = JSON.parse(dryRun.stdout) as MigrationReceipt;
    expect(dryRunReceipt).toMatchObject({
      archiveCheckpoint: null,
      checkpoint: retiredCheckpoint,
      previousCheckpoint: retiredCheckpoint,
      status: "would-migrate",
      versions: {
        "@git-stunts/git-cas": "6.0.0",
        "@git-stunts/git-warp": "18.0.0",
        "@git-stunts/plumbing": "3.0.3",
      },
    });
    expect(runIsolatedGit({
      args: ["rev-parse", "--verify", "--quiet", archiveRef],
      cwd: repo,
    }).status).toBe(1);
    expect(git(repo, `rev-parse --verify ${checkpointRef}`)).toBe(retiredCheckpoint);

    const migrated = runMigration(repo);
    expect(migrated.status, migrated.stderr).toBe(0);
    const migratedReceipt = JSON.parse(migrated.stdout) as MigrationReceipt;
    expect(migratedReceipt).toMatchObject({
      archiveCheckpoint: retiredCheckpoint,
      previousCheckpoint: retiredCheckpoint,
      status: "migrated",
      materialized: {
        edges: 0,
        nodes: 1,
        patchCount: 1,
      },
    });
    expect(migratedReceipt.checkpoint).not.toBe(retiredCheckpoint);
    expect(git(repo, `rev-parse --verify ${archiveRef}`)).toBe(retiredCheckpoint);
    expect(git(repo, `rev-parse --verify ${checkpointRef}`)).toBe(migratedReceipt.checkpoint);
    expect(git(repo, `show -s --format=%P ${migratedReceipt.checkpoint}`)).toBe(writerHead);

    const rerun = runMigration(repo);
    expect(rerun.status, rerun.stderr).toBe(0);
    const rerunReceipt = JSON.parse(rerun.stdout) as MigrationReceipt;
    expect(rerunReceipt.status).toBe("already-current");
    expect(rerunReceipt.checkpoint).toBe(migratedReceipt.checkpoint);
    expect(git(repo, `rev-parse --verify ${archiveRef}`)).toBe(retiredCheckpoint);
    expect(git(repo, `rev-parse --verify ${checkpointRef}`)).toBe(migratedReceipt.checkpoint);
  });

  postBridgeIt("refuses to replay the bridge through another git-warp version", () => {
    const repo = createTestRepo("graft-git-warp-v18-version-guard-");
    tempDirs.push(repo);

    const result = runMigration(repo, "--dry-run");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      `Expected @git-stunts/git-warp 18.0.0, found ${installedWarpVersion}`,
    );
    expect(runIsolatedGit({
      args: ["for-each-ref", "--format=%(refname)", "refs/warp/", "refs/graft/"],
      cwd: repo,
    }).stdout).toBe("");
  });
});
