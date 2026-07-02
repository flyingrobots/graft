import { describe, expect, it } from "vitest";
import {
  EdictProjectionError,
  projectEdictJsonlRecords,
  type EdictProjectionRequest,
} from "../../../src/operations/edict-projection.js";

const DIGEST_1 = "sha256:1111111111111111111111111111111111111111111111111111111111111111";
const DIGEST_2 = "sha256:2222222222222222222222222222222222222222222222222222222222222222";
const DIGEST_3 = "sha256:3333333333333333333333333333333333333333333333333333333333333333";

const basis = { kind: "editor_head" as const, headId: "head-edict", tick: 4 };

function byteSpan(source: string, needle: string): { start: number; end: number } {
  const index = source.indexOf(needle);
  if (index < 0) {
    throw new Error(`missing fixture needle ${needle}`);
  }
  const start = Buffer.byteLength(source.slice(0, index), "utf8");
  return { start, end: start + Buffer.byteLength(needle, "utf8") };
}

function request(source: string): EdictProjectionRequest {
  return {
    name: "unsaved/demo.edict",
    content: source,
    basis,
    emit: ["syntax", "diagnostics", "core", "targetIr"],
  };
}

describe("Edict projection decoding", () => {
  it("maps Edict JSONL projection records into Graft slots with UTF-8 ranges", () => {
    const source = [
      "package demo.echo@1;",
      "",
      "// é shifts byte offsets",
      "intent replaceThing(input: Input) returns Output {",
      "  return { id: input.id };",
      "}",
      "",
    ].join("\n");

    const bundle = projectEdictJsonlRecords(request(source), [
      {
        schema: "edict.projection.syntax/v1",
        type: "syntax",
        command: "project",
        input: { name: "unsaved/demo.edict" },
        spans: [
          {
            role: "keyword",
            span: byteSpan(source, "intent"),
            lexeme: "intent",
          },
          {
            role: "typeIdentifier",
            span: byteSpan(source, "Input"),
            lexeme: "Input",
          },
        ],
      },
      {
        schema: "edict.projection.diagnostics/v1",
        type: "diagnostics",
        command: "project",
        input: { name: "unsaved/demo.edict" },
        diagnostics: [
          {
            stage: "parse",
            kind: "ExpectedToken",
            severity: "error",
            span: byteSpan(source, "returns"),
            message: "expected token",
          },
        ],
      },
      {
        schema: "edict.projection.core/v1",
        type: "core",
        command: "project",
        input: { name: "unsaved/demo.edict" },
        state: "available",
        digest: DIGEST_1,
        review: { apiVersion: "edict.core/v1" },
      },
      {
        schema: "edict.projection.target-ir/v1",
        type: "targetIr",
        command: "project",
        input: { name: "unsaved/demo.edict" },
        state: "available",
        domain: "echo.span-ir/v1",
        target: {
          coordinate: "echo.dpo@1",
          digest: DIGEST_2,
        },
        digest: DIGEST_3,
        review: { intents: { replaceThing: {} } },
      },
      {
        schema: "edict.cli.event/v1",
        type: "status",
        command: "project",
        status: "ok",
        checked: 1,
        errors: 1,
        exitCode: 0,
      },
    ]);

    expect(bundle).toEqual(expect.objectContaining({
      language: "edict",
      name: "unsaved/demo.edict",
      basis,
    }));
    expect(bundle.syntax).toEqual({
      state: "available",
      value: {
        spans: [
          {
            className: "keyword",
            range: { start: { row: 3, column: 0 }, end: { row: 3, column: 6 } },
            text: "intent",
          },
          {
            className: "type",
            range: { start: { row: 3, column: 27 }, end: { row: 3, column: 32 } },
            text: "Input",
          },
        ],
      },
    });
    expect(bundle.diagnostics.items).toEqual([
      {
        stage: "parse",
        kind: "ExpectedToken",
        severity: "error",
        message: "expected token",
        range: { start: { row: 3, column: 34 }, end: { row: 3, column: 41 } },
      },
    ]);
    expect(bundle.core).toEqual({
      state: "available",
      value: {
        digest: DIGEST_1,
        review: { apiVersion: "edict.core/v1" },
      },
    });
    expect(bundle.targetIr).toEqual({
      state: "available",
      value: {
        domain: "echo.span-ir/v1",
        target: {
          coordinate: "echo.dpo@1",
          digest: DIGEST_2,
        },
        digest: DIGEST_3,
        review: { intents: { replaceThing: {} } },
      },
    });
  });

  it("keeps blocked and failed projection slots explicit", () => {
    const source = "package demo.broken@1\n";
    const bundle = projectEdictJsonlRecords(
      {
        ...request(source),
        emit: ["diagnostics", "core", "targetIr"],
      },
      [
        {
          schema: "edict.projection.diagnostics/v1",
          type: "diagnostics",
          command: "project",
          input: { name: "unsaved/demo.edict" },
          diagnostics: [
            {
              stage: "parse",
              kind: "ExpectedToken",
              severity: "error",
              span: { start: 0, end: 7 },
            },
          ],
        },
        {
          schema: "edict.projection.core/v1",
          type: "core",
          command: "project",
          input: { name: "unsaved/demo.edict" },
          state: "failed",
          error: { kind: "semantic_error", message: "Core projection failed" },
        },
        {
          schema: "edict.projection.target-ir/v1",
          type: "targetIr",
          command: "project",
          input: { name: "unsaved/demo.edict" },
          state: "failed",
          error: { kind: "unsupported_target", message: "target unsupported" },
        },
        {
          schema: "edict.cli.event/v1",
          type: "status",
          command: "project",
          status: "ok",
          checked: 1,
          errors: 1,
          exitCode: 0,
        },
      ],
    );

    expect(bundle.syntax).toEqual({ state: "not_requested" });
    expect(bundle.core).toEqual({
      state: "failed",
      error: { kind: "semantic_error", message: "Core projection failed" },
    });
    expect(bundle.targetIr).toEqual({
      state: "failed",
      error: { kind: "unsupported_target", message: "target unsupported" },
    });
  });

  it("rejects projection records for a different input name", () => {
    const source = "package demo.echo@1;\n";

    expect(() => projectEdictJsonlRecords(request(source), [
      {
        schema: "edict.projection.syntax/v1",
        type: "syntax",
        command: "project",
        input: { name: "other/demo.edict" },
        spans: [],
      },
      {
        schema: "edict.cli.event/v1",
        type: "status",
        command: "project",
        status: "ok",
        checked: 1,
        errors: 0,
        exitCode: 0,
      },
    ])).toThrow(EdictProjectionError);
  });

  it("marks requested projection slots as failed when Edict omits their records", () => {
    const source = "package demo.echo@1;\n";
    const bundle = projectEdictJsonlRecords(
      {
        ...request(source),
        emit: ["syntax", "core", "targetIr", "digests"],
      },
      [
        {
          schema: "edict.cli.event/v1",
          type: "status",
          command: "project",
          status: "ok",
          checked: 1,
          errors: 0,
          exitCode: 0,
        },
      ],
    );

    expect(bundle.syntax).toEqual({
      state: "failed",
      error: expect.objectContaining({ kind: "missing_projection_record" }),
    });
    expect(bundle.core).toEqual({
      state: "failed",
      error: expect.objectContaining({ kind: "missing_projection_record" }),
    });
    expect(bundle.targetIr).toEqual({
      state: "failed",
      error: expect.objectContaining({ kind: "missing_projection_record" }),
    });
  });

  it("fails closed when Edict omits a requested diagnostics record", () => {
    const source = "package demo.echo@1;\n";
    const bundle = projectEdictJsonlRecords(
      {
        ...request(source),
        emit: ["diagnostics"],
      },
      [
        {
          schema: "edict.cli.event/v1",
          type: "status",
          command: "project",
          status: "ok",
          checked: 1,
          errors: 0,
          exitCode: 0,
        },
      ],
    );

    expect(bundle.diagnostics.items).toEqual([
      {
        stage: "projection",
        kind: "missing_projection_record",
        severity: "error",
        message: "Edict did not emit a requested diagnostics projection record",
        range: { start: { row: 0, column: 0 }, end: { row: 0, column: 0 } },
      },
    ]);
  });

  it("rejects negative status counters", () => {
    const source = "package demo.echo@1;\n";

    expect(() => projectEdictJsonlRecords(
      {
        ...request(source),
        emit: [],
      },
      [
        {
          schema: "edict.cli.event/v1",
          type: "status",
          command: "project",
          status: "ok",
          checked: -1,
          errors: 0,
          exitCode: 0,
        },
      ],
    )).toThrow(EdictProjectionError);
  });

  it("rejects Edict JSONL records with the wrong command envelope", () => {
    const source = "package demo.echo@1;\n";

    expect(() => projectEdictJsonlRecords(request(source), [
      {
        schema: "edict.cli.event/v1",
        type: "status",
        command: "check",
        status: "ok",
        checked: 1,
        errors: 0,
        exitCode: 0,
      },
    ])).toThrow(EdictProjectionError);
  });
});
