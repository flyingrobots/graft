import * as fs from "node:fs";
import * as path from "node:path";
import { buildContinuityKey } from "../../src/mcp/persisted-local-history.js";

export function writeLegacyLocalHistoryArtifact(
  graftDir: string,
  input: Partial<{
    repoId: string;
    worktreeId: string;
    transportSessionId: string;
    workspaceSliceId: string;
    causalSessionId: string;
    strandId: string;
    checkoutEpochId: string;
    occurredAt: string;
  }> = {},
): string {
  const repoId = input.repoId ?? "repo:legacy";
  const worktreeId = input.worktreeId ?? "worktree:legacy";
  const transportSessionId = input.transportSessionId ?? "transport:legacy";
  const workspaceSliceId = input.workspaceSliceId ?? "slice:legacy";
  const causalSessionId = input.causalSessionId ?? "causal:legacy";
  const strandId = input.strandId ?? "strand:legacy";
  const checkoutEpochId = input.checkoutEpochId ?? "epoch:legacy";
  const occurredAt = input.occurredAt ?? "2026-04-13T00:00:00.000Z";
  const continuityKey = buildContinuityKey(repoId, worktreeId);
  const recordId = "history:legacy:start";

  const payload = {
    continuityKey,
    repoId,
    worktreeId,
    activeRecordId: recordId,
    records: [{
      recordId,
      continuityKey,
      operation: "start",
      repoId,
      worktreeId,
      transportSessionId,
      workspaceSliceId,
      causalSessionId,
      strandId,
      checkoutEpochId,
      workspaceOverlayId: null,
      occurredAt,
      continuedFromRecordId: null,
      continuedFromCausalSessionId: null,
      continuedFromStrandId: null,
      continuityConfidence: "high",
      continuityEvidence: [{
        evidenceId: "evidence:legacy:binding",
        evidenceKind: "mcp_transport_binding",
        source: "test.legacy_local_history",
        capturedAt: occurredAt,
        strength: "direct",
        details: {
          operation: "start",
          transportSessionId,
          workspaceSliceId,
        },
      }],
      attribution: {
        actor: {
          actorId: "unknown",
          actorKind: "unknown",
          displayName: "Unknown",
          source: "persisted_local_history.fallback",
          authorityScope: "inferred",
        },
        confidence: "unknown",
        basis: "unknown_fallback",
        evidence: [],
      },
    }],
    readEvents: [],
    stageEvents: [],
    transitionEvents: [],
  };

  const historyDir = path.join(graftDir, "local-history");
  fs.mkdirSync(historyDir, { recursive: true });
  const filePath = path.join(historyDir, `${continuityKey}.json`);
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
  return filePath;
}
