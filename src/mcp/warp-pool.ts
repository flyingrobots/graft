import type { WarpGraphPort } from "../ports/warp.js";
import { DEFAULT_WARP_WRITER_ID } from "../warp/writer-id.js";

export interface WarpPool {
  getOrOpen(repoId: string, worktreeRoot: string, writerId?: string): Promise<WarpGraphPort>;
  size(): number;
}

export class InMemoryWarpPool implements WarpPool {
  private readonly opened = new Map<string, Map<string, Promise<WarpGraphPort>>>();

  constructor(private readonly openWarp: (worktreeRoot: string, writerId: string) => Promise<WarpGraphPort>) {}

  getOrOpen(repoId: string, worktreeRoot: string, writerId: string = DEFAULT_WARP_WRITER_ID): Promise<WarpGraphPort> {
    const repoHandles = this.opened.get(repoId);
    const cached = repoHandles?.get(writerId);
    if (cached !== undefined) return cached;

    const nextRepoHandles = repoHandles ?? new Map<string, Promise<WarpGraphPort>>();
    const opened = this.openWarp(worktreeRoot, writerId).catch((error: unknown) => {
      const current = this.opened.get(repoId);
      current?.delete(writerId);
      if (current?.size === 0) {
        this.opened.delete(repoId);
      }
      throw error;
    });
    nextRepoHandles.set(writerId, opened);
    this.opened.set(repoId, nextRepoHandles);
    return opened;
  }

  size(): number {
    return this.opened.size;
  }
}
