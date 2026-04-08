import type { McpToolName } from "../contracts/output-schemas.js";

export const BURDEN_KINDS = ["read", "search", "shell", "state", "diagnostic"] as const;

export type BurdenKind = typeof BURDEN_KINDS[number];

export interface BurdenBucket {
  readonly calls: number;
  readonly bytesReturned: number;
}

export type BurdenByKind = Record<BurdenKind, BurdenBucket>;

const ZERO_BUCKET: BurdenBucket = Object.freeze({ calls: 0, bytesReturned: 0 });

const TOOL_BURDEN_KIND: Record<McpToolName, BurdenKind> = {
  safe_read: "read",
  file_outline: "read",
  read_range: "read",
  changed_since: "read",
  graft_diff: "search",
  graft_since: "search",
  graft_map: "search",
  code_show: "search",
  code_find: "search",
  code_refs: "search",
  daemon_status: "diagnostic",
  daemon_sessions: "diagnostic",
  workspace_authorize: "diagnostic",
  workspace_authorizations: "diagnostic",
  workspace_revoke: "diagnostic",
  workspace_bind: "diagnostic",
  workspace_status: "diagnostic",
  workspace_rebind: "diagnostic",
  run_capture: "shell",
  state_save: "state",
  state_load: "state",
  set_budget: "diagnostic",
  explain: "diagnostic",
  doctor: "diagnostic",
  stats: "diagnostic",
};

export function emptyBurdenByKind(): BurdenByKind {
  return {
    read: ZERO_BUCKET,
    search: ZERO_BUCKET,
    shell: ZERO_BUCKET,
    state: ZERO_BUCKET,
    diagnostic: ZERO_BUCKET,
  };
}

export function cloneBurdenByKind(source: Readonly<BurdenByKind>): BurdenByKind {
  return {
    read: { ...source.read },
    search: { ...source.search },
    shell: { ...source.shell },
    state: { ...source.state },
    diagnostic: { ...source.diagnostic },
  };
}

export function freezeBurdenByKind(source: BurdenByKind): Readonly<BurdenByKind> {
  for (const kind of BURDEN_KINDS) {
    Object.freeze(source[kind]);
  }
  return Object.freeze(source);
}

export function burdenKindForTool(tool: McpToolName): BurdenKind {
  return TOOL_BURDEN_KIND[tool];
}

export function isNonReadBurdenKind(kind: BurdenKind): boolean {
  return kind !== "read";
}

export function projectBurdenByKind(
  source: Readonly<BurdenByKind>,
  tool: McpToolName,
  returnedBytes: number,
): Readonly<BurdenByKind> {
  const next = cloneBurdenByKind(source);
  const kind = burdenKindForTool(tool);
  const current = next[kind];
  next[kind] = {
    calls: current.calls + 1,
    bytesReturned: current.bytesReturned + returnedBytes,
  };
  return freezeBurdenByKind(next);
}

export function totalNonReadBytesReturned(source: Readonly<BurdenByKind>): number {
  return BURDEN_KINDS
    .filter((kind) => isNonReadBurdenKind(kind))
    .reduce((sum, kind) => sum + source[kind].bytesReturned, 0);
}

export function topBurdenKind(
  source: Readonly<BurdenByKind>,
): { kind: BurdenKind; calls: number; bytesReturned: number } | null {
  let best: { kind: BurdenKind; calls: number; bytesReturned: number } | null = null;

  for (const kind of BURDEN_KINDS) {
    const bucket = source[kind];
    if (bucket.bytesReturned === 0) continue;
    if (best === null || bucket.bytesReturned > best.bytesReturned) {
      best = { kind, calls: bucket.calls, bytesReturned: bucket.bytesReturned };
    }
  }

  return best;
}
