import type WarpApp from "@git-stunts/git-warp";
import { DEFAULT_WARP_WRITER_ID } from "../warp/writer-id.js";
import {
  openWarpSidecar,
  resolveWarpGraphRoot,
  resolveWarpSidecarLocation,
  type WarpSidecarLocation,
  type WarpSidecarOpenOptions,
  type WarpSidecarWorkspaceIdentity,
} from "../warp/sidecar.js";

export type WarpPoolWorkspace = WarpSidecarWorkspaceIdentity;

/** One isolated sidecar graph: a source repo, one of its worktrees, and one writer lane. */
export interface WarpResidentKey {
  readonly repoId: string;
  readonly worktreeId: string;
  readonly writerId: string;
}

export interface WarpResidentLease {
  readonly key: WarpResidentKey;
  /** Valid only until this capability is released. */
  readonly app: WarpApp;
  release(): Promise<void>;
}

export interface WarpResidentAcquireInput {
  readonly workspace: WarpPoolWorkspace;
  readonly writerId: string;
  readonly ownerId: string;
}

export interface WarpResidentPool {
  acquire(input: WarpResidentAcquireInput): Promise<WarpResidentLease>;
  locationFor(workspace: WarpPoolWorkspace, writerId?: string): WarpSidecarLocation;
  size(): number;
  residentCount(): number;
}

export const DEFAULT_MAX_WARP_RESIDENTS = 4;
const MAX_CONFIGURED_WARP_RESIDENTS = 64;

export interface WarpPoolOptions {
  readonly maxResidents?: number;
  /** Zero opts into eager release; otherwise idle entries compete by recency. */
  readonly maxIdleResidents?: number;
}

export interface InMemoryWarpPoolOptions extends WarpPoolOptions {
  readonly graphRoot: string;
  readonly openSidecar?: ((options: WarpSidecarOpenOptions) => Promise<WarpApp>) | undefined;
}

export function resolveWarpPoolOptions(env: Readonly<Record<string, string | undefined>>): WarpPoolOptions {
  const configured = env["GRAFT_WARP_MAX_RESIDENTS"];
  if (configured === undefined) return {};
  const value = configured.trim();
  const maxResidents = /^\d+$/.test(value) ? Number(value) : NaN;
  validateCapacity(maxResidents);
  return { maxResidents };
}

function validateCapacity(capacity: number): void {
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > MAX_CONFIGURED_WARP_RESIDENTS) {
    throw new RangeError("GRAFT_WARP_MAX_RESIDENTS must be an integer from 1 through 64");
  }
}

export class WarpResidentCapacityError extends Error {
  readonly code = "WARP_RESIDENT_CAPACITY";

  constructor(readonly maxResidents: number) {
    super("All " + String(maxResidents) + " WARP resident slots are in use; retry after an operation settles");
    this.name = "WarpResidentCapacityError";
  }
}

interface Resident {
  readonly key: WarpResidentKey;
  readonly sidecarRepo: string;
  readonly pins: Map<symbol, string>;
  readonly opening: Promise<WarpApp>;
}

/** A finite working set. Map order records actual use, never observation. */
export class InMemoryWarpPool implements WarpResidentPool {
  private readonly residents = new Map<string, Resident>();
  private readonly graphRoot: string;
  private readonly openSidecar: (options: WarpSidecarOpenOptions) => Promise<WarpApp>;
  private readonly maxResidents: number;
  private readonly maxIdleResidents: number;

  constructor(options: InMemoryWarpPoolOptions) {
    // A pool is where a library host hands Graft a root: resolve it once to its real path.
    this.graphRoot = resolveWarpGraphRoot(options.graphRoot);
    this.openSidecar = options.openSidecar ?? openWarpSidecar;
    this.maxResidents = options.maxResidents ?? DEFAULT_MAX_WARP_RESIDENTS;
    validateCapacity(this.maxResidents);
    this.maxIdleResidents = options.maxIdleResidents ?? this.maxResidents;
    if (!Number.isInteger(this.maxIdleResidents) || this.maxIdleResidents < 0 || this.maxIdleResidents > this.maxResidents) {
      throw new RangeError("maxIdleResidents must be an integer between zero and maxResidents");
    }
  }

