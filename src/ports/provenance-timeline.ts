// ---------------------------------------------------------------------------
// ProvenanceTimeline port — narrow boundary for patch-history reads
// ---------------------------------------------------------------------------

import type { PatchV2 } from "@git-stunts/git-warp";

export interface ProvenanceTimelinePort {
  readonly patchesFor: (entityId: string) => Promise<readonly string[]>;
  readonly loadPatchBySha: (sha: string) => Promise<PatchV2>;
}

export function assertProvenanceTimelinePort(
  impl: unknown,
): asserts impl is ProvenanceTimelinePort {
  if (impl === null || typeof impl !== "object") {
    throw new TypeError(
      `ProvenanceTimeline adapter must be an object (got ${impl === null ? "null" : typeof impl})`,
    );
  }

  const candidate = impl as Partial<Record<keyof ProvenanceTimelinePort, unknown>>;
  if (typeof candidate.patchesFor !== "function") {
    throw new TypeError(
      `ProvenanceTimeline adapter missing method: patchesFor (got ${typeof candidate.patchesFor})`,
    );
  }
  if (typeof candidate.loadPatchBySha !== "function") {
    throw new TypeError(
      `ProvenanceTimeline adapter missing method: loadPatchBySha ` +
        `(got ${typeof candidate.loadPatchBySha})`,
    );
  }
}
