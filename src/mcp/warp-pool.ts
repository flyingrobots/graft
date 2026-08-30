import type WarpApp from "@git-stunts/git-warp";
import { DEFAULT_WARP_WRITER_ID } from "../warp/writer-id.js";

export interface WarpPool {
  getOrOpen(repoId: string, worktreeRoot: string, writerId?: string, leaseHolderId?: string): Promise<WarpApp>;
  acquireLease?(repoId: string, leaseHolderId: string): void;
  releaseLease?(repoId: string, leaseHolderId: string): void;
  leaseCount?(repoId: string): number;
  has?(repoId: string): boolean;
  eject?(repoId: string, force?: boolean): Promise<boolean>;
  ejectUnreferenced?(): Promise<number>;
  size(): number;
}

export class InMemoryWarpPool implements WarpPool {
  private readonly opened = new Map<string, Map<string, Promise<WarpApp>>>();
  private readonly leases = new Map<string, Set<string>>();

  constructor(private readonly openWarp: (worktreeRoot: string, writerId: string) => Promise<WarpApp>) {}

  getOrOpen(
    repoId: string,
    worktreeRoot: string,
    writerId: string = DEFAULT_WARP_WRITER_ID,
    leaseHolderId?: string,
  ): Promise<WarpApp> {
    if (leaseHolderId !== undefined) {
      this.acquireLease(repoId, leaseHolderId);
    }
    const repoHandles = this.opened.get(repoId);
    const cached = repoHandles?.get(writerId);
    if (cached !== undefined) return cached;

    const nextRepoHandles = repoHandles ?? new Map<string, Promise<WarpApp>>();
    const opened = this.openWarp(worktreeRoot, writerId).catch((error: unknown) => {
      const current = this.opened.get(repoId);
      current?.delete(writerId);
      if (current?.size === 0) {
        this.opened.delete(repoId);
        this.leases.delete(repoId);
      }
      throw error;
    });
    nextRepoHandles.set(writerId, opened);
    this.opened.set(repoId, nextRepoHandles);
    return opened;
  }

  acquireLease(repoId: string, leaseHolderId: string): void {
    let holders = this.leases.get(repoId);
    if (holders === undefined) {
      holders = new Set<string>();
      this.leases.set(repoId, holders);
    }
    holders.add(leaseHolderId);
  }

  releaseLease(repoId: string, leaseHolderId: string): void {
    const holders = this.leases.get(repoId);
    if (holders === undefined) return;
    holders.delete(leaseHolderId);
    if (holders.size === 0) {
      this.leases.delete(repoId);
    }
  }

  leaseCount(repoId: string): number {
    return this.leases.get(repoId)?.size ?? 0;
  }

  has(repoId: string): boolean {
    return this.opened.has(repoId);
  }

  eject(repoId: string, force = false): Promise<boolean> {
    if (!force && this.leaseCount(repoId) > 0) {
      return Promise.resolve(false);
    }
    const repoHandles = this.opened.get(repoId);
    if (repoHandles === undefined) {
      return Promise.resolve(false);
    }
    this.opened.delete(repoId);
    this.leases.delete(repoId);
    return Promise.resolve(true);
  }

  async ejectUnreferenced(): Promise<number> {
    let count = 0;
    for (const repoId of [...this.opened.keys()]) {
      if (this.leaseCount(repoId) === 0) {
        if (await this.eject(repoId)) {
          count++;
        }
      }
    }
    return count;
  }

  size(): number {
    return this.opened.size;
  }
}
