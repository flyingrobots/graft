import type WarpApp from "@git-stunts/git-warp";
import { DEFAULT_WARP_WRITER_ID } from "../warp/writer-id.js";

export interface WarpPool {
  getOrOpen(repoId: string, worktreeRoot: string, writerId?: string, leaseHolderId?: string): Promise<WarpApp>;
  size(): number;
}

export interface LeaseAwareWarpPool extends WarpPool {
  releaseLease(repoId: string, writerId: string, leaseHolderId: string): void;
}

export interface EvictableWarpPool extends LeaseAwareWarpPool {
  acquireLease(repoId: string, writerId: string, leaseHolderId: string): void;
  leaseCount(repoId: string, writerId: string): number;
  has(repoId: string, writerId?: string): boolean;
  eject(repoId: string, writerId: string, force?: boolean): Promise<boolean>;
  ejectUnreferenced(): Promise<number>;
}

export class InMemoryWarpPool implements EvictableWarpPool {
  private readonly opened = new Map<string, Map<string, Promise<WarpApp>>>();
  private readonly leases = new Map<string, Map<string, Set<string>>>();

  constructor(private readonly openWarp: (worktreeRoot: string, writerId: string) => Promise<WarpApp>) {}

  getOrOpen(
    repoId: string,
    worktreeRoot: string,
    writerId: string = DEFAULT_WARP_WRITER_ID,
    leaseHolderId?: string,
  ): Promise<WarpApp> {
    const leaseAcquired = leaseHolderId === undefined
      ? false
      : this.addLease(repoId, writerId, leaseHolderId);
    const repoHandles = this.opened.get(repoId);
    const cached = repoHandles?.get(writerId);
    if (cached !== undefined) {
      return this.rollbackLeaseAfterFailure(
        cached,
        repoId,
        writerId,
        leaseHolderId,
        leaseAcquired,
      );
    }

    const nextRepoHandles = repoHandles ?? new Map<string, Promise<WarpApp>>();
    const opened = this.openWarp(worktreeRoot, writerId).catch((error: unknown) => {
      const current = this.opened.get(repoId);
      if (current?.get(writerId) === opened) {
        current.delete(writerId);
        if (current.size === 0) {
          this.opened.delete(repoId);
        }
      }
      throw error;
    });
    nextRepoHandles.set(writerId, opened);
    this.opened.set(repoId, nextRepoHandles);
    return this.rollbackLeaseAfterFailure(
      opened,
      repoId,
      writerId,
      leaseHolderId,
      leaseAcquired,
    );
  }

  acquireLease(repoId: string, writerId: string, leaseHolderId: string): void {
    this.addLease(repoId, writerId, leaseHolderId);
  }

  private addLease(repoId: string, writerId: string, leaseHolderId: string): boolean {
    let repoLeases = this.leases.get(repoId);
    if (repoLeases === undefined) {
      repoLeases = new Map<string, Set<string>>();
      this.leases.set(repoId, repoLeases);
    }
    let holders = repoLeases.get(writerId);
    if (holders === undefined) {
      holders = new Set<string>();
      repoLeases.set(writerId, holders);
    }
    const previousSize = holders.size;
    holders.add(leaseHolderId);
    return holders.size !== previousSize;
  }

  private rollbackLeaseAfterFailure(
    opening: Promise<WarpApp>,
    repoId: string,
    writerId: string,
    leaseHolderId: string | undefined,
    leaseAcquired: boolean,
  ): Promise<WarpApp> {
    if (!leaseAcquired || leaseHolderId === undefined) return opening;
    return opening.catch((error: unknown) => {
      this.releaseLease(repoId, writerId, leaseHolderId);
      throw error;
    });
  }

  releaseLease(repoId: string, writerId: string, leaseHolderId: string): void {
    const repoLeases = this.leases.get(repoId);
    const holders = repoLeases?.get(writerId);
    if (holders === undefined) return;
    holders.delete(leaseHolderId);
    if (holders.size === 0) {
      repoLeases?.delete(writerId);
      const repoHandles = this.opened.get(repoId);
      repoHandles?.delete(writerId);
      if (repoHandles?.size === 0) {
        this.opened.delete(repoId);
      }
    }
    if (repoLeases?.size === 0) {
      this.leases.delete(repoId);
    }
  }

  leaseCount(repoId: string, writerId: string): number {
    return this.leases.get(repoId)?.get(writerId)?.size ?? 0;
  }

  has(repoId: string, writerId?: string): boolean {
    const repoHandles = this.opened.get(repoId);
    return writerId === undefined ? repoHandles !== undefined : repoHandles?.has(writerId) === true;
  }

  eject(repoId: string, writerId: string, force = false): Promise<boolean> {
    if (!force && this.leaseCount(repoId, writerId) > 0) {
      return Promise.resolve(false);
    }
    const repoHandles = this.opened.get(repoId);
    if (repoHandles?.has(writerId) !== true) {
      return Promise.resolve(false);
    }
    repoHandles.delete(writerId);
    const repoLeases = this.leases.get(repoId);
    repoLeases?.delete(writerId);
    if (repoHandles.size === 0) {
      this.opened.delete(repoId);
    }
    if (repoLeases?.size === 0) {
      this.leases.delete(repoId);
    }
    return Promise.resolve(true);
  }

  async ejectUnreferenced(): Promise<number> {
    let count = 0;
    for (const [repoId, repoHandles] of [...this.opened.entries()]) {
      for (const writerId of [...repoHandles.keys()]) {
        if (this.leaseCount(repoId, writerId) === 0 && await this.eject(repoId, writerId)) {
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
