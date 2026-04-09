import * as crypto from "node:crypto";

export interface RuntimeCausalContext {
  readonly transportSessionId: string;
  readonly workspaceSliceId: string;
  readonly causalSessionId: string;
  readonly strandId: string;
  readonly checkoutEpochId: string;
  readonly warpWriterId: string;
  readonly stability: "runtime_local";
  readonly provenanceLevel: "artifact_history";
}

function stableId(prefix: string, input: string): string {
  return `${prefix}:${crypto.createHash("sha256").update(input).digest("hex").slice(0, 16)}`;
}

export function buildCheckoutEpochId(
  repoId: string,
  worktreeId: string,
  checkoutEpoch: number,
): string {
  return stableId("epoch", `${repoId}:${worktreeId}:${String(checkoutEpoch)}`);
}

export function buildCausalSessionId(
  repoId: string,
  worktreeId: string,
  workspaceSliceId: string,
): string {
  return stableId("causal", `${repoId}:${worktreeId}:${workspaceSliceId}`);
}

export function buildStrandId(
  causalSessionId: string,
  checkoutEpochId: string,
  warpWriterId: string,
): string {
  return stableId("strand", `${causalSessionId}:${checkoutEpochId}:${warpWriterId}`);
}

export function buildRuntimeCausalContext(input: {
  readonly transportSessionId: string;
  readonly workspaceSliceId: string;
  readonly repoId: string;
  readonly worktreeId: string;
  readonly checkoutEpoch: number;
  readonly warpWriterId: string;
}): RuntimeCausalContext {
  const checkoutEpochId = buildCheckoutEpochId(
    input.repoId,
    input.worktreeId,
    input.checkoutEpoch,
  );
  const causalSessionId = buildCausalSessionId(
    input.repoId,
    input.worktreeId,
    input.workspaceSliceId,
  );
  return {
    transportSessionId: input.transportSessionId,
    workspaceSliceId: input.workspaceSliceId,
    causalSessionId,
    strandId: buildStrandId(causalSessionId, checkoutEpochId, input.warpWriterId),
    checkoutEpochId,
    warpWriterId: input.warpWriterId,
    stability: "runtime_local",
    provenanceLevel: "artifact_history",
  };
}
