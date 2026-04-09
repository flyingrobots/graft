import * as crypto from "node:crypto";

export const DEFAULT_WARP_WRITER_ID = "graft";

function sanitizeSegment(input: string): string {
  const normalized = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized.length > 0 ? normalized : "lane";
}

export function buildWarpWriterId(kind: string, scope?: string): string {
  const lane = sanitizeSegment(kind);
  if (scope === undefined || scope.trim().length === 0) {
    return `graft_${lane}`;
  }

  const digest = crypto.createHash("sha256").update(scope).digest("hex").slice(0, 12);
  return `graft_${lane}_${digest}`;
}
