import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { fileURLToPath } from "node:url";
import { execSync, spawnSync } from "node:child_process";
import { retry, RetryExhaustedError } from "@git-stunts/alfred";
import type { GitClient, GitRunRequest } from "../../src/ports/git.js";

const LIVE_REPO_ROOT = fs.realpathSync.native(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.."),
);
const TMP_ROOT = fs.realpathSync.native(os.tmpdir());

function isWithin(root: string, target: string): boolean {
  return target === root || target.startsWith(`${root}${path.sep}`);
}

export function assertIsolatedGitTestDir(cwd: string): void {
  const resolved = fs.realpathSync.native(cwd);
  if (isWithin(LIVE_REPO_ROOT, resolved)) {
    throw new Error(`Refusing to run git test command in live repo path: ${resolved}`);
  }
  if (!isWithin(TMP_ROOT, resolved)) {
    throw new Error(`Refusing to run git test command outside temp sandbox: ${resolved}`);
  }
}

function isolatedGitEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value === undefined || key.startsWith("GIT_")) {
      continue;
    }
    env[key] = value;
  }

  // Test repos must not inherit the developer machine's Git repo/config
  // identity. Inherited GIT_DIR/GIT_WORK_TREE can redirect operations into
  // the live repo, and global core.fsmonitor can make tiny temp repos slow.
  env["GIT_CONFIG_GLOBAL"] = os.devNull;
  env["GIT_CONFIG_NOSYSTEM"] = "1";
  env["GIT_TERMINAL_PROMPT"] = "0";

  return env;
}

/** Run a git command in a directory and return trimmed stdout. */
export function git(cwd: string, cmd: string): string {
  assertIsolatedGitTestDir(cwd);
  try {
    return execSync(`git ${cmd}`, {
      cwd,
      env: isolatedGitEnv(),
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (error) {
    const details = error as Error & { stderr?: string | Buffer };
    const stderr = typeof details.stderr === "string"
      ? details.stderr.trim()
      : Buffer.isBuffer(details.stderr)
        ? details.stderr.toString("utf-8").trim()
        : "";
    const suffix = stderr.length > 0 ? `\n${stderr}` : "";
    throw new Error(`git ${cmd} failed in ${cwd}${suffix}`, { cause: error });
  }
}

export function runIsolatedGit(request: GitRunRequest) {
  assertIsolatedGitTestDir(request.cwd);
  const result = spawnSync("git", [...request.args], {
    cwd: request.cwd,
    env: isolatedGitEnv(),
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
    ...(request.timeoutMs !== undefined ? { timeout: request.timeoutMs } : {}),
    ...(request.maxBufferBytes !== undefined ? { maxBuffer: request.maxBufferBytes } : {}),
  });
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    ...(result.error !== undefined ? { error: result.error } : {}),
  };
}

export const testGitClient: GitClient = {
  run(request: GitRunRequest) {
    return Promise.resolve(runIsolatedGit(request));
  },
};

/** Create a temp directory with an initialized git repo. */
export function createTestRepo(prefix = "graft-test-"): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  ensureGitRepo(tmpDir);
  return tmpDir;
}

export function ensureGitRepo(cwd: string): void {
  assertIsolatedGitTestDir(cwd);
  if (fs.existsSync(path.join(cwd, ".git"))) {
    return;
  }
  git(cwd, "init --initial-branch main");
  git(cwd, "config user.email test@test.com");
  git(cwd, "config user.name test");
  git(cwd, "config commit.gpgsign false");
  git(cwd, "config tag.gpgSign false");
  git(cwd, "config core.fsmonitor false");
  // No background maintenance or gc: a detached `git maintenance` started by a commit could still be
  // writing under .git while cleanupTestRepo deletes the repo.
  git(cwd, "config maintenance.auto false");
  git(cwd, "config gc.auto 0");
}

export function createCommittedTestRepo(
  prefix = "graft-test-",
  files: Record<string, string> = { "app.ts": "export const ready = true;\n" },
): string {
  const tmpDir = createTestRepo(prefix);
  for (const [relativePath, content] of Object.entries(files)) {
    const absolutePath = path.join(tmpDir, relativePath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, content);
  }
  git(tmpDir, "add -A");
  git(tmpDir, "commit -m init");
  return tmpDir;
}

export function testGraphRootForRepo(repoDir: string): string {
  return `${repoDir}.graft-graphs`;
}

/**
 * Errors a recursive removal can hit when another process is still writing under the tree (for
 * example a detached git writing under .git), which may clear on a later attempt.
 */
const TRANSIENT_REMOVAL_CODES = new Set(["ENOTEMPTY", "EBUSY"]);
/** Retries after the first attempt; with the default delay the waits are 25, 50, 100 and 200 ms. */
const REMOVAL_RETRIES = 4;
const REMOVAL_RETRY_DELAY_MS = 25;

export interface CleanupTestRepoOptions {
  /** Removes one directory tree; `fs.promises.rm` with `recursive` and `force` by default. */
  readonly remove?: (target: string) => Promise<void>;
  /** Receives one line per retry; `console.warn` by default. */
  readonly warn?: (message: string) => void;
  /** Delay before the first retry, doubling for each later one. */
  readonly retryDelayMs?: number;
  /** Waits the given milliseconds before a retry; a real timer by default. */
  readonly sleep?: (ms: number) => Promise<void>;
}

function removalCode(error: Error): string | undefined {
  return (error as NodeJS.ErrnoException).code;
}

async function removeTree(target: string, options: CleanupTestRepoOptions): Promise<void> {
  const remove = options.remove ?? ((entry: string) => fs.promises.rm(entry, { recursive: true, force: true }));
  const warn = options.warn ?? console.warn;
  try {
    await retry(() => remove(target), {
      retries: REMOVAL_RETRIES,
      delay: options.retryDelayMs ?? REMOVAL_RETRY_DELAY_MS,
      backoff: "exponential",
      jitter: "none",
      ...(options.sleep !== undefined ? { clock: { now: () => Date.now(), sleep: options.sleep } } : {}),
      shouldRetry: (error) => TRANSIENT_REMOVAL_CODES.has(removalCode(error) ?? ""),
      onRetry: (error, attempt, delay) => {
        warn(
          `[graft test cleanup] removing ${target} failed with ${removalCode(error) ?? error.name}; `
          + `retry ${String(attempt)} of ${String(REMOVAL_RETRIES)} in ${String(delay)} ms.`,
        );
      },
    });
  } catch (error: unknown) {
    // After the last retry alfred wraps the remover's error; surface the error the remover threw.
    throw error instanceof RetryExhaustedError ? error.cause : error;
  }
}

/**
 * Remove a temp directory created by createTestRepo, and its graph root. A removal that fails with
 * ENOTEMPTY or EBUSY is retried a few times with a warning each time, so a recurrence is visible;
 * any other error, or the last retry's error, rejects.
 */
export async function cleanupTestRepo(tmpDir: string, options: CleanupTestRepoOptions = {}): Promise<void> {
  await removeTree(testGraphRootForRepo(tmpDir), options);
  await removeTree(tmpDir, options);
}
