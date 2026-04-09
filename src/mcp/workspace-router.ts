import * as crypto from "node:crypto";
import * as path from "node:path";
import type WarpApp from "@git-stunts/git-warp";
import { ObservationCache } from "./cache.js";
import { createPathResolver } from "./context.js";
import { Metrics } from "./metrics.js";
import { loadProjectGraftignore } from "./policy.js";
import { RepoStateTracker } from "./repo-state.js";
import { SessionTracker } from "../session/tracker.js";
import type { FileSystem } from "../ports/filesystem.js";
import type { GitClient } from "../ports/git.js";
import type { WarpPool } from "./warp-pool.js";
import { DEFAULT_WARP_WRITER_ID } from "../warp/writer-id.js";

export type WorkspaceSessionMode = "repo_local" | "daemon";
export type WorkspaceBindState = "bound" | "unbound";
export type WorkspaceBindAction = "bind" | "rebind";

export interface WorkspaceCapabilityProfile {
  readonly boundedReads: boolean;
  readonly structuralTools: boolean;
  readonly precisionTools: boolean;
  readonly stateBookmarks: boolean;
  readonly runtimeLogs: "session_local_only";
  readonly runCapture: boolean;
}

export interface WorkspaceStatus {
  readonly sessionMode: WorkspaceSessionMode;
  readonly bindState: WorkspaceBindState;
  readonly repoId: string | null;
  readonly worktreeId: string | null;
  readonly worktreeRoot: string | null;
  readonly gitCommonDir: string | null;
  readonly graftDir: string | null;
  readonly capabilityProfile: WorkspaceCapabilityProfile | null;
}

export interface WorkspaceActionResult extends WorkspaceStatus {
  readonly ok: boolean;
  readonly action: WorkspaceBindAction;
  readonly freshSessionSlice: boolean;
  readonly errorCode?: string;
  readonly error?: string;
}

export interface WorkspaceBindRequest {
  readonly cwd: string;
  readonly worktreeRoot?: string | undefined;
  readonly gitCommonDir?: string | undefined;
  readonly repoId?: string | undefined;
}

export class WorkspaceBindingRequiredError extends Error {
  readonly code = "UNBOUND_SESSION";

  constructor(toolName: string) {
    super(`Tool ${toolName} requires an active workspace binding. Call workspace_bind first.`);
    this.name = "WorkspaceBindingRequiredError";
  }
}

export class WorkspaceCapabilityDeniedError extends Error {
  readonly code = "CAPABILITY_DENIED";

  constructor(toolName: string) {
    super(`Tool ${toolName} is not enabled in the daemon default capability profile.`);
    this.name = "WorkspaceCapabilityDeniedError";
  }
}

interface WorkspaceBindError {
  readonly code: string;
  readonly message: string;
}

interface WorkspaceSlice {
  readonly session: SessionTracker;
  readonly cache: ObservationCache;
  readonly metrics: Metrics;
  readonly graftDir: string;
  readonly repoState: RepoStateTracker | null;
}

interface BoundWorkspace {
  readonly repoId: string;
  readonly worktreeId: string;
  readonly worktreeRoot: string;
  readonly gitCommonDir: string;
  readonly graftignorePatterns: readonly string[];
  readonly resolvePath: (input: string) => string;
  readonly capabilityProfile: WorkspaceCapabilityProfile;
  readonly slice: WorkspaceSlice;
  readonly getWarp: () => Promise<WarpApp>;
}

export interface ResolvedWorkspace {
  readonly repoId: string;
  readonly worktreeId: string;
  readonly worktreeRoot: string;
  readonly gitCommonDir: string;
}

export interface WorkspaceAuthorizationPolicy {
  getCapabilityProfile(resolved: ResolvedWorkspace): Promise<WorkspaceCapabilityProfile | null>;
  noteBound(resolved: ResolvedWorkspace): Promise<void>;
}

interface WorkspaceRouterOptions {
  readonly mode: WorkspaceSessionMode;
  readonly fs: FileSystem;
  readonly git: GitClient;
  readonly graftDir: string;
  readonly projectRoot?: string | undefined;
  readonly warpPool: WarpPool;
  readonly authorizationPolicy?: WorkspaceAuthorizationPolicy | undefined;
}

