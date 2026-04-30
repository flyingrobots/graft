#!/usr/bin/env tsx
import { execFileSync } from "node:child_process";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const BLOCKED_WORKTREE_PATH = ".claude/worktrees";

export interface AgentWorktreeHygieneResult {
  readonly repoRoot: string;
  readonly blockedPaths: readonly string[];
}

function gitEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value === undefined || key.startsWith("GIT_")) {
      continue;
    }
    env[key] = value;
  }

  env["GIT_CONFIG_GLOBAL"] = os.devNull;
  env["GIT_CONFIG_NOSYSTEM"] = "1";
  env["GIT_TERMINAL_PROMPT"] = "0";

  return env;
}

function git(cwd: string, args: readonly string[]): string {
  return execFileSync("git", [...args], {
    cwd,
    env: gitEnv(),
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function normalizeGitPath(filePath: string): string {
  return filePath.replaceAll("\\", "/").replace(/^\.\//u, "");
}

export function isBlockedAgentWorktreePath(filePath: string): boolean {
  const normalized = normalizeGitPath(filePath);
  return normalized === BLOCKED_WORKTREE_PATH
    || normalized.startsWith(`${BLOCKED_WORKTREE_PATH}/`);
}

export function parseLsFilesStagePaths(output: string): string[] {
  return output
    .split("\0")
    .filter((entry) => entry.length > 0)
    .map((entry) => {
      const pathStart = entry.indexOf("\t");
      return pathStart === -1 ? entry : entry.slice(pathStart + 1);
    });
}

export function findBlockedAgentWorktreePaths(paths: readonly string[]): string[] {
  return [...new Set(paths.map(normalizeGitPath).filter(isBlockedAgentWorktreePath))]
    .sort((left, right) => left.localeCompare(right));
}

export function evaluateAgentWorktreeHygiene(cwd = process.cwd()): AgentWorktreeHygieneResult {
  const repoRoot = git(cwd, ["rev-parse", "--path-format=absolute", "--show-toplevel"]).trim();
  const stagedOutput = git(repoRoot, ["ls-files", "-z", "--stage", "--", BLOCKED_WORKTREE_PATH]);
  return {
    repoRoot,
    blockedPaths: findBlockedAgentWorktreePaths(parseLsFilesStagePaths(stagedOutput)),
  };
}

export function formatAgentWorktreeHygieneFailure(result: AgentWorktreeHygieneResult): string {
  return [
    "agent worktree hygiene: fail",
    "Refusing to continue while .claude/worktrees paths are tracked or staged.",
    "",
    ...result.blockedPaths.map((blockedPath) => `- ${blockedPath}`),
    "",
    "Remove these paths from the index before committing:",
    "  git rm --cached -r .claude/worktrees",
    "",
    "Delete the leftover worktree directories after any useful changes are recovered.",
  ].join("\n");
}

function main(): void {
  const result = evaluateAgentWorktreeHygiene();
  if (result.blockedPaths.length > 0) {
    console.error(formatAgentWorktreeHygieneFailure(result));
    process.exitCode = 1;
    return;
  }

  console.log("agent worktree hygiene: pass");
}

const entrypoint = process.argv[1];
if (entrypoint !== undefined && path.resolve(entrypoint) === fileURLToPath(import.meta.url)) {
  main();
}
