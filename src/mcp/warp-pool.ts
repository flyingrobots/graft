import type WarpApp from "@git-stunts/git-warp";

export interface WarpResidentKey {
  readonly repoId: string;
  readonly writerId: string;
}

export interface WarpResidentLease {
  readonly key: WarpResidentKey;
  readonly app: WarpApp;
  release(): Promise<void>;
}

export interface WarpResidentAcquireInput {
  readonly key: WarpResidentKey;
  readonly worktreeRoot: string;
  readonly ownerId: string;
}

export interface WarpResidentPool {
  acquire(input: WarpResidentAcquireInput): Promise<WarpResidentLease>;
  size(): number;
}

export class InMemoryWarpPool implements WarpResidentPool {
  private readonly opened = new Map<string, Map<string, Promise<WarpApp>>>();
  private readonly leases = new Map<string, Map<string, Map<symbol, string>>>();

  constructor(private readonly openWarp: (worktreeRoot: string, writerId: string) => Promise<WarpApp>) {}

  async acquire(input: WarpResidentAcquireInput): Promise<WarpResidentLease> {
    const repoId = input.key.repoId;
    const writerId = input.key.writerId;
    const key: WarpResidentKey = Object.freeze({ repoId, writerId });
    const token = Symbol(input.ownerId);
    this.addLease(repoId, writerId, token, input.ownerId);

    let app: WarpApp;
    try {
      app = await this.getOrOpen(repoId, input.worktreeRoot, writerId);
    } catch (error) {
      this.releaseToken(repoId, writerId, token);
      throw error;
    }

    let released = false;
    return {
      key,
      app,
      release: (): Promise<void> => {
        if (released) return Promise.resolve();
        released = true;
        this.releaseToken(repoId, writerId, token);
        return Promise.resolve();
      },
    };
  }

  private getOrOpen(
    repoId: string,
    worktreeRoot: string,
    writerId: string,
  ): Promise<WarpApp> {
    const repoHandles = this.opened.get(repoId);
    const cached = repoHandles?.get(writerId);
    if (cached !== undefined) return cached;

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
    return opened;
  }

  private addLease(
    repoId: string,
    writerId: string,
    token: symbol,
    ownerId: string,
  ): void {
    let repoLeases = this.leases.get(repoId);
    if (repoLeases === undefined) {
      repoLeases = new Map<string, Map<symbol, string>>();
      this.leases.set(repoId, repoLeases);
    }
    let holders = repoLeases.get(writerId);
    if (holders === undefined) {
      holders = new Map<symbol, string>();
      repoLeases.set(writerId, holders);
    }
    holders.set(token, ownerId);
  }

  private releaseToken(repoId: string, writerId: string, token: symbol): void {
    const repoLeases = this.leases.get(repoId);
    const holders = repoLeases?.get(writerId);
    if (!holders?.delete(token)) return;
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

  size(): number {
    return this.opened.size;
  }
}
