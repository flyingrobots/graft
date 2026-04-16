import * as crypto from "node:crypto";
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

  const gitCommonDir = toAbsolutePath(worktreeRoot, rawGitCommonDir);
  return {
    repoId: stableWorkspaceId("repo", gitCommonDir),
    worktreeId: stableWorkspaceId("worktree", worktreeRoot),
    worktreeRoot,
    gitCommonDir,
  };
}
