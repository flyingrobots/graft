import { describe, expect, it } from "vitest";
import { createProjectionBundle, createStructuredBuffer } from "../../src/index.js";

describe("0085 projection bundle over buffer head for jedit", () => {
  it("Can Graft derive one coherent warm projection bundle from in-memory editor content plus explicit basis identity instead of forcing Jedit to stitch together separate calls?", () => {
    const basis = { kind: "editor_head" as const, headId: "head-42", tick: 17, editGroupId: "edit-7" };
    const bundle = createProjectionBundle(
      "src/view.tsx",
      [
        "export function greet(name: string) {",
        "  return <div className=\"greeting\">{name}</div>;",
        "}",
      ].join("\n"),
      {
        basis,
        viewport: {
          start: { row: 0, column: 0 },
          end: { row: 2, column: 80 },
        },
      },
    );

    expect(bundle.basis).toEqual(basis);
    expect(bundle.parseStatus).toEqual({
      basis,
      format: "tsx",
      partial: false,
      status: "full",
      reason: undefined,
    });
    expect(bundle.syntax.basis).toEqual(basis);
    expect(bundle.diagnostics.basis).toEqual(basis);
    expect(bundle.folds.basis).toEqual(basis);
    expect(bundle.outline.basis).toEqual(basis);
  });

  it("Is the bundle still truthful for dirty unsaved buffers with parse damage by reporting explicit partial parse status?", () => {
    const basis = { kind: "editor_head" as const, headId: "head-42", tick: 18 };
    const bundle = createProjectionBundle(
      "src/broken.ts",
      "export function broken(\n  return 1;\n}\n",
      { basis },
    );

    expect(bundle.basis).toEqual(basis);
    expect(bundle.partial).toBe(true);
    expect(bundle.parseStatus).toEqual({
      basis,
      format: "ts",
      partial: true,
      status: "partial",
      reason: undefined,
    });
    expect(bundle.diagnostics.diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "parse_error" })]),
    );
  });

  it("Do unsupported-language buffers stay explicit at the bundle level instead of forcing the host to infer unsupported from several empty sub-results?", () => {
    const basis = { kind: "editor_head" as const, headId: "head-99", tick: 3 };
    const bundle = createProjectionBundle("notes.txt", "hello", { basis });

    expect(bundle).toEqual(expect.objectContaining({
      basis,
      parseStatus: expect.objectContaining({
        basis,
        status: "unsupported",
        reason: "UNSUPPORTED_LANGUAGE",
      }),
      syntax: expect.objectContaining({ reason: "UNSUPPORTED_LANGUAGE" }),
      diagnostics: expect.objectContaining({ reason: "UNSUPPORTED_LANGUAGE" }),
      folds: expect.objectContaining({ reason: "UNSUPPORTED_LANGUAGE" }),
      outline: expect.objectContaining({ reason: "UNSUPPORTED_LANGUAGE" }),
    }));
  });

  it("Can the same bundle contract be obtained from an already-created StructuredBuffer without changing the basis identity?", () => {
    const basis = { kind: "editor_head" as const, headId: "head-10", tick: 44 };
    const buffer = createStructuredBuffer("src/view.ts", "export const ready = true;\n", { basis });

    expect(buffer.projectionBundle()).toEqual(expect.objectContaining({
      basis,
      parseStatus: expect.objectContaining({
        basis,
        status: "full",
      }),
    }));

    buffer.dispose();
  });
});