export const DEFAULT_DAEMON_CAPABILITY_PROFILE: WorkspaceCapabilityProfile = Object.freeze({
  boundedReads: true,
  structuralTools: true,
  precisionTools: true,
  stateBookmarks: true,
  runtimeLogs: "session_local_only",
  runCapture: false,
});

export const DEFAULT_REPO_LOCAL_CAPABILITY_PROFILE: WorkspaceCapabilityProfile = Object.freeze({
  boundedReads: true,
  structuralTools: true,
  precisionTools: true,
  stateBookmarks: true,
  runtimeLogs: "session_local_only",
  runCapture: true,
});

function stableId(prefix: string, input: string): string {
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
    repoId: stableId("repo", gitCommonDir),
    worktreeId: stableId("worktree", worktreeRoot),
    worktreeRoot,
    gitCommonDir,
  };
}

export class WorkspaceRouter {
  private sliceCounter = 0;
  private currentSlice: WorkspaceSlice;
  private currentBinding: BoundWorkspace | null = null;
  private initialization: Promise<void> | null = null;

  constructor(private readonly options: WorkspaceRouterOptions) {
    const initialProjectRoot = options.mode === "repo_local" ? options.projectRoot : undefined;
    this.currentSlice = this.createSlice(
      options.mode === "repo_local" ? options.graftDir : path.join(options.graftDir, "unbound"),
      initialProjectRoot,
    );
  }

  async initialize(): Promise<void> {
    if (this.options.mode !== "repo_local") {
      return;
    }
    if (this.currentBinding !== null) {
      return;
    }
    if (this.initialization !== null) {
      await this.initialization;
      return;
    }

    const projectRoot = this.options.projectRoot;
    if (projectRoot === undefined) {
      throw new Error("repo_local workspace router requires projectRoot");
    }

    this.initialization = (async () => {
      const resolved = await resolveWorkspaceRequest(this.options.git, { cwd: projectRoot });
      const initialWorkspace = "code" in resolved
        ? {
            repoId: stableId("repo", projectRoot),
            worktreeId: stableId("worktree", projectRoot),
            worktreeRoot: projectRoot,
            gitCommonDir: projectRoot,
          }
        : {
            repoId: resolved.repoId,
            worktreeId: stableId("worktree", projectRoot),
            worktreeRoot: projectRoot,
            gitCommonDir: resolved.gitCommonDir,
          };
      const currentBinding = this.createBoundWorkspace(
        initialWorkspace,
        this.options.graftDir,
        DEFAULT_REPO_LOCAL_CAPABILITY_PROFILE,
        undefined,
        this.currentSlice,
      );
      await currentBinding.slice.repoState?.initialize();
      this.currentBinding = currentBinding;
    })();

    await this.initialization;
  }

  get mode(): WorkspaceSessionMode {
    return this.options.mode;
  }

  get session(): SessionTracker {
    return this.currentSlice.session;
  }

  get cache(): ObservationCache {
    return this.currentSlice.cache;
  }

  get metrics(): Metrics {
    return this.currentSlice.metrics;
  }

  get graftDir(): string {
    return this.currentSlice.graftDir;
  }

  isBound(): boolean {
    return this.currentBinding !== null;
  }

  getProjectRoot(): string {
    return this.requireBinding().worktreeRoot;
  }

  getGraftignorePatterns(): readonly string[] {
    return this.requireBinding().graftignorePatterns;
  }

  getPathResolver(): (input: string) => string {
    return this.requireBinding().resolvePath;
  }

  getWarp(): Promise<WarpApp> {
    return this.requireBinding().getWarp();
  }

  async observeRepoState(): Promise<void> {
    await this.requireRepoState().observe();
  }

  getRepoState() {
    return this.requireRepoState().getState();
  }

  getStatus(): WorkspaceStatus {
    if (this.currentBinding === null) {
      return {
        sessionMode: this.options.mode,
        bindState: "unbound",
        repoId: null,
        worktreeId: null,
        worktreeRoot: null,
        gitCommonDir: null,
        graftDir: null,
        capabilityProfile: null,
      };
    }

    return {
      sessionMode: this.options.mode,
      bindState: "bound",
      repoId: this.currentBinding.repoId,
      worktreeId: this.currentBinding.worktreeId,
      worktreeRoot: this.currentBinding.worktreeRoot,
      gitCommonDir: this.currentBinding.gitCommonDir,
      graftDir: this.currentBinding.slice.graftDir,
      capabilityProfile: this.currentBinding.capabilityProfile,
    };
  }

