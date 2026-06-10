import { describe, expect, it } from "vitest";
import { createFakeEchoKernelTransport } from "../../../src/adapters/fake-echo-kernel-transport.js";
import { createEchoStructuralHistoryClient } from "../../../src/echo/structural-history-client.js";

const IMPORT_BATCH = {
  importBatchId: "batch-0001",
  repositoryId: "repo-graft",
  sourceRef: "refs/heads/main",
  importedBasisId: "basis-0001",
  parity: "NOT_CHECKED",
  importedReadingCount: 0,
  summary: "fixture import batch batch-0001",
} as const;

function newClient(
  options?: Parameters<typeof createFakeEchoKernelTransport>[0],
) {
  return createEchoStructuralHistoryClient(
    createFakeEchoKernelTransport(options),
  );
}

describe("echo intent flow", () => {
  it("derives a stable submission identity from identical intent bytes", async () => {
    const first = await newClient().recordGitWarpImportBatch({ input: IMPORT_BATCH });
    const second = await newClient().recordGitWarpImportBatch({ input: IMPORT_BATCH });
    expect(first.submissionId).toBe(second.submissionId);
    expect(first.submissionId.length).toBeGreaterThan(0);
  });

  it("returns an applied outcome carrying receipt evidence", async () => {
    const client = newClient();
    const submitted = await client.recordGitWarpImportBatch({ input: IMPORT_BATCH });
    const outcome = await client.observeIntentOutcome(submitted.submissionId);
    expect(outcome.kind).toBe("applied");
    if (outcome.kind === "applied") {
      expect(outcome.receipt.submissionId).toBe(submitted.submissionId);
      expect(outcome.receipt.operationName).toBe("recordGitWarpImportBatch");
    }
  });

  it("returns a typed rejection with receipt, not a throw", async () => {
    const client = newClient({
      fixture: { rejectImportBatchIds: [IMPORT_BATCH.importBatchId] },
    });
    const submitted = await client.recordGitWarpImportBatch({ input: IMPORT_BATCH });
    const outcome = await client.observeIntentOutcome(submitted.submissionId);
    expect(outcome.kind).toBe("rejected");
    if (outcome.kind === "rejected") {
      expect(outcome.reason.length).toBeGreaterThan(0);
      expect(outcome.receipt.submissionId).toBe(submitted.submissionId);
    }
  });

  it("returns a typed unknown outcome for an unknown submission id", async () => {
    const outcome = await newClient().observeIntentOutcome("no-such-submission");
    expect(outcome.kind).toBe("unknown");
  });
});

describe("retained evidence posture", () => {
  it.each(["retained", "missing", "obstructed"] as const)(
    "surfaces %s posture without a durability claim",
    async (posture) => {
      const client = newClient({ fixture: { retainedEvidencePosture: posture } });
      const result = await client.inspectRetainedEvidence({
        basisId: "basis-1",
      });
      expect(result.posture).toBe(posture);
      expect("durable" in result).toBe(false);
    },
  );
});
