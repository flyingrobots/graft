import { describe, expect, it } from "vitest";
import { createStructuredBuffer } from "../../src/index.js";

describe("0084 projection basis and head identity for jedit warm truth", () => {
  it("Can an editor integrator pass explicit head/tick identity into the supported direct buffer API and get that same basis back on warm projection results?", () => {
    const basis = { kind: "editor_head" as const, headId: "head-42", tick: 17, editGroupId: "edit-3" };
    const buffer = createStructuredBuffer("src/view.tsx", "export const ready = true;\n", { basis });

    expect(buffer.basisIdentity()).toEqual(basis);
    expect(buffer.outline().basis).toEqual(basis);
    expect(buffer.syntaxSpans().basis).toEqual(basis);
    expect(buffer.diagnostics().basis).toEqual(basis);
    expect(buffer.foldRegions().basis).toEqual(basis);

    buffer.dispose();
  });

  it("For snapshot-to-snapshot operations, is it explicit which basis is the `from` side and which is the `to` side instead of collapsing the comparison into one ambiguous identity?", () => {
    const fromBasis = { kind: "editor_head" as const, headId: "head-42", tick: 17 };
    const toBasis = { kind: "editor_head" as const, headId: "head-42", tick: 18 };
    const before = createStructuredBuffer("src/view.ts", "export const greet = (name) => name;\n", { basis: fromBasis });
    const after = createStructuredBuffer("src/view.ts", "export const welcome = (name) => name.toUpperCase();\n", { basis: toBasis });

    expect(before.diff(after)).toEqual(expect.objectContaining({ fromBasis, toBasis }));
    expect(before.semanticSummary(after)).toEqual(expect.objectContaining({ fromBasis, toBasis }));
    expect(before.mapRangeTo(after, {
      start: { row: 0, column: 13 },
      end: { row: 0, column: 18 },
    })).toEqual(expect.objectContaining({ fromBasis, toBasis }));

    before.dispose();
    after.dispose();
  });

  it("Do unsupported-language and partial-parse outcomes still stay explicit while carrying truthful basis metadata?", () => {
    const unsupportedBasis = { kind: "editor_head" as const, headId: "head-99", tick: 4 };
    const unsupported = createStructuredBuffer("notes.txt", "hello", { basis: unsupportedBasis });
    const broken = createStructuredBuffer("src/broken.ts", "export function broken(\n  return 1;\n}\n", {
      basis: { kind: "editor_head" as const, headId: "head-99", tick: 5 },
    });

    expect(unsupported.outline()).toEqual(expect.objectContaining({
      basis: unsupportedBasis,
      reason: "UNSUPPORTED_LANGUAGE",
    }));
    expect(broken.diagnostics()).toEqual(expect.objectContaining({
      basis: { kind: "editor_head", headId: "head-99", tick: 5 },
      partial: true,
    }));

    unsupported.dispose();
    broken.dispose();
  });

  it("Is the basis model transport-agnostic and small enough to support `jedit`'s head/tick posture without baking Echo internals into Graft?", () => {
    const buffer = createStructuredBuffer("src/view.ts", "export const ready = true;\n", {
      basis: { kind: "editor_head", headId: "head-1", tick: 1 },
    });
    const basis = buffer.basisIdentity();

    expect(basis).toEqual({
      kind: "editor_head",
      headId: "head-1",
      tick: 1,
    });
    expect(basis).not.toHaveProperty("rope");
    expect(basis).not.toHaveProperty("worldline");

    buffer.dispose();
  });
});
