import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { assertIsolatedGitTestDir, cleanupTestRepo, createTestRepo, git, testGitClient } from "../../helpers/git.js";

describe("test helper: git isolation", () => {
  it("allows temp sandbox directories", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-git-helper-"));
    try {
      expect(() => {
        assertIsolatedGitTestDir(tmpDir);
      }).not.toThrow();
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("refuses the live repo root", () => {
    const repoRoot = path.resolve(import.meta.dirname, "../../..");
    expect(() => {
      assertIsolatedGitTestDir(repoRoot);
    }).toThrow(/Refusing to run git test command in live repo path/);
  });

  it("refuses live-repo git commands before they execute", () => {
    const repoRoot = path.resolve(import.meta.dirname, "../../..");
    expect(() => {
      git(repoRoot, "status --short");
    }).toThrow(/Refusing to run git test command in live repo path/);
  });

  it("creates temp repos in the temp sandbox", async () => {
    const repoDir = createTestRepo("graft-git-helper-repo-");
    try {
      expect(repoDir.startsWith(os.tmpdir())).toBe(true);
      expect(git(repoDir, "rev-parse --is-inside-work-tree")).toBe("true");
      expect(git(repoDir, "symbolic-ref --short HEAD")).toBe("main");
      expect(git(repoDir, "config --get core.fsmonitor")).toBe("false");
    } finally {
      await cleanupTestRepo(repoDir);
    }
  });

  it("scrubs inherited Git repository environment before executing commands", async () => {
    const repoRoot = path.resolve(import.meta.dirname, "../../..");
    const repoDir = createTestRepo("graft-git-helper-env-");
    const previousGitDir = process.env["GIT_DIR"];
    const previousGitWorkTree = process.env["GIT_WORK_TREE"];
    try {
      process.env["GIT_DIR"] = path.join(repoRoot, ".git");
      process.env["GIT_WORK_TREE"] = repoRoot;

      const resolved = fs.realpathSync.native(repoDir);
      expect(fs.realpathSync.native(git(repoDir, "rev-parse --show-toplevel"))).toBe(resolved);
    } finally {
      if (previousGitDir === undefined) {
        delete process.env["GIT_DIR"];
      } else {
        process.env["GIT_DIR"] = previousGitDir;
      }
      if (previousGitWorkTree === undefined) {
        delete process.env["GIT_WORK_TREE"];
      } else {
        process.env["GIT_WORK_TREE"] = previousGitWorkTree;
      }
      await cleanupTestRepo(repoDir);
    }
  });

  it("scrubs inherited Git repository environment for the GitClient helper", async () => {
    const repoRoot = path.resolve(import.meta.dirname, "../../..");
    const repoDir = createTestRepo("graft-git-helper-client-env-");
    const previousGitDir = process.env["GIT_DIR"];
    const previousGitWorkTree = process.env["GIT_WORK_TREE"];
    try {
      process.env["GIT_DIR"] = path.join(repoRoot, ".git");
      process.env["GIT_WORK_TREE"] = repoRoot;

      const result = await testGitClient.run({ cwd: repoDir, args: ["rev-parse", "--show-toplevel"] });
      expect(result.status).toBe(0);
      expect(fs.realpathSync.native(result.stdout.trim())).toBe(fs.realpathSync.native(repoDir));
    } finally {
      if (previousGitDir === undefined) {
        delete process.env["GIT_DIR"];
      } else {
        process.env["GIT_DIR"] = previousGitDir;
      }
      if (previousGitWorkTree === undefined) {
        delete process.env["GIT_WORK_TREE"];
      } else {
        process.env["GIT_WORK_TREE"] = previousGitWorkTree;
      }
      await cleanupTestRepo(repoDir);
    }
  });

  // A background `git maintenance` that `git commit` may start can still be writing under `.git`
  // while cleanup deletes the repo, a plausible (not confirmed) cause of one ENOTEMPTY cleanup
  // failure recorded in docs/method/retro/CLEAN_tests-fresh-dist/retro.md.
  it("turns off automatic git maintenance and gc in temp repos", async () => {
    const repo = createTestRepo("graft-helper-maintenance-");
    try {
      expect(git(repo, "config --get maintenance.auto").trim()).toBe("false");
      expect(git(repo, "config --get gc.auto").trim()).toBe("0");
    } finally {
      await cleanupTestRepo(repo);
    }
  });
});

// Oracle: cleanupTestRepo removes the graph root, then the repo, each through the injected remover.
// Only ENOTEMPTY and EBUSY are retried, four times, after 25, 50, 100 and 200 ms by default; every
// retry prints one warning naming the path and the code; any other error rejects at once; after the
// last retry the removal rejects with the error the remover threw. Deterministic: the remover is a
// stub that throws planned errors, and the retry delay is 0 or the wait is an injected sleep that
// records its argument, so no case touches the filesystem or waits on a timer.
// Size: small.
describe("test helper: cleanupTestRepo retries transient removal errors", () => {
  function fsError(code: string): NodeJS.ErrnoException {
    return Object.assign(new Error(`${code}: planned failure`), { code });
  }

  /** A remover that throws the planned errors for `target`, in order, then succeeds. */
  function plannedRemover(target: string, errors: NodeJS.ErrnoException[]) {
    const calls: string[] = [];
    const remove = (entry: string): Promise<void> => {
      calls.push(entry);
      const next = entry === target ? errors.shift() : undefined;
      return next === undefined ? Promise.resolve() : Promise.reject(next);
    };
    return { calls, remove };
  }

  const repo = path.join(os.tmpdir(), "graft-cleanup-retry-repo");

  it("retries a transient ENOTEMPTY and warns about it", async () => {
    const remover = plannedRemover(repo, [fsError("ENOTEMPTY")]);
    const warnings: string[] = [];

    await cleanupTestRepo(repo, { remove: remover.remove, warn: (message) => warnings.push(message), retryDelayMs: 0 });

    expect(remover.calls).toEqual([`${repo}.graft-graphs`, repo, repo]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain(repo);
    expect(warnings[0]).toContain("ENOTEMPTY");
  });

  it("retries a transient EBUSY and warns about it", async () => {
    const remover = plannedRemover(repo, [fsError("EBUSY")]);
    const warnings: string[] = [];

    await cleanupTestRepo(repo, { remove: remover.remove, warn: (message) => warnings.push(message), retryDelayMs: 0 });

    expect(remover.calls).toEqual([`${repo}.graft-graphs`, repo, repo]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("EBUSY");
  });

  it("rejects at once, without retrying or warning, on an error that is not transient", async () => {
    const denied = fsError("EACCES");
    const remover = plannedRemover(repo, [denied]);
    const warnings: string[] = [];

    await expect(
      cleanupTestRepo(repo, { remove: remover.remove, warn: (message) => warnings.push(message), retryDelayMs: 0 }),
    ).rejects.toBe(denied);

    expect(remover.calls).toEqual([`${repo}.graft-graphs`, repo]);
    expect(warnings).toEqual([]);
  });

  it("rejects with the remover's own error once ENOTEMPTY outlasts every retry", async () => {
    const persistent = fsError("ENOTEMPTY");
    const remover = plannedRemover(repo, Array.from({ length: 20 }, () => persistent));
    const warnings: string[] = [];

    await expect(
      cleanupTestRepo(repo, { remove: remover.remove, warn: (message) => warnings.push(message), retryDelayMs: 0 }),
    ).rejects.toBe(persistent);

    const attempts = remover.calls.filter((entry) => entry === repo).length;
    expect(attempts).toBe(5);
    expect(warnings).toHaveLength(4);
  });

  it("waits 25, 50, 100 and 200 ms before its four retries by default", async () => {
    const persistent = fsError("ENOTEMPTY");
    const remover = plannedRemover(repo, Array.from({ length: 20 }, () => persistent));
    const waits: number[] = [];

    await expect(
      cleanupTestRepo(repo, {
        remove: remover.remove,
        warn: () => undefined,
        sleep: (ms) => {
          waits.push(ms);
          return Promise.resolve();
        },
      }),
    ).rejects.toBe(persistent);

    expect(waits).toEqual([25, 50, 100, 200]);
  });
});
