import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

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

/** Remove a temp directory created by createTestRepo. */
export function cleanupTestRepo(tmpDir: string): void {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
