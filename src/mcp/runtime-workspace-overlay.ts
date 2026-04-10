import * as path from "node:path";
import type { FileSystem } from "../ports/filesystem.js";
import type { GitClient } from "../ports/git.js";
import {
  isRecognizedTargetGitHook,
  isTargetGitTransitionHookName,
  resolveGitHooksPath,
  TARGET_GIT_TRANSITION_HOOKS,
} from "../git/target-git-hook-bootstrap.js";
import type {
  RepoTransition,
  WorkspaceOverlaySummary,
} from "./repo-state.js";

export type GitHookBootstrapPosture = "absent" | "external_unknown" | "installed";
export type WorkspaceOverlayObservationMode =
  | "inferred_between_tool_calls"
  | "hook_observed_checkout_boundaries";
export type WorkspaceOverlayDegradedReason =
  | "target_repo_hooks_absent"
  | "target_repo_hooks_unrecognized"
  | "local_edit_watchers_absent";

export interface GitTransitionHookEvent {
  readonly hookName: (typeof TARGET_GIT_TRANSITION_HOOKS)[number];
  readonly hookArgs: readonly string[];
  readonly worktreeRoot: string;
  readonly observedAt: string;
}

export interface GitHookBootstrapStatus {
  readonly posture: GitHookBootstrapPosture;
  readonly configuredCoreHooksPath: string | null;
  readonly resolvedHooksPath: string;
  readonly requiredHooks: readonly string[];
  readonly presentHooks: readonly string[];
  readonly missingHooks: readonly string[];
  readonly supportsCheckoutBoundaries: boolean;
}

export interface RuntimeWorkspaceOverlayFooting {
  readonly observationMode: WorkspaceOverlayObservationMode;
  readonly degraded: true;
  readonly degradedReason: WorkspaceOverlayDegradedReason;
  readonly checkoutEpoch: number;
  readonly lastTransition: RepoTransition | null;
  readonly workspaceOverlayId: string | null;
  readonly workspaceOverlay: WorkspaceOverlaySummary | null;
  readonly hookBootstrap: GitHookBootstrapStatus;
  readonly latestHookEvent: GitTransitionHookEvent | null;
}

async function readGitConfig(
  gitClient: GitClient,
  cwd: string,
  key: string,
): Promise<string | null> {
  const result = await gitClient.run({
    args: ["config", "--get", key],
    cwd,
  });
  if (result.status !== 0) {
    return null;
  }
  const value = result.stdout.trim();
  return value.length > 0 ? value : null;
}

async function fileExists(fs: FileSystem, targetPath: string): Promise<boolean> {
  try {
    await fs.readFile(targetPath, "utf-8");
    return true;
  } catch {
    return false;
  }
}

function parseHookEventLine(
  line: string,
  worktreeRoot: string,
): GitTransitionHookEvent | null {
  try {
    const parsed = JSON.parse(line) as Record<string, unknown>;
    const hookName = parsed["hookName"];
    const hookArgs = parsed["hookArgs"];
    const observedAt = parsed["observedAt"];
    const observedWorktreeRoot = parsed["worktreeRoot"];
    if (
      typeof hookName !== "string"
      || !isTargetGitTransitionHookName(hookName)
      || !Array.isArray(hookArgs)
      || !hookArgs.every((value) => typeof value === "string")
      || typeof observedAt !== "string"
      || typeof observedWorktreeRoot !== "string"
      || observedWorktreeRoot !== worktreeRoot
    ) {
      return null;
    }
    return {
      hookName,
      hookArgs,
      worktreeRoot: observedWorktreeRoot,
      observedAt,
    };
  } catch {
    return null;
  }
}

async function readLatestHookEvent(
  fs: FileSystem,
  worktreeRoot: string,
): Promise<GitTransitionHookEvent | null> {
  const logPath = path.join(worktreeRoot, ".graft", "runtime", "git-transitions.ndjson");
  try {
    const content = await fs.readFile(logPath, "utf-8");
    const lines = content.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0);
    for (let index = lines.length - 1; index >= 0; index -= 1) {
      const line = lines[index];
      if (line === undefined) continue;
      const parsed = parseHookEventLine(line, worktreeRoot);
      if (parsed !== null) {
        return parsed;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function inspectGitHookBootstrap(
  fs: FileSystem,
  gitClient: GitClient,
  worktreeRoot: string,
  gitCommonDir: string,
): Promise<GitHookBootstrapStatus> {
  const configuredCoreHooksPath = await readGitConfig(
    gitClient,
    worktreeRoot,
    "core.hooksPath",
  );
  const resolvedHooksPath = resolveGitHooksPath(
    worktreeRoot,
    gitCommonDir,
    configuredCoreHooksPath,
  );

  const presentHooks: string[] = [];
  const missingHooks: string[] = [];
  let recognizedHooks = 0;
  let externalHooks = 0;
  for (const hookName of TARGET_GIT_TRANSITION_HOOKS) {
    const hookPath = path.join(resolvedHooksPath, hookName);
    if (await fileExists(fs, hookPath)) {
      presentHooks.push(hookName);
      try {
        const content = await fs.readFile(hookPath, "utf-8");
        if (isRecognizedTargetGitHook(content, hookName)) {
          recognizedHooks += 1;
        } else {
          externalHooks += 1;
        }
      } catch {
        externalHooks += 1;
      }
    } else {
      missingHooks.push(hookName);
    }
  }

  const allHooksInstalled = recognizedHooks === TARGET_GIT_TRANSITION_HOOKS.length;
  return {
    posture: allHooksInstalled
      ? "installed"
      : (presentHooks.length === 0 ? "absent" : "external_unknown"),
    configuredCoreHooksPath,
    resolvedHooksPath,
    requiredHooks: [...TARGET_GIT_TRANSITION_HOOKS],
    presentHooks,
    missingHooks,
    supportsCheckoutBoundaries: allHooksInstalled && externalHooks === 0,
  };
}

export async function buildRuntimeWorkspaceOverlayFooting(
  fs: FileSystem,
  gitClient: GitClient,
  worktreeRoot: string,
  gitCommonDir: string,
  repoState: {
    readonly checkoutEpoch: number;
    readonly lastTransition: RepoTransition | null;
    readonly workspaceOverlayId: string | null;
    readonly workspaceOverlay: WorkspaceOverlaySummary | null;
  },
): Promise<RuntimeWorkspaceOverlayFooting> {
  const hookBootstrap = await inspectGitHookBootstrap(
    fs,
    gitClient,
    worktreeRoot,
    gitCommonDir,
  );
  const latestHookEvent = hookBootstrap.supportsCheckoutBoundaries
    ? await readLatestHookEvent(fs, worktreeRoot)
    : null;
  return {
    observationMode: latestHookEvent === null
      ? "inferred_between_tool_calls"
      : "hook_observed_checkout_boundaries",
    degraded: true,
    degradedReason: hookBootstrap.supportsCheckoutBoundaries
      ? "local_edit_watchers_absent"
      : (hookBootstrap.posture === "absent"
          ? "target_repo_hooks_absent"
          : "target_repo_hooks_unrecognized"),
    checkoutEpoch: repoState.checkoutEpoch,
    lastTransition: repoState.lastTransition,
    workspaceOverlayId: repoState.workspaceOverlayId,
    workspaceOverlay: repoState.workspaceOverlay,
    hookBootstrap,
    latestHookEvent,
  };
}