  async bind(request: WorkspaceBindRequest, actionName: string): Promise<WorkspaceActionResult> {
    return this.bindInternal("bind", request, actionName);
  }

  async rebind(request: WorkspaceBindRequest, actionName: string): Promise<WorkspaceActionResult> {
    if (this.currentBinding === null) {
      return {
        ok: false,
        action: "rebind",
        freshSessionSlice: false,
        ...this.getStatus(),
        errorCode: "UNBOUND_SESSION",
        error: "workspace_rebind requires an active workspace binding.",
      };
    }
    return this.bindInternal("rebind", request, actionName);
  }

  private async bindInternal(
    action: WorkspaceBindAction,
    request: WorkspaceBindRequest,
    actionName: string,
  ): Promise<WorkspaceActionResult> {
    const resolved = await resolveWorkspaceRequest(this.options.git, request);
    if ("code" in resolved) {
      return {
        ok: false,
        action,
        freshSessionSlice: false,
        ...this.getStatus(),
        errorCode: resolved.code,
        error: resolved.message,
      };
    }

    const sliceDir = path.join(
      this.options.graftDir,
      "bindings",
      `slice-${String(++this.sliceCounter).padStart(4, "0")}`,
    );
    await this.options.fs.mkdir(sliceDir, { recursive: true });

    const capabilityProfile = this.options.mode === "repo_local"
      ? DEFAULT_REPO_LOCAL_CAPABILITY_PROFILE
      : (await this.options.authorizationPolicy?.getCapabilityProfile(resolved)) ?? null;
    if (capabilityProfile === null) {
      return {
        ok: false,
        action,
        freshSessionSlice: false,
        ...this.getStatus(),
        errorCode: "WORKSPACE_NOT_AUTHORIZED",
        error: `Workspace ${resolved.worktreeRoot} is not authorized for daemon binding. Call workspace_authorize first.`,
      };
    }

    const nextBinding = this.createBoundWorkspace(resolved, sliceDir, capabilityProfile, actionName);
    await nextBinding.slice.repoState?.initialize();
    if (this.options.mode === "daemon") {
      await this.options.authorizationPolicy?.noteBound(resolved);
    }
    this.currentBinding = nextBinding;
    this.currentSlice = nextBinding.slice;

    return {
      ok: true,
      action,
      freshSessionSlice: true,
      ...this.getStatus(),
    };
  }

  private createBoundWorkspace(
    resolved: ResolvedWorkspace,
    graftDir: string,
    capabilityProfile: WorkspaceCapabilityProfile,
    actionName: string | undefined,
    sliceOverride?: WorkspaceSlice,
  ): BoundWorkspace {
    const slice = sliceOverride ?? this.createSlice(graftDir, resolved.worktreeRoot);
    if (actionName !== undefined) {
      slice.session.recordMessage();
      slice.session.recordToolCall(actionName);
    }

    return {
      ...resolved,
      graftignorePatterns: loadProjectGraftignore(this.options.fs, resolved.worktreeRoot),
      resolvePath: createPathResolver(resolved.worktreeRoot),
      capabilityProfile,
      slice,
      getWarp: () => this.options.warpPool.getOrOpen(
        resolved.repoId,
        resolved.worktreeRoot,
        DEFAULT_WARP_WRITER_ID,
      ),
    };
  }

  private createSlice(graftDir: string, projectRoot?: string): WorkspaceSlice {
    return {
      session: new SessionTracker(),
      cache: new ObservationCache(),
      metrics: new Metrics(),
      graftDir,
      repoState: projectRoot !== undefined ? new RepoStateTracker(projectRoot, this.options.fs, this.options.git) : null,
    };
  }

  private requireBinding(): BoundWorkspace {
    if (this.currentBinding === null) {
      throw new WorkspaceBindingRequiredError("workspace");
    }
    return this.currentBinding;
  }

  private requireRepoState(): RepoStateTracker {
    const repoState = this.currentBinding?.slice.repoState;
    if (repoState === null || repoState === undefined) {
      throw new WorkspaceBindingRequiredError("workspace");
    }
    return repoState;
  }
}
