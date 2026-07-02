import { describe, expect, it } from "vitest";
import { createEdictCliProjectionProvider } from "../../../src/adapters/edict-cli-projection-provider.js";
import { EdictProjectionError } from "../../../src/operations/edict-projection.js";
import type { ProcessRunRequest, ProcessRunResult, ProcessRunner } from "../../../src/ports/process-runner.js";

const TARGET_PROFILE_DIGEST = "sha256:1111111111111111111111111111111111111111111111111111111111111111";
const CORE_DIGEST = "sha256:2222222222222222222222222222222222222222222222222222222222222222";
const TARGET_DIGEST = "sha256:3333333333333333333333333333333333333333333333333333333333333333";

class FakeEdictRunner implements ProcessRunner {
  readonly requests: ProcessRunRequest[] = [];

  run(request: ProcessRunRequest): ProcessRunResult {
    this.requests.push(request);
    return {
      status: 0,
      stderr: "",
      stdout: [
        JSON.stringify({
          schema: "edict.projection.syntax/v1",
          type: "syntax",
          command: "project",
          input: { name: "unsaved/demo.edict" },
          spans: [
            {
              role: "keyword",
              span: { start: 0, end: 7 },
              lexeme: "package",
            },
          ],
        }),
        JSON.stringify({
          schema: "edict.projection.diagnostics/v1",
          type: "diagnostics",
          command: "project",
          input: { name: "unsaved/demo.edict" },
          diagnostics: [],
        }),
        JSON.stringify({
          schema: "edict.projection.core/v1",
          type: "core",
          command: "project",
          input: { name: "unsaved/demo.edict" },
          state: "available",
          digest: CORE_DIGEST,
          review: { apiVersion: "edict.core/v1" },
        }),
        JSON.stringify({
          schema: "edict.projection.target-ir/v1",
          type: "targetIr",
          command: "project",
          input: { name: "unsaved/demo.edict" },
          state: "available",
          domain: "echo.span-ir/v1",
          target: {
            coordinate: "echo.dpo@1",
            digest: TARGET_PROFILE_DIGEST,
          },
          digest: TARGET_DIGEST,
          review: { intents: {} },
        }),
        JSON.stringify({
          schema: "edict.cli.event/v1",
          type: "status",
          command: "project",
          status: "ok",
          checked: 1,
          errors: 0,
          exitCode: 0,
        }),
      ].join("\n") + "\n",
    };
  }
}

describe("Edict CLI projection provider", () => {
  it("runs Edict projection over stdin JSONL with dirty source text", () => {
    const runner = new FakeEdictRunner();
    const projector = createEdictCliProjectionProvider({
      processRunner: runner,
      cwd: "/workspace",
      command: "edict-test",
      compilerContext: {
        operationProfiles: [
          {
            source: "p.effectful",
            core: "continuum.profile.write/v1",
            allowedWriteClasses: ["replace"],
          },
        ],
        effectWriteClasses: [
          {
            effect: "target.replace",
            writeClass: "replace",
          },
        ],
        budgets: [
          {
            source: "p.tiny",
            budget: {
              maxSteps: 8,
              maxAllocatedBytes: 1024,
              maxOutputBytes: 256,
            },
          },
        ],
      },
      target: {
        coordinate: "echo.dpo@1",
        profileDigest: TARGET_PROFILE_DIGEST,
        irDomain: "echo.span-ir/v1",
        operationProfiles: ["continuum.profile.write/v1"],
        obstructionCoordinates: ["rejected"],
        effectLowerings: [
          {
            effect: "target.replace",
            targetIntrinsic: "echo.dpo@1.replace",
          },
        ],
      },
    });

    const bundle = projector.project({
      name: "unsaved/demo.edict",
      content: "package demo.echo@1;\n",
      basis: { kind: "editor_head", headId: "head-edict", tick: 2 },
      emit: ["syntax", "diagnostics", "core", "targetIr", "digests"],
    });

    expect(bundle.core).toEqual({
      state: "available",
      value: {
        digest: CORE_DIGEST,
        review: { apiVersion: "edict.core/v1" },
      },
    });
    expect(bundle.targetIr).toEqual({
      state: "available",
      value: {
        domain: "echo.span-ir/v1",
        target: {
          coordinate: "echo.dpo@1",
          digest: TARGET_PROFILE_DIGEST,
        },
        digest: TARGET_DIGEST,
        review: { intents: {} },
      },
    });

    expect(runner.requests).toHaveLength(1);
    const request = runner.requests[0]!;
    expect(request).toEqual(expect.objectContaining({
      command: "edict-test",
      args: [],
      cwd: "/workspace",
      stdin: expect.any(String),
    }));
    const jsonl = request.stdin!.trimEnd().split("\n").map((line) => JSON.parse(line) as Record<string, unknown>);
    expect(jsonl[0]).toEqual(expect.objectContaining({
      schema: "edict.compiler.settings/v1",
      type: "compilerSettings",
      operation: "project",
      emit: ["syntax", "diagnostics", "core", "targetIr", "digests"],
    }));
    expect(jsonl[0]).toEqual(expect.objectContaining({
      compilerContext: expect.objectContaining({
        operationProfiles: expect.arrayContaining([
          expect.objectContaining({ source: "p.effectful" }),
        ]),
      }),
      target: expect.objectContaining({
        coordinate: "echo.dpo@1",
        profileDigest: TARGET_PROFILE_DIGEST,
      }),
    }));
    expect(jsonl[1]).toEqual({
      schema: "edict.compiler.input/v1",
      type: "compilerInput",
      kind: "source",
      name: "unsaved/demo.edict",
      source: "package demo.echo@1;\n",
    });
  });

  it("fails closed when the Edict process exits unsuccessfully", () => {
    const runner: ProcessRunner = {
      run() {
        return {
          status: 2,
          stdout: "",
          stderr: JSON.stringify({
            schema: "edict.cli.diagnostic/v1",
            type: "diagnostic",
            command: "project",
            kind: "InvalidSettings",
            message: "invalid settings",
          }) + "\n",
        };
      },
    };
    const projector = createEdictCliProjectionProvider({
      processRunner: runner,
      cwd: "/workspace",
    });

    expect(() => projector.project({
      name: "bad.edict",
      content: "package bad@1;\n",
      emit: ["syntax"],
    })).toThrow(EdictProjectionError);
  });
});
