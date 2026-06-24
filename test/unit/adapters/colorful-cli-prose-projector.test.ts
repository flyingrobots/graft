import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  COLORFUL_CLI_MINIMUM_VERSION,
  createColorfulCliProseProjector,
} from "../../../src/adapters/colorful-cli-prose-projector.js";
import { COLORFUL_VOCABULARY_HASH } from "../../../src/operations/colorful-prose-projection.js";
import type { ProcessRunRequest, ProcessRunResult, ProcessRunner } from "../../../src/ports/process-runner.js";

class FakeColorfulRunner implements ProcessRunner {
  readonly requests: ProcessRunRequest[] = [];

  constructor(private readonly versionOutput: string) {}

  run(request: ProcessRunRequest): ProcessRunResult {
    this.requests.push(request);
    if (request.args[0] === "--version") {
      return {
        status: 0,
        stdout: this.versionOutput,
        stderr: "",
      };
    }

    const source = Buffer.from(request.stdin ?? "", "utf8");
    const contentHash = `sha256:${createHash("sha256").update(source).digest("hex")}`;
    return {
      status: 0,
      stdout: JSON.stringify({
        contractVersion: "colorful.syntax/v1",
        schemaHash: "sha256:test-schema",
        vocabularyHash: COLORFUL_VOCABULARY_HASH,
        source: {
          unitId: "notes.txt",
          contentHash,
          utf8ByteLength: source.byteLength,
        },
        tokens: [
          {
            occurrenceId: "tok_ship",
            byteRange: { startUtf8: 0, endUtf8: 4 },
            tokenKind: "WORD",
            lexicalClass: "FUNCTION",
            functionKind: null,
          },
        ],
        structure: [
          {
            nodeId: "paragraph_1",
            kind: "PARAGRAPH",
            byteRange: { startUtf8: 0, endUtf8: source.byteLength },
            depth: 0,
            childNodeIds: [],
          },
        ],
      }),
      stderr: "",
    };
  }
}

describe("Colorful CLI prose projector", () => {
  it("requires the configured minimum Colorful CLI version before projecting", () => {
    const runner = new FakeColorfulRunner(`colorful ${COLORFUL_CLI_MINIMUM_VERSION}\n`);
    const projector = createColorfulCliProseProjector({
      processRunner: runner,
      cwd: "/workspace",
    });

    const projection = projector.project({
      path: "notes.txt",
      content: "ship it\n",
    });

    expect(projection?.outline).toContainEqual(expect.objectContaining({ kind: "paragraph" }));
    expect(runner.requests.map((request) => request.args)).toEqual([
      ["--version"],
      ["ir", "-"],
    ]);
  });

  it("rejects older Colorful CLI versions without invoking IR generation", () => {
    const runner = new FakeColorfulRunner("colorful 0.2.0\n");
    const projector = createColorfulCliProseProjector({
      processRunner: runner,
      cwd: "/workspace",
    });

    const projection = projector.project({
      path: "notes.txt",
      content: "ship it\n",
    });

    expect(projection).toBeNull();
    expect(runner.requests.map((request) => request.args)).toEqual([
      ["--version"],
    ]);
  });
});
