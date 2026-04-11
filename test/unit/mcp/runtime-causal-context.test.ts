import { describe, expect, it } from "vitest";
import {
  buildCausalSessionId,
  buildCheckoutEpochId,
  buildRuntimeCausalContext,
  buildStrandId,
} from "../../../src/mcp/runtime-causal-context.js";

describe("mcp: runtime causal context", () => {
  it("builds stable causal ids for the same runtime footing", () => {
    const first = buildRuntimeCausalContext({
      transportSessionId: "transport_1",
      workspaceSliceId: "slice_1",
      repoId: "repo_1",
      worktreeId: "worktree_1",
      checkoutEpoch: 2,
      warpWriterId: "graft_session_abc123",
    });

    const second = buildRuntimeCausalContext({
      transportSessionId: "transport_1",
      workspaceSliceId: "slice_1",
      repoId: "repo_1",
      worktreeId: "worktree_1",
      checkoutEpoch: 2,
      warpWriterId: "graft_session_abc123",
    });

    expect(first).toEqual(second);
    expect(first.stability).toBe("runtime_local");
    expect(first.provenanceLevel).toBe("artifact_history");
  });

  it("changes checkoutEpochId and strandId when checkout footing changes, while keeping causalSessionId stable for the same slice", () => {
    const first = buildRuntimeCausalContext({
      transportSessionId: "transport_1",
      workspaceSliceId: "slice_1",
      repoId: "repo_1",
      worktreeId: "worktree_1",
      checkoutEpoch: 1,
      warpWriterId: "graft_session_abc123",
    });
    const second = buildRuntimeCausalContext({
      transportSessionId: "transport_1",
      workspaceSliceId: "slice_1",
      repoId: "repo_1",
      worktreeId: "worktree_1",
      checkoutEpoch: 2,
      warpWriterId: "graft_session_abc123",
    });

    expect(first.causalSessionId).toBe(second.causalSessionId);
    expect(first.checkoutEpochId).not.toBe(second.checkoutEpochId);
    expect(first.strandId).not.toBe(second.strandId);
  });

  it("changes causalSessionId when the workspace slice changes", () => {
    const left = buildCausalSessionId("repo_1", "worktree_1", "transport_1", "slice_1");
    const right = buildCausalSessionId("repo_1", "worktree_1", "transport_1", "slice_2");

    expect(left).not.toBe(right);
  });

  it("changes causalSessionId when the transport session changes", () => {
    const left = buildCausalSessionId("repo_1", "worktree_1", "transport_1", "slice_1");
    const right = buildCausalSessionId("repo_1", "worktree_1", "transport_2", "slice_1");

    expect(left).not.toBe(right);
  });

  it("exposes checkout-epoch and strand builders as deterministic helpers", () => {
    const checkoutEpochId = buildCheckoutEpochId("repo_1", "worktree_1", 7);
    const causalSessionId = buildCausalSessionId("repo_1", "worktree_1", "transport_1", "slice_1");
    const strandId = buildStrandId(causalSessionId, checkoutEpochId, "graft_session_abc123");

    expect(checkoutEpochId).toMatch(/^epoch:[a-f0-9]{16}$/);
    expect(causalSessionId).toMatch(/^causal:[a-f0-9]{16}$/);
    expect(strandId).toMatch(/^strand:[a-f0-9]{16}$/);
  });
});
