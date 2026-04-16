import * as fs from "node:fs";
import * as path from "node:path";
import { execFileSync } from "node:child_process";
import {
  buildTargetGitHookScript,
  isRecognizedTargetGitHook,
  resolveGitHooksPath,
  TARGET_GIT_TRANSITION_HOOKS,
} from "../git/target-git-hook-bootstrap.js";
import { InitAction } from "./init-model.js";

function readGitValue(cwd: string, args: readonly string[]): string | null {
  try {
    const value = execFileSync("git", [...args], {
      cwd,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

function relativeLabel(cwd: string, filePath: string): string {
  const relative = path.relative(cwd, filePath);
  if (relative.length === 0 || relative.startsWith("..")) {
    return filePath;
  }
  return relative;
}

function resolveTargetGitHooksDirectory(cwd: string): {
  configuredCoreHooksPath: string | null;
  resolvedHooksPath: string;
} {
  const worktreeRoot = readGitValue(cwd, [
    "rev-parse",
    "--path-format=absolute",
    "--show-toplevel",
  ]);
  const gitCommonDir = readGitValue(cwd, [
    "rev-parse",
    "--path-format=absolute",
    "--git-common-dir",
  ]);
  if (worktreeRoot === null || gitCommonDir === null) {
    throw new Error("--write-target-git-hooks requires a git worktree");
  }

  const configuredCoreHooksPath = readGitValue(cwd, ["config", "--get", "core.hooksPath"]);
  return {
    configuredCoreHooksPath,
    resolvedHooksPath: resolveGitHooksPath(
      worktreeRoot,
      gitCommonDir,
      configuredCoreHooksPath,
    ),
  };
}

export function ensureTargetGitHooks(cwd: string): InitAction[] {
  const { resolvedHooksPath } = resolveTargetGitHooksDirectory(cwd);
  const actions: InitAction[] = [];
  fs.mkdirSync(resolvedHooksPath, { recursive: true });

  for (const hookName of TARGET_GIT_TRANSITION_HOOKS) {
    const hookPath = path.join(resolvedHooksPath, hookName);
    const label = relativeLabel(cwd, hookPath);
    const nextContent = buildTargetGitHookScript(hookName);
    if (!fs.existsSync(hookPath)) {
      fs.writeFileSync(hookPath, nextContent);
      fs.chmodSync(hookPath, 0o755);
      actions.push(InitAction.create(label, "wrote graft target git hook"));
      continue;
    }

    const existing = fs.readFileSync(hookPath, "utf-8");
    if (existing === nextContent) {
      actions.push(InitAction.exists(label, "already has graft target git hook"));
      continue;
    }
    if (isRecognizedTargetGitHook(existing, hookName)) {
      fs.writeFileSync(hookPath, nextContent);
      fs.chmodSync(hookPath, 0o755);
      actions.push(InitAction.append(label, "updated graft target git hook"));
      continue;
    }
    actions.push(InitAction.exists(label, "external hook preserved"));
  }

  return actions;
}
