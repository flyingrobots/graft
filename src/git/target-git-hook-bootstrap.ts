import * as path from "node:path";

export const TARGET_GIT_TRANSITION_HOOKS = [
  "post-checkout",
  "post-merge",
  "post-rewrite",
] as const;

export const TARGET_GIT_HOOK_MARKER = "graft-target-repo-git-hook";

export function resolveGitHooksPath(
  worktreeRoot: string,
  gitCommonDir: string,
  configuredCoreHooksPath: string | null,
): string {
  if (configuredCoreHooksPath === null) {
    return path.join(gitCommonDir, "hooks");
  }
  return path.isAbsolute(configuredCoreHooksPath)
    ? configuredCoreHooksPath
    : path.resolve(worktreeRoot, configuredCoreHooksPath);
}

export function isRecognizedTargetGitHook(
  content: string,
  hookName: (typeof TARGET_GIT_TRANSITION_HOOKS)[number],
): boolean {
  return content.includes(`# ${TARGET_GIT_HOOK_MARKER}:${hookName}`);
}

export function isTargetGitTransitionHookName(
  value: string,
): value is (typeof TARGET_GIT_TRANSITION_HOOKS)[number] {
  return TARGET_GIT_TRANSITION_HOOKS.includes(value as (typeof TARGET_GIT_TRANSITION_HOOKS)[number]);
}

export function buildTargetGitHookScript(
  hookName: (typeof TARGET_GIT_TRANSITION_HOOKS)[number],
): string {
  return [
    "#!/bin/sh",
    `# ${TARGET_GIT_HOOK_MARKER}:${hookName}`,
    "set -eu",
    "GRAFT_WORKTREE_ROOT=\"$(git rev-parse --show-toplevel 2>/dev/null || pwd)\"",
    "node -e '",
    "const fs = require(\"node:fs\");",
    "const path = require(\"node:path\");",
    "const [hookName, worktreeRoot, ...hookArgs] = process.argv.slice(1);",
    "const runtimeDir = path.join(worktreeRoot, \".graft\", \"runtime\");",
    "fs.mkdirSync(runtimeDir, { recursive: true });",
    "const event = { hookName, hookArgs, worktreeRoot, observedAt: new Date().toISOString() };",
    "fs.appendFileSync(path.join(runtimeDir, \"git-transitions.ndjson\"), JSON.stringify(event) + \"\\n\");",
    `' "${hookName}" "$GRAFT_WORKTREE_ROOT" "$@"`,
    "",
  ].join("\n");
}
