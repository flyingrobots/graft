import type WarpApp from "@git-stunts/git-warp";

export interface WarpResidentKey {
  readonly repoId: string;
  readonly writerId: string;
}

export interface WarpResidentLease {
  readonly key: WarpResidentKey;
  /** Valid only until this capability is released. */
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
  residentCount(): number;
}

export const DEFAULT_MAX_WARP_RESIDENTS = 4;
const MAX_CONFIGURED_WARP_RESIDENTS = 64;

/**
 * How long an unpinned graph is kept warm. A resident is the whole
 * in-memory controller for one repository's CRDT graph, so keeping one
 * indefinitely pins everything it materialized for as long as the daemon
 * runs. Ten minutes keeps an active editing session warm without holding a
 * finished one overnight.
 */
export const DEFAULT_WARP_IDLE_TTL_MS = 600_000;

/**
 * Warm slots kept for reuse. Defaults to the full resident capacity: idle
 * entries competing by recency is the pool's deliberate LRU behavior, and
 * the idle TTL — not a tighter cap — is what bounds how long one survives.
 */
export const DEFAULT_MAX_IDLE_WARP_RESIDENTS = MAX_CONFIGURED_WARP_RESIDENTS;

export interface WarpPoolOptions {
  readonly maxResidents?: number;
  /** Zero opts into eager release; otherwise idle entries compete by recency. */
  readonly maxIdleResidents?: number;
  /** Idle age at which a resident is released. Zero disables ageing. */
  readonly idleTtlMs?: number;
  /** Injected for deterministic tests; defaults to `Date.now`. */
  readonly now?: () => number;
  /** Releases a retired graph's resources. Defaults to the app's own closer. */
  readonly close?: (app: WarpApp) => Promise<void>;
}

export function resolveWarpPoolOptions(env: Readonly<Record<string, string | undefined>>): WarpPoolOptions {
  const options: {
    maxResidents?: number;
    maxIdleResidents?: number;
    idleTtlMs?: number;
  } = {};

  const residents = env["GRAFT_WARP_MAX_RESIDENTS"];
  if (residents !== undefined) {
    const parsed = parseCount(residents);
    validateCapacity(parsed);
    options.maxResidents = parsed;
  }

  const idleTtl = env["GRAFT_WARP_IDLE_TTL_MS"];
  if (idleTtl !== undefined) {
    const parsed = parseCount(idleTtl);
    if (!Number.isInteger(parsed) || parsed < 0) {
      throw new RangeError("GRAFT_WARP_IDLE_TTL_MS must be a non-negative integer of milliseconds");
    }
    options.idleTtlMs = parsed;
  }

  const idleResidents = env["GRAFT_WARP_MAX_IDLE_RESIDENTS"];
  if (idleResidents !== undefined) {
    const parsed = parseCount(idleResidents);
    const ceiling = options.maxResidents ?? DEFAULT_MAX_WARP_RESIDENTS;
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > ceiling) {
      throw new RangeError(
        "GRAFT_WARP_MAX_IDLE_RESIDENTS must be an integer from 0 through the resident capacity",
      );
    }
    options.maxIdleResidents = parsed;
  }

  return options;
}

/** Parses a bare decimal count; anything else becomes NaN for the caller to reject. */
function parseCount(raw: string): number {
  const value = raw.trim();
  return /^\d+$/.test(value) ? Number(value) : NaN;
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
  readonly worktreeRoot: string;
  readonly pins: Map<symbol, string>;
  readonly opening: Promise<WarpApp>;
  /** When the last pin was dropped; undefined while pinned or opening. */
  idleSince: number | undefined;
}

/** Optional teardown a graph may expose; git-warp 16 exposes neither. */
interface MaybeDisposable {
  close?: () => unknown;
  dispose?: () => unknown;
}

/**
 * Releases a retired graph. Dropping the pool's reference is what makes the
 * materialized graph collectable — this only covers any handle the graph
 * holds beyond its own heap, and is a no-op when it holds none.
 */
async function disposeResident(app: WarpApp): Promise<void> {
  const disposable = app as unknown as MaybeDisposable;
  const teardown = disposable.close ?? disposable.dispose;
  if (typeof teardown === "function") {
    await teardown.call(disposable);
  }
}

/** A finite working set. Map order records actual use, never observation. */
export class InMemoryWarpPool implements WarpResidentPool {
  private readonly residents = new Map<string, Resident>();
  private readonly maxResidents: number;
  private readonly maxIdleResidents: number;
  private readonly idleTtlMs: number;
  private readonly now: () => number;
  private readonly close: (app: WarpApp) => Promise<void>;