  locationFor(
    workspace: WarpPoolWorkspace,
    writerId: string = DEFAULT_WARP_WRITER_ID,
  ): WarpSidecarLocation {
    return resolveWarpSidecarLocation(this.graphRoot, { ...workspace, writerId });
  }

  async acquire(input: WarpResidentAcquireInput): Promise<WarpResidentLease> {
    const location = this.locationFor(input.workspace, input.writerId);
    const id = this.id(input.workspace.repoId, input.workspace.worktreeId, input.writerId);
    let resident = this.residents.get(id);
    if (resident?.pins.size === 0 && resident.sidecarRepo !== location.repoPath) {
      this.residents.delete(id);
      resident = undefined;
    }
    if (resident === undefined) {
      if (this.residents.size >= this.maxResidents && !this.evictOldestIdle()) {
        throw new WarpResidentCapacityError(this.maxResidents);
      }
      const key = Object.freeze({
        repoId: input.workspace.repoId,
        worktreeId: input.workspace.worktreeId,
        writerId: input.writerId,
      });
      const openOptions: WarpSidecarOpenOptions = {
        graphRoot: location.graphRoot,
        sidecarRepo: location.repoPath,
        writerId: key.writerId,
      };
      // Reserve before calling even a synchronously throwing/reentrant opener.
      const opening = Promise.resolve().then(() => this.openSidecar(openOptions));
      resident = { key, sidecarRepo: location.repoPath, pins: new Map(), opening };
      this.residents.set(id, resident);
    }
    const token = Symbol(input.ownerId);
    resident.pins.set(token, input.ownerId);
    this.touch(id, resident);

    let app: WarpApp | null;
    try {
      app = await resident.opening;
    } catch (error) {
      resident.pins.delete(token);
      if (this.residents.get(id) === resident) this.residents.delete(id);
      throw error;
    }
    let owned: Resident | null = resident;
    const key = resident.key;
    return {
      key,
      get app(): WarpApp {
        if (app === null) throw new Error("WARP resident lease has been released");
        return app;
      },
      release: (): Promise<void> => {
        const current = owned;
        if (current === null) return Promise.resolve();
        owned = null;
        app = null;
        current.pins.delete(token);
        if (current.pins.size === 0 && this.residents.get(id) === current) {
          this.touch(id, current);
          this.trimIdle();
        }
        return Promise.resolve();
      },
    };
  }

  private id(repoId: string, worktreeId: string, writerId: string): string {
    return JSON.stringify([repoId, worktreeId, writerId]);
  }

  private touch(id: string, resident: Resident): void {
    this.residents.delete(id);
    this.residents.set(id, resident);
  }

  private evictOldestIdle(): boolean {
    for (const [id, resident] of this.residents) {
      if (resident.pins.size === 0) {
        this.residents.delete(id);
        return true;
      }
    }
    return false;
  }

  private trimIdle(): void {
    let idle = 0;
    for (const resident of this.residents.values()) if (resident.pins.size === 0) idle++;
    while (idle > this.maxIdleResidents && this.evictOldestIdle()) idle--;
  }

  /** Live leases on one repo writer lane, summed across that repo's worktree sidecars. */
  leaseCount(repoId: string, writerId: string): number {
    let count = 0;
    for (const resident of this.residents.values()) {
      if (resident.key.repoId === repoId && resident.key.writerId === writerId) count += resident.pins.size;
    }
    return count;
  }

  /** Whether any worktree sidecar of the repo (optionally one writer lane) is resident. */
  has(repoId: string, writerId?: string): boolean {
    for (const resident of this.residents.values()) {
      if (resident.key.repoId === repoId && (writerId === undefined || resident.key.writerId === writerId)) return true;
    }
    return false;
  }

  size(): number {
    return new Set([...this.residents.values()].map((resident) => resident.key.repoId)).size;
  }

  /** Includes opening reservations as well as pinned and idle loaded handles. */
  residentCount(): number {
    return this.residents.size;
  }
}

/** Narrows a richer workspace record to the identity that addresses its sidecar. */
export function warpPoolWorkspace(source: WarpPoolWorkspace): WarpPoolWorkspace {
  return {
    repoId: source.repoId,
    worktreeId: source.worktreeId,
    worktreeRoot: source.worktreeRoot,
    gitCommonDir: source.gitCommonDir,
  };
}
