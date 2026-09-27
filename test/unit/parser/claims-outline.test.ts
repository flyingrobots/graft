/**
 * Claims source files (docs/design/CORE_claims-source-files.md).
 *
 * Promise: a JSON document shaped like a contextual-claims result is outlined
 * as one: the artifact, each candidate, and every term node by canonical path,
 * with jump entries covering each node's object. Recognition is by content.
 * The outline is administrative: no signature carries a support, assertion or
 * truth judgment.
 * Oracle: the design packet's acceptance criteria; line ranges are checked
 * against the document text itself; holder field names against
 * @flyingrobots/contextual-claims' HOLDER_FIELDS.
 * RED: observed before the claims extractor existed (the document outlined as
 * plain JSON).
 */
import { describe, expect, it } from "vitest";
import { extractOutline } from "../../../src/parser/outline.js";
import type { OutlineEntry } from "../../../src/parser/types.js";

const HASH = "sha256:" + "0".repeat(64);

const doc = {
  artifact: { artifactId: "A7", contentHash: HASH },
  derivation: { extractorId: "fixture", extractorVersion: "1.0.0", schemaVersion: "v1", extractedAt: "2026-01-01T00:00:00Z" },
  candidates: [
    {
      term: {
        kind: "scope",
        frame: { kind: "observation", author: { kind: "named", sourceName: "Omar" } },
        body: {
          kind: "group",
          items: [
            {
              kind: "scope",
              frame: { kind: "speech", speaker: { kind: "named", sourceName: "Rosa" } },
              body: { kind: "atom", claim: { subject: { kind: "anonymous", localId: "venue" }, predicate: "is_booked_for", object: "Friday" } },
            },
            { kind: "negation", body: { kind: "atom", claim: { subject: { kind: "anonymous", localId: "room" }, predicate: "has_projector", object: true } } },
          ],
        },
      },
      annotations: {},
      assessment: { confidence: "high", rationale: "fixture" },
    },
  ],
};
const text = JSON.stringify(doc, null, 2);
const lines = text.split("\n");

function flatten(entries: readonly OutlineEntry[]): OutlineEntry[] {
  return entries.flatMap((e) => [e, ...flatten(e.children ?? [])]);
}

// Parsing happens inside each test: the parser runtime is readied in a
// beforeAll (test/setup-parser.ts), which runs after collection.
function read() {
  const outline = extractOutline(text, "json");
  const all = flatten(outline.entries);
  return { outline, all, names: all.map((e) => e.name) };
}

describe("claims source files", () => {

  it("names the artifact, the candidate and every term node by canonical path", () => {
    const { outline, names } = read();
    expect(outline.entries.map((e) => e.name)).toEqual(["A7"]);
    expect(names).toContain("candidate[0]");
    for (const p of ["$", "$.body", "$.body.items[0]", "$.body.items[0].body", "$.body.items[1]", "$.body.items[1].body"]) {
      expect(names, p).toContain(p);
    }
  });

  it("puts the constructor, the frame and its source-relative holder, or the predicate, in the signature", () => {
    const { all } = read();
    const sig = (name: string) => all.find((e) => e.name === name)?.signature ?? "";
    expect(sig("$")).toContain("scope");
    expect(sig("$")).toContain("observation(Omar)");
    expect(sig("$.body.items[0]")).toContain("speech(Rosa)");
    expect(sig("$.body.items[0].body")).toContain("atom");
    expect(sig("$.body.items[0].body")).toContain("is_booked_for");
    expect(sig("$.body.items[1]")).toContain("negation");
  });

  it("gives every term node a jump entry whose lines cover that node's object", () => {
    const { outline } = read();
    const jumps = new Map((outline.jumpTable ?? []).map((j) => [j.symbol, j]));
    for (const [p, needle] of [
      ["$.body.items[0].body", '"predicate": "is_booked_for"'],
      ["$.body.items[1].body", '"predicate": "has_projector"'],
      ["$.body.items[0]", '"sourceName": "Rosa"'],
    ] as const) {
      const j = jumps.get(p);
      expect(j, p).toBeDefined();
      const covered = lines.slice((j?.start ?? 1) - 1, j?.end ?? 0).join("\n");
      expect(covered, p).toContain(needle);
    }
  });

  it("carries no support, assertion or truth judgment in any signature", () => {
    const { all } = read();
    for (const e of all) {
      expect(e.signature ?? "", e.name).not.toMatch(/\b(supported|supports|asserted|reported|true|false|refuted|verified)\b/i);
    }
  });

  it("recognises by content: plain JSON with other keys outlines as plain JSON", () => {
    const plain = extractOutline(JSON.stringify({ name: "x", candidates: [1, 2] }, null, 2), "json");
    expect(plain.entries.map((e) => e.name)).toEqual(["name", "candidates"]);
  });

  it("outlines a malformed claims document as partial instead of throwing", () => {
    const broken = JSON.parse(text) as { candidates: { term: Record<string, unknown> }[] };
    const first = broken.candidates[0];
    if (!first) throw new Error("fixture has a candidate");
    delete first.term["kind"];
    const out = extractOutline(JSON.stringify(broken, null, 2), "json");
    expect(out.entries.map((e) => e.name)).toEqual(["A7"]);
    expect(out.partial).toBe(true);
  });
});
