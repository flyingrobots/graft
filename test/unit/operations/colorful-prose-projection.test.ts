import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  COLORFUL_VOCABULARY_HASH,
  makeColorfulByteToPoint,
  projectColorfulIr,
} from "../../../src/operations/colorful-prose-projection.js";

function contentHash(source: Uint8Array): string {
  return `sha256:${createHash("sha256").update(source).digest("hex")}`;
}

function fixtureIr(source: Uint8Array): unknown {
  return {
    contractVersion: "colorful.syntax/v1",
    schemaHash: "sha256:test-schema",
    vocabularyHash: COLORFUL_VOCABULARY_HASH,
    source: {
      unitId: "notes.txt",
      contentHash: contentHash(source),
      utf8ByteLength: source.byteLength,
    },
    tokens: [
      {
        occurrenceId: "tok_is",
        byteRange: { startUtf8: 3, endUtf8: 5 },
        tokenKind: "WORD",
        lexicalClass: "FUNCTION",
        functionKind: null,
      },
      {
        occurrenceId: "tok_7",
        byteRange: { startUtf8: 11, endUtf8: 12 },
        tokenKind: "NUMBER",
        lexicalClass: null,
        functionKind: null,
      },
      {
        occurrenceId: "tok_period",
        byteRange: { startUtf8: 12, endUtf8: 13 },
        tokenKind: "PUNCTUATION",
        lexicalClass: null,
        functionKind: null,
      },
    ],
    structure: [
      {
        nodeId: "paragraph_1",
        kind: "PARAGRAPH",
        byteRange: { startUtf8: 0, endUtf8: 13 },
        depth: 0,
        childNodeIds: ["sentence_1", "sentence_2"],
      },
      {
        nodeId: "sentence_1",
        kind: "SENTENCE",
        byteRange: { startUtf8: 0, endUtf8: 5 },
        depth: 1,
        childNodeIds: [],
      },
      {
        nodeId: "sentence_2",
        kind: "SENTENCE",
        byteRange: { startUtf8: 6, endUtf8: 13 },
        depth: 1,
        childNodeIds: [],
      },
    ],
  };
}

describe("Colorful prose projection", () => {
  it("maps UTF-8 byte ranges to scalar-value points before building Graft spans", () => {
    const source = Buffer.from("é is\n😀 7.\n", "utf8");
    expect(source.byteLength).toBe(14);

    const byteToPoint = makeColorfulByteToPoint(source);
    expect(byteToPoint(3)).toEqual({ row: 0, column: 2 });
    expect(byteToPoint(5)).toEqual({ row: 0, column: 4 });
    expect(byteToPoint(11)).toEqual({ row: 1, column: 2 });
    expect(byteToPoint(12)).toEqual({ row: 1, column: 3 });

    const projection = projectColorfulIr({
      path: "notes.txt",
      source,
      sourceHash: contentHash(source),
      ir: fixtureIr(source),
    });

    expect(projection.format).toBe("prose");
    expect(projection.syntaxSpans).toEqual([
      {
        className: "keyword",
        range: { start: { row: 0, column: 2 }, end: { row: 0, column: 4 } },
        text: "is",
      },
      {
        className: "number",
        range: { start: { row: 1, column: 2 }, end: { row: 1, column: 3 } },
        text: "7",
      },
    ]);
    expect(projection.outline).toContainEqual(expect.objectContaining({
      kind: "paragraph",
      signature: expect.stringContaining("é is"),
    }));
    expect(projection.jumpTable).toContainEqual(expect.objectContaining({
      kind: "sentence",
      start: 2,
      end: 2,
    }));
  });

  it("fails closed when Colorful IR does not match the source or vocabulary", () => {
    const source = Buffer.from("hello\n", "utf8");

    expect(() => projectColorfulIr({
      path: "notes.txt",
      source,
      sourceHash: "sha256:not-the-source",
      ir: fixtureIr(source),
    })).toThrow(/contentHash/);

    expect(() => projectColorfulIr({
      path: "notes.txt",
      source,
      sourceHash: contentHash(source),
      ir: {
        ...(fixtureIr(source) as Record<string, unknown>),
        vocabularyHash: "sha256:not-the-vocabulary",
      },
    })).toThrow(/vocabularyHash/);
  });

  it("rejects IR ranges that split a UTF-8 character", () => {
    const source = Buffer.from("éclair\n", "utf8");
    const ir = {
      ...(fixtureIr(source) as Record<string, unknown>),
      tokens: [
        {
          occurrenceId: "tok_split",
          byteRange: { startUtf8: 1, endUtf8: 2 },
          tokenKind: "WORD",
          lexicalClass: "CONTENT",
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
    };

    expect(() => projectColorfulIr({
      path: "notes.txt",
      source,
      sourceHash: contentHash(source),
      ir,
    })).toThrow(/UTF-8 character boundaries/);
  });
});
