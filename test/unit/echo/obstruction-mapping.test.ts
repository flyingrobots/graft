import { describe, expect, it } from "vitest";
import { createFakeEchoKernelTransport } from "../../../src/adapters/fake-echo-kernel-transport.js";
import {
  EchoSubstrateObstructionError,
  createEchoStructuralHistoryClient,
} from "../../../src/echo/structural-history-client.js";
import { createEchoStructuralReadingPort } from "../../../src/echo/structural-reading-adapter.js";

function portWithObstruction(code: string) {
  return createEchoStructuralReadingPort(
    createEchoStructuralHistoryClient(
      createFakeEchoKernelTransport({
        fixture: {
          deadSymbols: [],
          queryObstruction: { code, message: `fixture obstruction ${code}` },
        },
      }),
    ),
  );
}

describe("obstruction to posture mapping", () => {
  it("maps STALE_BASIS to stale/complete", async () => {
    const reading = await portWithObstruction("STALE_BASIS").findDeadSymbols({});
    expect(reading.freshness).toBe("stale");
    expect(reading.residualPosture).toBe("complete");
  });

  it("maps BUDGET_EXCEEDED to current/budget-limited", async () => {
    const reading = await portWithObstruction("BUDGET_EXCEEDED").findDeadSymbols({});
    expect(reading.freshness).toBe("current");
    expect(reading.residualPosture).toBe("budget-limited");
  });

  it("maps UNSUPPORTED_OBSERVATION_RIGHTS to current/rights-limited", async () => {
    const reading = await portWithObstruction(
      "UNSUPPORTED_OBSERVATION_RIGHTS",
    ).findDeadSymbols({});
    expect(reading.freshness).toBe("current");
    expect(reading.residualPosture).toBe("rights-limited");
  });

  it("maps MISSING_RETENTION to incomparable/unavailable", async () => {
    const reading = await portWithObstruction("MISSING_RETENTION").findDeadSymbols({});
    expect(reading.freshness).toBe("incomparable");
    expect(reading.residualPosture).toBe("unavailable");
  });

  it("maps RESIDUAL_READING to current/partial", async () => {
    const reading = await portWithObstruction("RESIDUAL_READING").findDeadSymbols({});
    expect(reading.freshness).toBe("current");
    expect(reading.residualPosture).toBe("partial");
  });

  it("surfaces ADMISSION_OBSTRUCTION as an obstructed intent outcome", async () => {
    const client = createEchoStructuralHistoryClient(
      createFakeEchoKernelTransport({
        fixture: { admissionObstructedBatchIds: ["batch-blocked"] },
      }),
    );
    const submitted = await client.recordGitWarpImportBatch({
      input: {
        importBatchId: "batch-blocked",
        repositoryId: "repo-graft",
        sourceRef: "refs/heads/main",
        importedBasisId: "basis-0001",
        parity: "NOT_CHECKED",
        importedReadingCount: 0,
        summary: "fixture import batch batch-blocked",
      },
    });
    const outcome = await client.observeIntentOutcome(submitted.submissionId);
    expect(outcome.kind).toBe("obstructed");
    if (outcome.kind === "obstructed") {
      expect(outcome.obstruction.code).toBe("ADMISSION_OBSTRUCTION");
    }
  });

  it.each(["UNSUPPORTED_OPERATION", "UNSUPPORTED_QUERY", "RUNTIME_FAULT"])(
    "surfaces %s as a typed Graft error",
    async (code) => {
      const port = portWithObstruction(code);
      await expect(port.findDeadSymbols({})).rejects.toBeInstanceOf(
        EchoSubstrateObstructionError,
      );
      await expect(port.findDeadSymbols({})).rejects.toMatchObject({ code });
    },
  );

  it("keeps runtime faults distinguishable from lawful rejections", async () => {
    const client = createEchoStructuralHistoryClient(
      createFakeEchoKernelTransport({
        fixture: { rejectImportBatchIds: ["batch-reject"] },
      }),
    );
    const submitted = await client.recordGitWarpImportBatch({
      input: {
        importBatchId: "batch-reject",
        repositoryId: "repo-graft",
        sourceRef: "refs/heads/main",
        importedBasisId: "basis-0001",
        parity: "NOT_CHECKED",
        importedReadingCount: 0,
        summary: "fixture import batch batch-reject",
      },
    });
    const outcome = await client.observeIntentOutcome(submitted.submissionId);
    expect(outcome.kind).toBe("rejected");
  });
});
