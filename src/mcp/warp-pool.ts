import type WarpApp from "@git-stunts/git-warp";
import { DEFAULT_WARP_WRITER_ID } from "../warp/writer-id.js";
import {
  openWarpSidecar,
  resolveWarpSidecarLocation,
  type WarpSidecarLocation,
  type WarpSidecarOpenOptions,
  type WarpSidecarWorkspaceIdentity,
} from "../warp/sidecar.js";

export type WarpPoolWorkspace = WarpSidecarWorkspaceIdentity;

export interface WarpPool {
  getOrOpen(workspace: WarpPoolWorkspace, writerId?: string): Promise<WarpApp>;
  locationFor(workspace: WarpPoolWorkspace, writerId?: string): WarpSidecarLocation;
  size(): number;
}

export interface InMemoryWarpPoolOptions {
  readonly graphRoot: string;
  readonly openSidecar?: ((options: WarpSidecarOpenOptions) => Promise<WarpApp>) | undefined;
}

export class InMemoryWarpPool implements WarpPool {
  private readonly opened = new Map<string, Map<string, Map<string, Promise<WarpApp>>>>();
  private readonly graphRoot: string;
  private readonly openSidecar: (options: WarpSidecarOpenOptions) => Promise<WarpApp>;

  constructor(options: InMemoryWarpPoolOptions) {
    this.graphRoot = options.graphRoot;
    this.openSidecar = options.openSidecar ?? openWarpSidecar;
  }

  locationFor(
    workspace: WarpPoolWorkspace,
    writerId: string = DEFAULT_WARP_WRITER_ID,
  ): WarpSidecarLocation {
    return resolveWarpSidecarLocation(this.graphRoot, { ...workspace, writerId });
  }

  getOrOpen(
    workspace: WarpPoolWorkspace,
    writerId: string = DEFAULT_WARP_WRITER_ID,
  ): Promise<WarpApp> {
    const repoHandles = this.opened.get(workspace.repoId);
    const worktreeHandles = repoHandles?.get(workspace.worktreeId);
    const cached = worktreeHandles?.get(writerId);
    if (cached !== undefined) return cached;

    const nextRepoHandles = repoHandles ?? new Map<string, Map<string, Promise<WarpApp>>>();
    const nextWorktreeHandles = worktreeHandles ?? new Map<string, Promise<WarpApp>>();
    const location = this.locationFor(workspace, writerId);
    const opened = this.openSidecar({
      graphRoot: location.graphRoot,
      sidecarRepo: location.repoPath,
      writerId,
    }).catch((error: unknown) => {
      const currentRepo = this.opened.get(workspace.repoId);
      const currentWorktree = currentRepo?.get(workspace.worktreeId);
      currentWorktree?.delete(writerId);
      if (currentWorktree?.size === 0) {
        currentRepo?.delete(workspace.worktreeId);
      }
      if (currentRepo?.size === 0) {
        this.opened.delete(workspace.repoId);
      }
      throw error;
    });
    nextWorktreeHandles.set(writerId, opened);
    nextRepoHandles.set(workspace.worktreeId, nextWorktreeHandles);
    this.opened.set(workspace.repoId, nextRepoHandles);
    return opened;
  }

  size(): number {
    return this.opened.size;
  }
}
