import { describe, expect, it } from "vitest";
import type { EchoKernelTransport } from "../../../src/ports/echo-kernel-transport.js";
import { createFakeEchoKernelTransport } from "../../../src/adapters/fake-echo-kernel-transport.js";
import {
  EchoEnvelopeCodecError,
  STRUCTURAL_HISTORY_WITNESS_INTENT_OPERATION_IDS,
  decodeStructuralHistoryIntentResponse,
  encodeStructuralHistoryOkResponse,
  packStructuralHistoryIntentV1,
} from "../../../src/echo/structural-history-envelope-codec.js";
import { createEchoStructuralHistoryClient } from "../../../src/echo/structural-history-client.js";
import { createEchoStructuralReadingPort } from "../../../src/echo/structural-reading-adapter.js";
import {
  encodeRecordGitWarpImportBatchVars,
} from "../../../src/generated/graft-structural-history.codec.generated.js";

const IMPORT_BATCH_VARS = {
  input: {
    importBatchId: "batch-0001",
    repositoryId: "repo-graft",
    sourceRef: "refs/heads/main",
    importedBasisId: "basis-0001",
    parity: "NOT_CHECKED",
    importedReadingCount: 0,
    summary: "fixture import batch batch-0001",
  },
} as const;

describe("wire strictness", () => {
  it("rejects intent vars carrying trailing bytes", () => {
    const vars = encodeRecordGitWarpImportBatchVars(IMPORT_BATCH_VARS);
    const padded = new Uint8Array(vars.byteLength + 3);
    padded.set(vars, 0);
    const response = createFakeEchoKernelTransport().submitIntentBytes(
      packStructuralHistoryIntentV1(
        STRUCTURAL_HISTORY_WITNESS_INTENT_OPERATION_IDS.recordGitWarpImportBatch,
        padded,
      ),
    );
    const decoded = decodeStructuralHistoryIntentResponse(response);
    expect(decoded.ok).toBe(false);
    if (!decoded.ok) {
      // ABI v3 error 6: CODEC_ERROR
      expect(decoded.code).toBe(6);
    }
  });

  it("treats a readings-free ok response as a codec failure, not silence", async () => {
    const stubTransport: EchoKernelTransport = {
      kernelInfo: () => ({ module: "stub", codecId: "stub" }),
      submitIntentBytes: () => encodeStructuralHistoryOkResponse({}),
      observeBytes: () => encodeStructuralHistoryOkResponse({}),
    };
    const client = createEchoStructuralHistoryClient(stubTransport);
    await expect(
      client.observeStructuralReadings({ basisId: "basis-live" }),
    ).rejects.toBeInstanceOf(EchoEnvelopeCodecError);
  });

  it("returns MISSING_RETENTION for a basis the kernel does not retain", async () => {
    const port = createEchoStructuralReadingPort(
      createEchoStructuralHistoryClient(
        createFakeEchoKernelTransport({ fixture: { deadSymbols: [] } }),
      ),
      { basisId: "basis-not-retained" },
    );
    const reading = await port.findDeadSymbols({});
    expect(reading.freshness).toBe("incomparable");
    expect(reading.residualPosture).toBe("unavailable");
    expect(reading.payload.total).toBe(0);
  });

  it("disambiguates same-named symbols by file path", async () => {
    const port = createEchoStructuralReadingPort(
      createEchoStructuralHistoryClient(
        createFakeEchoKernelTransport({
          fixture: {
            symbolReferences: [
              {
                symbol: "parse",
                filePath: "src/json/parse.ts",
                referenceCount: 5,
                referencingFiles: ["a.ts"],
              },
              {
                symbol: "parse",
                filePath: "src/yaml/parse.ts",
                referenceCount: 9,
                referencingFiles: ["b.ts", "c.ts"],
              },
            ],
          },
        }),
      ),
    );
    const yaml = await port.countSymbolReferences({
      symbolName: "parse",
      filePath: "src/yaml/parse.ts",
    });
    expect(yaml.payload.referenceCount).toBe(9);
    const json = await port.countSymbolReferences({
      symbolName: "parse",
      filePath: "src/json/parse.ts",
    });
    expect(json.payload.referenceCount).toBe(5);
  });
});
