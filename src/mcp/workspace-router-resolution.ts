import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import type { GitClient } from "../ports/git.js";
import type { ResolvedWorkspace, WorkspaceBindRequest } from "./workspace-router-model.js";

interface WorkspaceBindError {
  readonly code: string;
  readonly message: string;
}

export function stableWorkspaceId(prefix: string, input: string): string {
  return `${prefix}:${crypto.createHash("sha256").update(input).digest("hex").slice(0, 16)}`;
}

async function readGitValue(git: GitClient, cwd: string, args: readonly string[]): Promise<string | null> {
  const result = await git.run({ args, cwd });
  if (result.error !== undefined || result.status !== 0) {
    return null;
  }
  const trimmed = result.stdout.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toAbsolutePath(base: string, value: string): string {
  return path.isAbsolute(value) ? value : path.resolve(base, value);
}

/**
 * Resolve symlinks to get the canonical filesystem path.
 * Prevents identity drift from path aliases (e.g. /tmp vs /private/tmp on macOS).
 * Falls back to the input path if realpath fails (e.g. path does not exist yet).
 */
function canonicalize(inputPath: string): string {
  try {
    return fs.realpathSync(inputPath);
  } catch {
    return inputPath;
  }
}

export async function resolveWorkspaceRequest(
  git: GitClient,
  request: WorkspaceBindRequest,
): Promise<ResolvedWorkspace | WorkspaceBindError> {
  const cwd = path.resolve(request.cwd);
  const worktreeRoot = await readGitValue(git, cwd, ["rev-parse", "--path-format=absolute", "--show-toplevel"]);
  if (worktreeRoot === null) {
    return {
      code: "NOT_A_GIT_REPO",
      message: `cwd is not inside a git worktree: ${cwd}`,
    };
  }

  const rawGitCommonDir = await readGitValue(git, cwd, ["rev-parse", "--path-format=absolute", "--git-common-dir"]);
  if (rawGitCommonDir === null) {
    return {
      code: "WORKSPACE_RESOLUTION_FAILED",
      message: `Unable to resolve git common dir from ${cwd}`,
    };
  }

  const gitCommonDir = canonicalize(toAbsolutePath(worktreeRoot, rawGitCommonDir));
  const canonicalWorktreeRoot = canonicalize(worktreeRoot);
  const resolved = {
    repoId: stableWorkspaceId("repo", gitCommonDir),
    worktreeId: stableWorkspaceId("worktree", canonicalWorktreeRoot),
    worktreeRoot: canonicalWorktreeRoot,
    gitCommonDir,
  };
  const mismatchedHints = [
    request.repoId !== undefined && request.repoId !== resolved.repoId ? "repoId" : null,
    request.worktreeRoot !== undefined
      && canonicalize(toAbsolutePath(cwd, request.worktreeRoot)) !== resolved.worktreeRoot
      ? "worktreeRoot"
      : null,
    request.gitCommonDir !== undefined
      && canonicalize(toAbsolutePath(resolved.worktreeRoot, request.gitCommonDir)) !== resolved.gitCommonDir
      ? "gitCommonDir"
      : null,
  ].filter((field): field is string => field !== null);
  if (mismatchedHints.length > 0) {
    return {
      code: "WORKSPACE_IDENTITY_MISMATCH",
      message: `Client workspace identity hints do not match the workspace resolved from cwd: ${mismatchedHints.join(", ")}`,
    };
  }
  return resolved;
}