  constructor(
    private readonly openWarp: (worktreeRoot: string, writerId: string) => Promise<WarpApp>,
    options: WarpPoolOptions = {},
  ) {
    this.maxResidents = options.maxResidents ?? DEFAULT_MAX_WARP_RESIDENTS;
    validateCapacity(this.maxResidents);
    this.maxIdleResidents = options.maxIdleResidents
      ?? Math.min(DEFAULT_MAX_IDLE_WARP_RESIDENTS, this.maxResidents);
    if (!Number.isInteger(this.maxIdleResidents) || this.maxIdleResidents < 0 || this.maxIdleResidents > this.maxResidents) {
      throw new RangeError("maxIdleResidents must be an integer between zero and maxResidents");
    }
    this.idleTtlMs = options.idleTtlMs ?? DEFAULT_WARP_IDLE_TTL_MS;
    if (!Number.isInteger(this.idleTtlMs) || this.idleTtlMs < 0) {
      throw new RangeError("idleTtlMs must be a non-negative integer of milliseconds");
    }
    this.now = options.now ?? Date.now;
    this.close = options.close ?? disposeResident;
  }

  async acquire(input: WarpResidentAcquireInput): Promise<WarpResidentLease> {
    const worktreeRoot = input.worktreeRoot;
    const id = this.id(input.key.repoId, input.key.writerId);
    let resident = this.residents.get(id);
    if (resident?.pins.size === 0 && resident.worktreeRoot !== worktreeRoot) {
      this.residents.delete(id);
      resident = undefined;
    }
    if (resident === undefined) {
      if (this.residents.size >= this.maxResidents && !this.evictOldestIdle()) {
        throw new WarpResidentCapacityError(this.maxResidents);
      }
      const key = Object.freeze({ repoId: input.key.repoId, writerId: input.key.writerId });
      // Reserve before calling even a synchronously throwing/reentrant opener.
      const opening = Promise.resolve().then(() => this.openWarp(worktreeRoot, key.writerId));
      resident = { key, worktreeRoot, pins: new Map(), opening, idleSince: undefined };
      this.residents.set(id, resident);
    }
    const token = Symbol(input.ownerId);
    resident.pins.set(token, input.ownerId);
    resident.idleSince = undefined;
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
          current.idleSince = this.now();
          this.touch(id, current);
          this.trimIdle();
        }
        return Promise.resolve();
      },
    };
  }

  private id(repoId: string, writerId: string): string {
    return JSON.stringify([repoId, writerId]);
  }

  private touch(id: string, resident: Resident): void {
    this.residents.delete(id);
    this.residents.set(id, resident);
  }

  private evictOldestIdle(): boolean {
    for (const [id, resident] of this.residents) {
      if (resident.pins.size === 0) {
        this.retire(id, resident);
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

  /**
   * Unlinks a resident and disposes its graph. Unlinking first is what makes
   * the graph collectable, so a rejected disposal never leaves it resident.
   */
  private retire(id: string, resident: Resident): void {
    this.residents.delete(id);
    void resident.opening
      .then((app) => this.close(app))
      .catch(() => {
        // Disposal is best effort: the reference is already dropped.
      });
  }

  /**
   * Releases every resident idle longer than the TTL. Capacity pressure is
   * not required — an untouched graph should not outlive the work that
   * opened it just because no one else needs the slot.
   */
  sweepIdle(): Promise<void> {
    if (this.idleTtlMs === 0) return Promise.resolve();
    const deadline = this.now() - this.idleTtlMs;
    for (const [id, resident] of [...this.residents]) {
      if (resident.pins.size === 0 && resident.idleSince !== undefined && resident.idleSince <= deadline) {
        this.retire(id, resident);
      }
    }
    return Promise.resolve();
  }

  /**
   * Runs `sweepIdle` on a timer until the returned stop function is called.
   * The timer is unrefed so it never holds the process open by itself.
   */
  startIdleSweeper(intervalMs = Math.max(this.idleTtlMs, 1_000)): () => void {
    const timer = setInterval(() => { void this.sweepIdle(); }, intervalMs);
    timer.unref();
    return () => { clearInterval(timer); };
  }

  leaseCount(repoId: string, writerId: string): number {
    return this.residents.get(this.id(repoId, writerId))?.pins.size ?? 0;
  }

  has(repoId: string, writerId?: string): boolean {
    if (writerId !== undefined) return this.residents.has(this.id(repoId, writerId));
    for (const resident of this.residents.values()) if (resident.key.repoId === repoId) return true;
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
