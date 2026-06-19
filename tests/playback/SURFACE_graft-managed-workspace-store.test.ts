import { readFileSync } from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";

const PACKET = readFileSync(
  path.join(process.cwd(), "docs/design/SURFACE_graft-managed-workspace-store.md"),
  "utf8",
);
const NORMALIZED_PACKET = PACKET.replace(/\s+/gu, " ");

function expectPacket(...terms: readonly string[]): void {
  for (const term of terms) {
    expect(NORMALIZED_PACKET).toContain(term.replace(/\s+/gu, " "));
  }
}

describe("SURFACE_graft-managed-workspace-store playback", () => {
  it("Can an agent use Graft naturally across two sibling repos without first installing `.graft` state into the second repo?", () => {
    expectPacket(
      "daemon-first, multi-workspace context governor",
      "Do not require target repos to contain `.graft` by default.",
      "Safe reads still use existing execution paths.",
    );
  });

  it("Is it clear which state is private Graft-managed state versus repo-local portable state?", () => {
    expectPacket(
      "Default storage lives under the configured Graft home",
      "Portable repo-local history has its own identity",
      "Repo-local compatibility history initially requires a full-worktree tracking scope.",
    );
  });

  it("Does Graft avoid pretending to be a universal sandbox while still governing the reads it brokers?", () => {
    expectPacket(
      "Do not make Graft a global filesystem permission system.",
      "Graft never expands a client session's authorized path set.",
      "hook-lockdown",
    );
  });

  it("Is it clear that daemon readability is not the same as client-session authorization?", () => {
    expectPacket(
      "Daemon operating-system readability alone is insufficient authorization.",
      "daemon OS readability",
      "host-provided grant",
    );
  });

  it("Is tracking consent something the human/host grants, not something an eager agent can auto-follow?", () => {
    expectPacket(
      "Do not let an agent auto-follow a proposed action and call that user consent.",
      "host-issued approval token reference",
      "Consent and authorization are different requirements.",
    );
  });

  it("Is it clear how session-bound tracking differs from continuous tracking under a durable grant?", () => {
    expectPacket(
      "trackingAuthorization",
      "session-bound",
      "durable-grant",
      "Grant expiration or revocation pauses maintenance automatically.",
    );
  });

  it("Is it clear that a docs-only workspace view cannot inherit source-wide caches or history answers?", () => {
    expectPacket(
      "A docs-only view cannot safely receive a repository-wide \"dead symbol\" conclusion",
      "Cache artifacts are scoped to the stable workspace view that generated them",
      "INSUFFICIENT_SCOPE",
    );
  });

  it("Is it clear that workspace views are stable visibility while grants and policy digests are transient visibility context?", () => {
    expectPacket(
      "A workspace view is stable visibility, not a transient grant.",
      "`workspaceViewId` alone confers no authority.",
      "visibilityContext",
    );
  });

  it("Do history bindings make it clear that tracking is scoped rather than singular on the workspace?", () => {
    expectPacket(
      "History belongs to a tracking scope, not to the workspace.",
      "historyBindingId",
      "trackingScopeId",
      "These fields do not appear as singular workspace metadata fields",
    );
  });

  it("Do lifecycle verbs make deletion, exclusion, pausing, repo-local mutation, and audit retention consequences explicit?", () => {
    expectPacket(
      "Ambiguous verbs are avoided.",
      "`pause`",
      "`purge-history`",
      "Residual audit receipts are separate and disclosed in the plan.",
    );
  });

  it("Is it clear that exclude preserves state and forget deletes state?", () => {
    expectPacket(
      "`exclude` does not delete workspace records",
      "Default `forget` semantics",
      "exclude preserves state",
    );
  });

  it("Does plan/commit make approval specific enough to prevent executing a materially different operation?", () => {
    expectPacket(
      "planDigest",
      "Activation revalidates all preconditions.",
      "OPERATION_PLAN_STALE",
      "Specialized mutation commands are aliases over the same commit path",
    );
  });

  it("Does workspace identity remain stable and collision-resistant when two repos share the same basename?", () => {
    expectPacket(
      "Use at least 128 bits of hash output",
      "Two same-basename repositories get different IDs",
    );
  });

  it("Does changing remote URLs leave the workspace ID unchanged?", () => {
    expectPacket(
      "Remote URLs are metadata only.",
      "Changing remotes must not change the workspace ID.",
      "sanitizedRemotes",
    );
  });

  it("Does a same-path repository replacement produce confirmed, suspect, replaced, or unknown incarnation posture without attaching old history unsafely?", () => {
    expectPacket(
      "incarnationStatus:",
      "`confirmed`",
      "`suspect`",
      "`replaced`",
      "`unknown`",
      "Never automatically attach old structural history.",
    );
  });

  it("Does a safe read in an untracked workspace create only authorized Graft-managed metadata/cache state and no target-tree mutation?", () => {
    expectPacket(
      "A safe read creates no target `.graft`, no provider history store",
      "Current-state reads do not require durable history.",
      "deterministic promotion",
    );
  });

  it("Does a history-only tool ask for tracking with an approval-required plan and create no history state?", () => {
    expectPacket(
      "WORKSPACE_TRACKING_REQUIRED",
      "approval-required plan",
      "Tracking obstruction creates no history state.",
    );
  });

  it("Can a workspace be forgotten, included, excluded, pruned, purged, or relinked with unambiguous deletion semantics?", () => {
    expectPacket(
      "`forget`",
      "`include`",
      "`exclude`",
      "`prune`",
      "`purge-history`",
      "`relink`",
    );
  });

  it("Do cache hits reapply the current authorization, ignore, ban, content governance, workspace-view, visibility-context, and capability-epoch policy?", () => {
    expectPacket(
      "Cache hits reapply current authorization",
      "capability-epoch policy",
      "visibilityContext",
      "before fresh reads and before cache hits",
    );
  });

  it("Does an unwritable managed store fall back to explicit ephemeral posture rather than lying about persistence?", () => {
    expectPacket(
      "May fall back in-process when policy permits",
      "runtime: \"in-process-fallback\"",
      "storage is memory/none",
    );
  });

  it("Do paused history answers remain readable with stale/frozen watermarks?", () => {
    expectPacket(
      "Paused history is frozen history, not nonexistent history.",
      "Historical queries are allowed with a frozen/stale watermark.",
      "temporalCompleteness",
    );
  });

  it("Do control-plane tools hide unrelated registry entries from narrow MCP sessions?", () => {
    expectPacket(
      "MCP and agent sessions see only resources intersecting their grants.",
      "registry-list",
      "registry-admin",
    );
  });

  it("Does race-safe opening authorize the object actually read rather than a stale path resolution?", () => {
    expectPacket(
      "Authorization is validated against the opened object",
      "opened through an authorized root handle",
      "Reject FIFOs, device nodes, sockets",
    );
  });

  it("Does a scoped view query history only through contained/intersecting history bindings and report complete, partial, or insufficient scope?", () => {
    expectPacket(
      "A request view may query a history binding only when",
      "scopeCompleteness:",
      "HISTORY_BINDING_AMBIGUOUS",
    );
  });

  it("Do historical rename boundaries avoid revealing hidden former/new paths or hidden counts?", () => {
    expectPacket(
      "truncate rename/copy lineage when it crosses outside the authorized scope",
      "do not reveal the hidden former/new path",
      "do not disclose hidden counts",
    );
  });

  it("Do object-only operations produce receipts without fake workspace IDs?", () => {
    expectPacket(
      "object-only-operation",
      "workspaceId: absent",
      "must not invent fake workspaces",
    );
  });

  it("Do destructive operations use plan digest, preconditions, idempotency, and startup reconciliation?", () => {
    expectPacket(
      "planDigest",
      "preconditions",
      "idempotency key",
      "startup reconciliation",
    );
  });

  it("Does repo-local WARP loading neutralize ambient Git config, hooks, alternates, helpers, and network behavior?", () => {
    expectPacket(
      "Repo-local WARP access additionally prohibits",
      "Do not honor object alternates or HTTP alternates.",
      "Never execute hooks",
      "Prohibit network fetches.",
    );
  });
});
