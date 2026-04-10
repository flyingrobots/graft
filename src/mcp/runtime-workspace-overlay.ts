import * as path from "node:path";
import type { FileSystem } from "../ports/filesystem.js";
import type { GitClient } from "../ports/git.js";
import type {
  RepoTransition,
  WorkspaceOverlaySummary,
} from "./repo-state.js";

export type GitHookBootstrapPosture = "absent" | "external_unknown";
export type WorkspaceOverlayObservationMode = "inferred_between_tool_calls";
export type WorkspaceOverlayDegradedReason =
  | "target_repo_hooks_absent"
  | "target_repo_hooks_unrecognized";

export interface GitHookBootstrapStatus {
  readonly posture: GitHookBootstrapPosture;
  readonly configuredCoreHooksPath: string | null;
  readonly resolvedHooksPath: string;
  readonly requiredHooks: readonly string[];
  readonly presentHooks: readonly string[];
  readonly missingHooks: readonly string[];
  readonly supportsCheckoutBoundaries: false;
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
}

const REQUIRED_GIT_TRANSITION_HOOKS = [
  "post-checkout",
  "post-merge",
  "post-rewrite",
] as const;

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

function resolveHooksPath(
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

async function fileExists(fs: FileSystem, targetPath: string): Promise<boolean> {
  try {
    await fs.readFile(targetPath, "utf-8");
    return true;
  } catch {
    return false;
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
  const resolvedHooksPath = resolveHooksPath(
    worktreeRoot,
    gitCommonDir,
    configuredCoreHooksPath,
  );

  const presentHooks: string[] = [];
  const missingHooks: string[] = [];
  for (const hookName of REQUIRED_GIT_TRANSITION_HOOKS) {
    if (await fileExists(fs, path.join(resolvedHooksPath, hookName))) {
      presentHooks.push(hookName);
    } else {
      missingHooks.push(hookName);
    }
  }

  return {
    posture: presentHooks.length === 0 ? "absent" : "external_unknown",
    configuredCoreHooksPath,
    resolvedHooksPath,
    requiredHooks: [...REQUIRED_GIT_TRANSITION_HOOKS],
    presentHooks,
    missingHooks,
    supportsCheckoutBoundaries: false,
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
  return {
    observationMode: "inferred_between_tool_calls",
    degraded: true,
    degradedReason: hookBootstrap.posture === "absent"
      ? "target_repo_hooks_absent"
      : "target_repo_hooks_unrecognized",
    checkoutEpoch: repoState.checkoutEpoch,
    lastTransition: repoState.lastTransition,
    workspaceOverlayId: repoState.workspaceOverlayId,
    workspaceOverlay: repoState.workspaceOverlay,
    hookBootstrap,
  };
}
