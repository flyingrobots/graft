import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { execSync } from "node:child_process";

/** Run a git command in a directory and return trimmed stdout. */
export function git(cwd: string, cmd: string): string {
  return execSync(`git ${cmd}`, { cwd, encoding: "utf-8" }).trim();
}

/** Create a temp directory with an initialized git repo. */
export function createTestRepo(prefix = "graft-test-"): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  git(tmpDir, "init");
  git(tmpDir, "config user.email test@test.com");
  git(tmpDir, "config user.name test");
  return tmpDir;
}

/** Remove a temp directory created by createTestRepo. */
export function cleanupTestRepo(tmpDir: string): void {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
