import { readFileSync } from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";

const ROADMAP = readFileSync(
  path.join(
    process.cwd(),
    "docs/design/SURFACE_graft-managed-workspace-store-roadmap.md",
  ),
  "utf8",
);
const PACKET = readFileSync(
  path.join(process.cwd(), "docs/design/SURFACE_graft-managed-workspace-store.md"),
  "utf8",
);
const NORMALIZED_ROADMAP = ROADMAP.replace(/\s+/gu, " ");
const NORMALIZED_PACKET = PACKET.replace(/\s+/gu, " ");

function expectRoadmap(...terms: readonly string[]): void {
  for (const term of terms) {
    expect(NORMALIZED_ROADMAP).toContain(term.replace(/\s+/gu, " "));
  }
}

describe("SURFACE_graft-managed-workspace-store roadmap playback", () => {
  it("makes the roadmap the execution control surface while keeping Slice 0 normative", () => {
    expect(NORMALIZED_PACKET).toContain(
      "This packet remains the normative Slice 0 contract.",
    );
    expect(NORMALIZED_PACKET).toContain(
      "SURFACE_graft-managed-workspace-store-roadmap.md",
    );
    expectRoadmap("The parent design packet remains the normative contract");
  });

  it("keeps the first visible milestone focused on safe multi-workspace reads", () => {
    expectRoadmap(
      "One daemon session can safely read two sibling repositories without mutating either repository.",
      "Do not start with durable history, hooks, repo-local portability, or document projection.",
      "Get that demo working before touching durable history.",
    );
  });

  it("orders the critical path from contract freeze through daemon-first rollout", () => {
    expectRoadmap(
      "G0 Contract Freeze -> G1 Secure State and Identity -> G2 Authorized Resource Router -> G3 Multi-workspace Safe Reads",
      "G4 Scoped Derived Cache -> G5 Plan/Commit Operation Kernel -> G6 Managed Structural-history Bindings",
      "G7 Truthful Historical Queries -> G8 Lifecycle and Replacement -> G12 Daemon-first Rollout",
    );
  });

  it("keeps hooks, document projection, and repo-local portability on parallel branches", () => {
    expectRoadmap(
      "G3 -> G10 Hook Governance",
      "G4 -> G11 Document Projection",
      "G5 + G6 -> G9 Repo-local Portable History Compatibility",
      "must not block the daemon-first core unless they become explicit launch promises",
    );
  });

  it("puts durable history behind the structural-history port with Echo as the target", () => {
    expectRoadmap(
      "All durable structural history is accessed through `StructuralHistoryPort`.",
      "Echo is the primary future provider after the Echo integration gate.",
      "git-warp remains import/fallback compatibility and must not shape the registry.",
    );
  });

  it("requires plan/commit before public mutation and truthful coverage before history queries", () => {
    expectRoadmap(
      "No public mutation before G5.",
      "No history query before binding selection and completeness semantics.",
      "Every mutation consumes a reviewed plan.",
    );
  });

  it("publishes release checkpoints from current-state alpha to daemon-first GA", () => {
    expectRoadmap(
      "Current-state Alpha | G0-G3 | Safe authorized reads across multiple workspaces, no target mutation.",
      "Managed History Alpha | G0-G6 | Scoped managed tracking, activation, pause, resume, and authorization expiry.",
      "Daemon-first GA | G0-G8, G10, G12 | Daemon becomes the normal supported runtime.",
    );
  });
});
