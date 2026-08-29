import { afterEach, describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  openWarpSidecar,
  resolveWarpSidecarLocation,
  type WarpSidecarIdentity,
} from "../../../src/warp/sidecar.js";
import { stableWorkspaceId } from "../../../src/mcp/workspace-router-resolution.js";
import { cleanupTestRepo, createCommittedTestRepo, git } from "../../helpers/git.js";

const cleanups: (() => void)[] = [];

afterEach(() => {
  while (cleanups.length > 0) {
    cleanups.pop()!();
  }
});

function tempDir(prefix: string): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  cleanups.push(() => {
    fs.rmSync(directory, { recursive: true, force: true });
  });
  return fs.realpathSync(directory);
}

function sourceRepo(): string {
  const directory = createCommittedTestRepo("graft-sidecar-source-");
  cleanups.push(() => {
    cleanupTestRepo(directory);
  });
  return fs.realpathSync(directory);
}

function identity(
  source: string,
  writerId: string,
  overrides: Partial<WarpSidecarIdentity> = {},
): WarpSidecarIdentity {
  const gitCommonDir = fs.realpathSync(path.join(source, ".git"));
  return {
    repoId: stableWorkspaceId("repo", gitCommonDir),
    worktreeId: stableWorkspaceId("worktree", source),
    worktreeRoot: source,
    gitCommonDir,
    writerId,
    ...overrides,
  };
}

describe("warp: isolated sidecar persistence", { timeout: 20_000 }, () => {
  it("keys readable contained locations by repo, worktree, and actor without exposing the raw token", () => {
    const source = sourceRepo();
    const graphRoot = tempDir("graft-sidecar-root-");
    const primary = identity(source, "agent-token-super-secret");
    const otherWorktree = {
      ...primary,
      worktreeId: stableWorkspaceId("worktree", `${source}-secondary`),
      worktreeRoot: `${source}-secondary`,
    };

    const first = resolveWarpSidecarLocation(graphRoot, primary);
    const repeated = resolveWarpSidecarLocation(graphRoot, primary);
    const worktreeIsolated = resolveWarpSidecarLocation(graphRoot, otherWorktree);
    const actorIsolated = resolveWarpSidecarLocation(graphRoot, {
      ...primary,
      writerId: "another-agent-token",
    });

    expect(first).toEqual(repeated);
    expect(path.relative(graphRoot, first.repoPath)).not.toMatch(/^\.\.(?:[/\\]|$)/u);
    expect(first.repoPath).toContain(path.basename(source).toLowerCase());
    expect(first.repoPath).toContain("warp.git");
    expect(first.repoPath).not.toContain("super-secret");
    expect(worktreeIsolated.repoPath).not.toBe(first.repoPath);
    expect(actorIsolated.repoPath).not.toBe(first.repoPath);
  });

  it("writes distinct graph state only to bare sidecars and leaves the source Git repo byte-logically unchanged", async () => {
    const source = sourceRepo();
    const graphRoot = tempDir("graft-sidecar-graphs-");
    const firstLocation = resolveWarpSidecarLocation(graphRoot, identity(source, "graft_session_a"));
    const secondLocation = resolveWarpSidecarLocation(graphRoot, identity(source, "graft_session_b"));
    const sourceRefsBefore = git(source, "for-each-ref --format='%(refname) %(objectname)' refs/warp");
    const sourceObjectsBefore = git(source, "count-objects -v");

    const first = await openWarpSidecar({
      sidecarRepo: firstLocation.repoPath,
      writerId: "graft_session_a",
    });
    const second = await openWarpSidecar({
      sidecarRepo: secondLocation.repoPath,
      writerId: "graft_session_b",
    });
    await first.patch((patch) => {
      patch.addNode("node:first-agent");
    });
    await second.patch((patch) => {
      patch.addNode("node:second-agent");
    });
    await first.core().materialize();
    await second.core().materialize();

    expect(git(firstLocation.repoPath, "rev-parse --is-bare-repository")).toBe("true");
    expect(git(secondLocation.repoPath, "rev-parse --is-bare-repository")).toBe("true");
    expect(git(firstLocation.repoPath, "config --local user.name")).toBe("Graft WARP");
    expect(git(firstLocation.repoPath, "config --local user.email")).toBe("graft-warp@localhost");
    expect(await (await first.observer({ match: "node:*" })).getNodes()).toEqual(["node:first-agent"]);
    expect(await (await second.observer({ match: "node:*" })).getNodes()).toEqual(["node:second-agent"]);
    expect(git(source, "for-each-ref --format='%(refname) %(objectname)' refs/warp")).toBe(sourceRefsBefore);
    expect(git(source, "count-objects -v")).toBe(sourceObjectsBefore);
  });

  it("cannot be redirected into the source repository by inherited Git location variables", async () => {
    const source = sourceRepo();
    const graphRoot = tempDir("graft-sidecar-hostile-env-");
    const location = resolveWarpSidecarLocation(graphRoot, identity(source, "graft_session_hostile_env"));
    const sourceRefsBefore = git(source, "for-each-ref --format='%(refname) %(objectname)' refs/warp");
    const sourceObjectsBefore = git(source, "count-objects -v");
    const previousGitDir = process.env["GIT_DIR"];
    const previousGitWorkTree = process.env["GIT_WORK_TREE"];

    try {
      process.env["GIT_DIR"] = path.join(source, ".git");
      process.env["GIT_WORK_TREE"] = source;
      const warp = await openWarpSidecar({
        sidecarRepo: location.repoPath,
        writerId: "graft_session_hostile_env",
      });
      await warp.patch((patch) => {
        patch.addNode("node:sidecar-only");
      });
    } finally {
      if (previousGitDir === undefined) delete process.env["GIT_DIR"];
      else process.env["GIT_DIR"] = previousGitDir;
      if (previousGitWorkTree === undefined) delete process.env["GIT_WORK_TREE"];
      else process.env["GIT_WORK_TREE"] = previousGitWorkTree;
    }

    expect(git(location.repoPath, "rev-parse --is-bare-repository")).toBe("true");
    expect(git(source, "for-each-ref --format='%(refname) %(objectname)' refs/warp")).toBe(sourceRefsBefore);
    expect(git(source, "count-objects -v")).toBe(sourceObjectsBefore);
  });

  it("refuses a symlinked managed component", async () => {
    const source = sourceRepo();
    const graphRoot = tempDir("graft-sidecar-symlink-root-");
    const outside = tempDir("graft-sidecar-symlink-target-");
    const location = resolveWarpSidecarLocation(graphRoot, identity(source, "graft_session_a"));
    fs.symlinkSync(outside, location.projectDir, "dir");

    await expect(openWarpSidecar({
      sidecarRepo: location.repoPath,
      writerId: "graft_session_a",
    })).rejects.toThrow(/symlinked Graft graph storage directory/u);
  });

  it("refuses an existing non-bare terminal repository", async () => {
    const source = sourceRepo();
    const graphRoot = tempDir("graft-sidecar-non-bare-root-");
    const location = resolveWarpSidecarLocation(graphRoot, identity(source, "graft_session_a"));
    fs.mkdirSync(location.repoPath, { recursive: true });
    git(location.repoPath, "init --initial-branch main");

    await expect(openWarpSidecar({
      sidecarRepo: location.repoPath,
      writerId: "graft_session_a",
    })).rejects.toThrow(/not a bare Git repository/u);
  });
});
