import type WarpApp from "@git-stunts/git-warp";

export interface WarpPool {
  getOrOpen(repoId: string, worktreeRoot: string): Promise<WarpApp>;
  size(): number;
}

export class InMemoryWarpPool implements WarpPool {
  private readonly opened = new Map<string, Promise<WarpApp>>();

  constructor(private readonly openWarp: (worktreeRoot: string) => Promise<WarpApp>) {}

  getOrOpen(repoId: string, worktreeRoot: string): Promise<WarpApp> {
    const cached = this.opened.get(repoId);
    if (cached !== undefined) return cached;
    const opened = this.openWarp(worktreeRoot).catch((error: unknown) => {
      this.opened.delete(repoId);
      throw error;
    });
    this.opened.set(repoId, opened);
    return opened;
  }

  size(): number {
    return this.opened.size;
  }
}
