import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
const migrationCommand = join(repoRoot, "scripts", "upgrade-git-warp-v16-to-v17.ts");
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
const bridgeIt = installedWarpVersion === "17.0.0" ? it : it.skip;
const postBridgeIt = installedWarpVersion === "17.0.0" ? it.skip : it;

const tempDirs: string[] = [];

function makeGitRepo(): string {
  const repo = mkdtempSync(join(tmpdir(), "graft-git-warp-v17-migration-"));
  tempDirs.push(repo);

  const result = spawnSync("git", ["init", "--quiet", repo], {
    cwd: dirname(repo),
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || "git init failed");
  }

  return repo;
}

afterEach(() => {
  for (const tempDir of tempDirs.splice(0)) {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

describe("git-warp v16 to v17 migration command", () => {
  bridgeIt("delegates a structured dry run to the installed package upgrader", () => {
    const repo = makeGitRepo();
    const result = spawnSync(
      tsxCommand,
      [
        migrationCommand,
        "--repo",
        repo,
        "--graph",
        "migration-contract",
        "--dry-run",
        "--json",
      ],
      { cwd: repoRoot, encoding: "utf8" },
    );

    expect(result.status, result.stderr).toBe(0);

    const receipt = JSON.parse(result.stdout) as {
      readonly dryRun: boolean;
      readonly graphCount: number;
      readonly graphs: readonly ({
        readonly graphName: string;
        readonly checkpoint: {
          readonly status: string;
          readonly checkpointRef: string;
          readonly currentSchema: number;
        };
        readonly cacheRefs: readonly ({
          readonly ref: string;
          readonly action: string;
          readonly previousOid: string | null;
        })[];
      })[];
    };

    expect(receipt.dryRun).toBe(true);
    expect(receipt.graphCount).toBe(1);
    expect(receipt.graphs).toEqual([
      expect.objectContaining({
        graphName: "migration-contract",
        checkpoint: expect.objectContaining({
          status: "missing-checkpoint",
          checkpointRef: "refs/warp/migration-contract/checkpoints/head",
          currentSchema: 5,
        }),
        cacheRefs: [
          {
            ref: "refs/warp/migration-contract/coverage/head",
            action: "absent",
            previousOid: null,
          },
          {
            ref: "refs/warp/migration-contract/seek-cache",
            action: "absent",
            previousOid: null,
          },
        ],
      }),
    ]);
  });

  postBridgeIt("refuses to replay the migration through another git-warp version", () => {
    const repo = makeGitRepo();
    const result = spawnSync(
      tsxCommand,
      [
        migrationCommand,
        "--repo",
        repo,
        "--graph",
        "migration-contract",
        "--dry-run",
        "--json",
      ],
      { cwd: repoRoot, encoding: "utf8" },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      `Expected @git-stunts/git-warp 17.0.0, found ${installedWarpVersion}`,
    );

    const refs = spawnSync(
      "git",
      ["for-each-ref", "--format=%(refname)", "refs/warp/", "refs/graft/"],
      { cwd: repo, encoding: "utf8" },
    );
    expect(refs.status, refs.stderr).toBe(0);
    expect(refs.stdout).toBe("");
  });
});
