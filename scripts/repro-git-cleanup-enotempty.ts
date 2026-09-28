import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import process from "node:process";

// Targeted repro harness for an unexplained full-suite failure: test/unit/git/diff.test.ts
// "lists deleted files" once failed with ENOTEMPTY while cleanupTestRepo removed its temp repo.
// Candidate mechanism: `git commit` starts `git maintenance run --auto --detach`, a background git
// that can write under .git while fs.rmSync is removing it.
//
// Each iteration replays that test's git sequence (init and config as test/helpers/git.ts did
// before c9b6ccd1, commit, delete a file, commit), then removes the repo at once with fs.rmSync, as
// cleanupTestRepo did before 7871b506, and counts the outcome. Variant "default" is the test's own sequence. Variant "forced" also starts an
// explicit `git maintenance run --task=gc --detach` just before the removal, so a background git is
// certainly writing under .git while it is removed.
//
// This is evidence for triage, not a gate: a zero count is bounded evidence, never proof. Run several
// copies at once to approximate full-suite load. Everything is written under a fresh directory in the
// OS temp directory, removed at the end unless a removal failed.
//
// Usage: pnpm exec tsx scripts/repro-git-cleanup-enotempty.ts [default|forced] [iterations]

const [variant = "default", iterationsText = "200"] = process.argv.slice(2);
if (variant !== "default" && variant !== "forced") throw new Error(`unknown variant ${variant}`);
const iterations = Number.parseInt(iterationsText, 10);
if (!Number.isSafeInteger(iterations) || iterations < 1) throw new Error(`bad iteration count ${iterationsText}`);

const env: NodeJS.ProcessEnv = {};
for (const [key, value] of Object.entries(process.env)) {
  if (value !== undefined && !key.startsWith("GIT_")) env[key] = value;
}
env["GIT_CONFIG_GLOBAL"] = os.devNull;
env["GIT_CONFIG_NOSYSTEM"] = "1";
env["GIT_TERMINAL_PROMPT"] = "0";

function git(cwd: string, ...args: string[]): void {
  execFileSync("git", args, { cwd, env, stdio: "ignore" });
}

const CONFIG = [
  ["user.email", "test@test.com"],
  ["user.name", "test"],
  ["commit.gpgsign", "false"],
  ["tag.gpgSign", "false"],
  ["core.fsmonitor", "false"],
] as const;

const work = fs.mkdtempSync(path.join(os.tmpdir(), "graft-enotempty-repro-"));
const outcomes = new Map<string, number>();
for (let i = 0; i < iterations; i += 1) {
  const repo = fs.mkdtempSync(path.join(work, "repo-"));
  git(repo, "init", "--initial-branch", "main");
  for (const [key, value] of CONFIG) git(repo, "config", key, value);
  fs.writeFileSync(path.join(repo, "a.ts"), "export function foo() {}\n");
  git(repo, "add", "-A");
  git(repo, "commit", "-m", "init");
  fs.unlinkSync(path.join(repo, "a.ts"));
  git(repo, "add", "-A");
  git(repo, "commit", "-m", "delete-a");
  if (variant === "forced") git(repo, "maintenance", "run", "--task=gc", "--detach");
  let outcome = "ok";
  try {
    fs.rmSync(repo, { recursive: true, force: true });
  } catch (error: unknown) {
    outcome = (error as NodeJS.ErrnoException).code ?? "other";
  }
  outcomes.set(outcome, (outcomes.get(outcome) ?? 0) + 1);
}
const failed = [...outcomes.keys()].some((outcome) => outcome !== "ok");
if (!failed) fs.rmSync(work, { recursive: true, force: true });
const gitVersion = execFileSync("git", ["--version"], { encoding: "utf8" }).trim();
console.log(JSON.stringify({ variant, iterations, gitVersion, outcomes: Object.fromEntries(outcomes), leftovers: failed ? work : null }));
