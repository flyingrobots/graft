import { afterEach, describe, expect, it } from "vitest";
import {
  createProjectionBundle,
  createProjectionProfileResolver,
  createProjectionProviderRegistry,
  createStructuredBuffer,
} from "../../../src/index.js";
import type { EdictProjectionProvider, WesleyProjectionProvider } from "../../../src/index.js";
import type { ProseProjectionProvider } from "../../../src/operations/colorful-prose-projection.js";
import { JumpEntry, OutlineEntry } from "../../../src/parser/types.js";

function locate(content: string, needle: string): { row: number; column: number; endColumn: number } {
  const index = content.indexOf(needle);
  if (index < 0) {
    throw new Error(`Missing needle: ${needle}`);
  }
  const before = content.slice(0, index);
  const lines = before.split("\n");
  const row = lines.length - 1;
  const column = lines[lines.length - 1]?.length ?? 0;
  return { row, column, endColumn: column + needle.length };
}

function locateByCodePoint(content: string, needle: string): { row: number; column: number; endColumn: number } {
  const index = content.indexOf(needle);
  if (index < 0) {
    throw new Error(`Missing needle: ${needle}`);
  }
  const before = content.slice(0, index);
  const lines = before.split("\n");
  const row = lines.length - 1;
  const column = Array.from(lines[lines.length - 1] ?? "").length;
  return { row, column, endColumn: column + Array.from(needle).length };
}

const activeBuffers: { dispose(): void }[] = [];
const BASE_DIGEST = "sha256:1111111111111111111111111111111111111111111111111111111111111111";
const EDICT_DIGEST = "sha256:2222222222222222222222222222222222222222222222222222222222222222";
const WESLEY_DIGEST = "sha256:3333333333333333333333333333333333333333333333333333333333333333";
const ECHO_WESLEY_DIGEST = "sha256:4444444444444444444444444444444444444444444444444444444444444444";

function track<T extends { dispose(): void }>(value: T): T {
  activeBuffers.push(value);
  return value;
}

function edictAuthorityResolver() {
  return createProjectionProfileResolver({
    profiles: [
      {
        id: "edict-base",
        language: "edict",
        provider: "edict",
        extensions: [
          { coordinate: "edict.projection/v1", digest: BASE_DIGEST },
        ],
      },
      {
        id: "edict-lawpack",
        language: "edict",
        provider: "edict",
        extensions: [
          { coordinate: "edict.projection/v1", digest: BASE_DIGEST },
          { coordinate: "edict.lawpack-descriptors/v1", digest: EDICT_DIGEST },
        ],
      },
    ],
    routes: [
      {
        profileId: "edict-lawpack",
        include: ["lawpacks/**/*.edict"],
      },
    ],
    extensionFallbacks: [
      {
        language: "edict",
        profileId: "edict-base",
        fileExtensions: [".edict"],
      },
    ],
  });
}

function wesleyAuthorityResolver() {
  return createProjectionProfileResolver({
    profiles: [
      {
        id: "wesley-base",
        language: "wesley-sdl",
        provider: "wesley",
        extensions: [
          { coordinate: "wesley.graphql-sdl/v1", digest: WESLEY_DIGEST },
        ],
      },
      {
        id: "echo-contract-sdl",
        language: "wesley-sdl",
        provider: "wesley",
        extensions: [
          { coordinate: "wesley.graphql-sdl/v1", digest: WESLEY_DIGEST },
          { coordinate: "echo.graphql-contract-descriptors/v1", digest: ECHO_WESLEY_DIGEST },
        ],
      },
    ],
    routes: [
      {
        profileId: "echo-contract-sdl",
        include: ["schemas/echo/**/*.graphql", "schemas/echo/**/*.graphqls"],
      },
      {
        profileId: "wesley-base",
        include: ["schemas/base/**/*.graphql", "schemas/base/**/*.graphqls", "schemas/*.graphql"],
      },
    ],
    extensionFallbacks: [
      {
        language: "wesley-sdl",
        profileId: "wesley-base",
        fileExtensions: [".graphql", ".graphqls"],
      },
    ],
  });
}

afterEach(() => {
  while (activeBuffers.length > 0) {
    activeBuffers.pop()?.dispose();
  }
});

describe("library: structured buffer", () => {
  const basis = { kind: "editor_head" as const, headId: "head-1", tick: 7, editGroupId: "edit-2" };

  it("projects outline, injections, folds, and syntax spans from a dirty tsx buffer", () => {
    const content = [
      "export function greet(name: string) {",
      "  // say hello",
      "  const sqlText = sql`select * from users`;",
      "  return <div className=\"greeting\">{name}</div>;",
      "}",
    ].join("\n");

    const buffer = track(createStructuredBuffer("src/view.tsx", content, { basis }));
    const outline = buffer.outline();
    expect(outline.outline).toContainEqual(expect.objectContaining({ kind: "function", name: "greet" }));
    expect(outline.partial).toBe(false);
    expect(outline.basis).toEqual(basis);
    expect(buffer.basisIdentity()).toEqual(basis);

    const injections = buffer.injections();
    expect(injections.basis).toEqual(basis);
    expect(injections.injections).toEqual(expect.arrayContaining([
      expect.objectContaining({ language: "jsx", reason: "jsx_syntax" }),
      expect.objectContaining({ language: "sql", reason: "tagged_template" }),
    ]));

    const folds = buffer.foldRegions();
    expect(folds.basis).toEqual(basis);
    expect(folds.regions).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "function_declaration" }),
      expect.objectContaining({ kind: "statement_block" }),
    ]));

    const greet = locate(content, "greet");
    const spans = buffer.syntaxSpans({
      viewport: {
        start: { row: 0, column: 0 },
        end: { row: 3, column: 80 },
      },
    });
    expect(spans.basis).toEqual(basis);
    expect(spans.spans).toEqual(expect.arrayContaining([
      expect.objectContaining({ className: "keyword", text: "export" }),
      expect.objectContaining({
        className: "function",
        range: expect.objectContaining({
          start: expect.objectContaining({ row: greet.row, column: greet.column }),
        }),
      }),
      expect.objectContaining({ className: "comment", text: "// say hello" }),
      expect.objectContaining({ className: "string", text: "\"greeting\"" }),
      expect.objectContaining({ className: "type", text: "string" }),
    ]));

    const bundle = buffer.projectionBundle({
      viewport: {
        start: { row: 0, column: 0 },
        end: { row: 3, column: 80 },
      },
    });
    expect(bundle.basis).toEqual(basis);
    expect(bundle.partial).toBe(false);
    expect(bundle.parseStatus).toEqual({
      basis,
      format: "tsx",
      partial: false,
      status: "full",
      reason: undefined,
    });
    expect(bundle.syntax).toEqual(spans);
    expect(bundle.diagnostics).toEqual(buffer.diagnostics());
    expect(bundle.folds).toEqual(folds);
    expect(bundle.outline).toEqual(outline);
  });

  it("reports parse diagnostics for broken buffers", () => {
    const content = [
      "export function broken(",
      "  return 1;",
      "}",
    ].join("\n");
    const buffer = track(createStructuredBuffer("src/broken.ts", content, { basis }));
    const diagnostics = buffer.diagnostics();
    expect(diagnostics.basis).toEqual(basis);
    expect(diagnostics.partial).toBe(true);
    expect(diagnostics.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "parse_error" }),
    ]));

    expect(buffer.projectionBundle().parseStatus).toEqual({
      basis,
      format: "ts",
      partial: true,
      status: "partial",
      reason: undefined,
    });
  });

  it("projects SVG and XML syntax spans without a tree-sitter parser", () => {
    const content = [
      "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
      "<!-- original logo -->",
      "<svg viewBox=\"0 0 512 512\" role=\"img\">",
      "  <path d=\"M256 42 470 256Z\" fill=\"#17b6ff\"/>",
      "</svg>",
    ].join("\n");

    const buffer = track(createStructuredBuffer("assets/JimLogo.SVG", content, { basis }));
    expect(buffer.format).toBe("xml");
    expect(buffer.partial).toBe(false);
    const fill = locate(content, "fill");

    const spans = buffer.syntaxSpans({
      viewport: {
        start: { row: 0, column: 0 },
        end: { row: 4, column: 0 },
      },
    });
    expect(spans.basis).toEqual(basis);
    expect(spans.reason).toBeUndefined();
    expect(spans.spans).toEqual(expect.arrayContaining([
      expect.objectContaining({ className: "type", text: "svg" }),
      expect.objectContaining({ className: "property", text: "viewBox" }),
      expect.objectContaining({ className: "string", text: "\"0 0 512 512\"" }),
      expect.objectContaining({ className: "comment", text: "<!-- original logo -->" }),
      expect.objectContaining({ className: "type", text: "path" }),
      expect.objectContaining({ className: "property", text: "fill" }),
      expect.objectContaining({
        className: "property",
        text: "fill",
        range: expect.objectContaining({
          start: expect.objectContaining({ row: fill.row, column: fill.column }),
          end: expect.objectContaining({ row: fill.row, column: fill.endColumn }),
        }),
      }),
    ]));

    const bundle = buffer.projectionBundle();
    expect(bundle.parseStatus).toEqual({
      basis,
      format: "xml",
      partial: false,
      status: "full",
      reason: undefined,
    });
    expect(bundle.outline).toEqual(expect.objectContaining({ outline: [], jumpTable: [] }));
    expect(bundle.diagnostics).toEqual(expect.objectContaining({ diagnostics: [] }));
    expect(bundle.folds).toEqual(expect.objectContaining({ regions: [] }));
    expect(bundle.syntax.spans).toEqual(expect.arrayContaining([
      expect.objectContaining({ className: "keyword", text: "xml" }),
      expect.objectContaining({ className: "punctuation", text: "/>" }),
    ]));
  });

  it("projects XML syntax spans after non-BMP text with scalar columns", () => {
    const content = "<svg><text>😀</text><path fill=\"#17b6ff\"/></svg>";
    const buffer = track(createStructuredBuffer("assets/emoji.svg", content, { basis }));
    const path = locateByCodePoint(content, "path");
    const fill = locateByCodePoint(content, "fill");

    const spans = buffer.syntaxSpans();

    expect(spans.spans).toEqual(expect.arrayContaining([
      expect.objectContaining({
        className: "type",
        text: "path",
        range: expect.objectContaining({
          start: expect.objectContaining({ row: path.row, column: path.column }),
          end: expect.objectContaining({ row: path.row, column: path.endColumn }),
        }),
      }),
      expect.objectContaining({
        className: "property",
        text: "fill",
        range: expect.objectContaining({
          start: expect.objectContaining({ row: fill.row, column: fill.column }),
          end: expect.objectContaining({ row: fill.row, column: fill.endColumn }),
        }),
      }),
    ]));
  });

  it("supports cursor lookup plus structural expand and shrink", () => {
    const content = [
      "export function greet(name: string) {",
      "  return name.toUpperCase();",
      "}",
    ].join("\n");
    const buffer = track(createStructuredBuffer("src/greet.ts", content, { basis }));
    const name = locate(content, "name");

    const lookup = buffer.nodeAt({ row: name.row, column: name.column });
    expect(lookup.basis).toEqual(basis);
    expect(lookup.node).toEqual(expect.objectContaining({ type: "identifier", text: "name" }));
    expect(lookup.parents).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "formal_parameters" }),
      expect.objectContaining({ type: "function_declaration" }),
    ]));

    const expanded = buffer.selectionExpand({ row: name.row, column: name.column });
    expect(expanded.basis).toEqual(basis);
    expect(expanded.node).toEqual(expect.objectContaining({ type: "identifier" }));

    const grown = buffer.selectionExpand(expanded.range!);
    expect(grown.basis).toEqual(basis);
    expect(grown.node).toEqual(expect.objectContaining({ type: "required_parameter" }));

    const shrunk = buffer.selectionShrink(grown.range!);
    expect(shrunk.basis).toEqual(basis);
    expect(shrunk.node).toEqual(expect.objectContaining({ type: "identifier" }));
  });

  it("finds active-symbol occurrences and prepares a rename preview", () => {
    const content = [
      "export function greet(name: string) {",
      "  return name + name.toUpperCase();",
      "}",
    ].join("\n");
    const buffer = track(createStructuredBuffer("src/greet.ts", content, { basis }));
    const name = locate(content, "name");

    const occurrences = buffer.symbolOccurrences({ position: { row: name.row, column: name.column } });
    expect(occurrences.basis).toEqual(basis);
    expect(occurrences.symbol).toBe("name");
    expect(occurrences.occurrences).toHaveLength(3);

    const preview = buffer.renamePreview({
      position: { row: name.row, column: name.column },
      nextName: "personName",
    });
    expect(preview.basis).toEqual(basis);
    expect(preview.edits).toHaveLength(3);
    expect(preview.edits[0]).toEqual(expect.objectContaining({ before: "name", after: "personName" }));
  });

  it("diffs two buffer snapshots, summarizes the edit, and maps structural anchors", () => {
    const before = [
      "export function greet(name: string) {",
      "  return name;",
      "}",
    ].join("\n");
    const after = [
      "export function welcome(name: string) {",
      "  return name.toUpperCase();",
      "}",
    ].join("\n");
    const oldBasis = { kind: "editor_head" as const, headId: "head-1", tick: 7 };
    const newBasis = { kind: "editor_head" as const, headId: "head-1", tick: 8 };
    const oldBuffer = track(createStructuredBuffer("src/greet.ts", before, { basis: oldBasis }));
    const newBuffer = track(createStructuredBuffer("src/greet.ts", after, { basis: newBasis }));

    const diff = oldBuffer.diff(newBuffer);
    expect(diff.fromBasis).toEqual(oldBasis);
    expect(diff.toBasis).toEqual(newBasis);
    expect(diff.outlineDiff.added).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "welcome", kind: "function" }),
    ]));
    expect(diff.outlineDiff.removed).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "greet", kind: "function" }),
    ]));
    expect(diff.outlineDiff.continuity).toEqual([
      expect.objectContaining({
        kind: "rename",
        confidence: "likely",
        oldName: "greet",
        newName: "welcome",
      }),
    ]);
    expect(diff.changedRegions.length).toBeGreaterThan(0);

    const summary = oldBuffer.semanticSummary(newBuffer);
    expect(summary.fromBasis).toEqual(oldBasis);
    expect(summary.toBasis).toEqual(newBasis);
    expect(summary.kind).toBe("renamed_symbol");
    expect(summary.summary).toContain("renamed function greet to welcome");

    const greet = locate(before, "greet");
    const mapped = oldBuffer.mapRangeTo(newBuffer, {
      start: { row: greet.row, column: greet.column },
      end: { row: greet.row, column: greet.endColumn },
    });
    expect(mapped.fromBasis).toEqual(oldBasis);
    expect(mapped.toBasis).toEqual(newBasis);
    expect(mapped.status).toBe("mapped");
    expect(mapped.newRange).toEqual(expect.objectContaining({
      start: expect.objectContaining({ row: 0 }),
    }));
  });

  it("detects fenced-code injections in markdown buffers", () => {
    const content = [
      "# Notes",
      "",
      "```ts",
      "export const x = 1;",
      "```",
    ].join("\n");
    const buffer = track(createStructuredBuffer("README.md", content, { basis }));
    const injections = buffer.injections();
    expect(injections.basis).toEqual(basis);
    expect(injections.injections).toEqual([
      expect.objectContaining({ language: "ts", reason: "fenced_code_block" }),
    ]);
  });

  it("honors an explicit prose projector for markdown buffers", () => {
    const proseProjector: ProseProjectionProvider = {
      project(input) {
        if (!input.path.endsWith(".md")) {
          return null;
        }
        return {
          format: "prose",
          partial: false,
          syntaxSpans: [
            {
              className: "keyword",
              range: { start: { row: 0, column: 2 }, end: { row: 0, column: 7 } },
              text: "Notes",
            },
          ],
          outline: [
            new OutlineEntry({
              kind: "paragraph",
              name: "Paragraph 1",
              exported: false,
              signature: input.content,
            }),
          ],
          jumpTable: [
            new JumpEntry({ symbol: "Paragraph 1", kind: "paragraph", start: 1, end: 1 }),
          ],
        };
      },
    };
    const buffer = track(createStructuredBuffer("README.md", "# Notes\n", { basis, proseProjector }));

    expect(buffer.format).toBe("prose");
    expect(buffer.outline()).toEqual(expect.objectContaining({
      format: "prose",
      outline: [expect.objectContaining({ kind: "paragraph", name: "Paragraph 1" })],
    }));
    expect(buffer.syntaxSpans().spans).toContainEqual(expect.objectContaining({
      className: "keyword",
      text: "Notes",
    }));
    expect(buffer.injections().injections).toEqual([]);
  });

  it("keeps basis explicit for unsupported-language buffers", () => {
    const unsupportedBasis = { kind: "editor_head" as const, headId: "head-9", tick: 22 };
    const buffer = track(createStructuredBuffer("notes.txt", "hello", { basis: unsupportedBasis }));

    expect(buffer.outline()).toEqual(expect.objectContaining({
      basis: unsupportedBasis,
      reason: "UNSUPPORTED_LANGUAGE",
    }));
    expect(buffer.syntaxSpans()).toEqual(expect.objectContaining({
      basis: unsupportedBasis,
      reason: "UNSUPPORTED_LANGUAGE",
    }));
    expect(buffer.projectionBundle()).toEqual(expect.objectContaining({
      basis: unsupportedBasis,
      parseStatus: expect.objectContaining({
        basis: unsupportedBasis,
        status: "unsupported",
        reason: "UNSUPPORTED_LANGUAGE",
      }),
      outline: expect.objectContaining({ reason: "UNSUPPORTED_LANGUAGE" }),
      syntax: expect.objectContaining({ reason: "UNSUPPORTED_LANGUAGE" }),
      diagnostics: expect.objectContaining({ reason: "UNSUPPORTED_LANGUAGE" }),
      folds: expect.objectContaining({ reason: "UNSUPPORTED_LANGUAGE" }),
    }));
  });

  it("recognizes Edict buffers and reports missing projection provider explicitly", () => {
    const buffer = track(createStructuredBuffer("demo.edict", "package demo.echo@1;\n", { basis }));

    expect(buffer.format).toBe("edict");
    expect(buffer.syntaxSpans()).toEqual(expect.objectContaining({
      format: "edict",
      basis,
      reason: "PROJECTION_PROVIDER_UNAVAILABLE",
    }));
    expect(buffer.projectionBundle()).toEqual(expect.objectContaining({
      format: "edict",
      basis,
      parseStatus: expect.objectContaining({
        format: "edict",
        status: "unsupported",
        reason: "PROJECTION_PROVIDER_UNAVAILABLE",
      }),
    }));
  });

  it("projects Edict syntax and diagnostics through an injected Edict projector", () => {
    const edictProjector: EdictProjectionProvider = {
      project(input) {
        expect(input.name).toBe("demo.edict");
        expect(input.content).toBe("package demo.echo@1;\n");
        expect(input.basis).toEqual(basis);
        expect(input.emit).toEqual(["syntax", "diagnostics", "core", "targetIr"]);
        return {
          language: "edict",
          name: input.name,
          basis: input.basis ?? null,
          syntax: {
            state: "available",
            value: {
              spans: [
                {
                  className: "keyword",
                  range: { start: { row: 0, column: 0 }, end: { row: 0, column: 7 } },
                  text: "package",
                },
              ],
            },
          },
          diagnostics: {
            items: [
              {
                stage: "parse",
                kind: "ExpectedToken",
                severity: "error",
                message: "expected token",
                range: { start: { row: 0, column: 18 }, end: { row: 0, column: 19 } },
              },
            ],
          },
          core: { state: "blocked", reason: [{ kind: "ExpectedToken" }] },
          targetIr: { state: "not_requested" },
          status: {
            status: "ok",
            checked: 1,
            errors: 1,
            exitCode: 0,
          },
        };
      },
    };
    const buffer = track(createStructuredBuffer("demo.edict", "package demo.echo@1;\n", {
      basis,
      edictProjector,
    }));

    expect(buffer.format).toBe("edict");
    expect(buffer.edictProjection()).toEqual(expect.objectContaining({
      language: "edict",
      name: "demo.edict",
      basis,
      core: { state: "blocked", reason: [{ kind: "ExpectedToken" }] },
    }));
    expect(buffer.syntaxSpans()).toEqual(expect.objectContaining({
      format: "edict",
      partial: true,
      spans: [
        {
          className: "keyword",
          range: { start: { row: 0, column: 0 }, end: { row: 0, column: 7 } },
          text: "package",
        },
      ],
    }));
    expect(buffer.diagnostics().diagnostics).toEqual([
      expect.objectContaining({
        code: "compiler_diagnostic",
        source: "edict",
        stage: "parse",
        kind: "ExpectedToken",
      }),
    ]);
  });

  it("projects Edict buffers through a projection provider registry", () => {
    const edictProjector: EdictProjectionProvider = {
      project(input) {
        expect(input.name).toBe("DEMO.EDICT");
        expect(input.content).toBe("package demo.echo@1;\n");
        expect(input.basis).toEqual(basis);
        return {
          language: "edict",
          name: input.name,
          basis: input.basis ?? null,
          syntax: {
            state: "available",
            value: {
              spans: [
                {
                  className: "keyword",
                  range: { start: { row: 0, column: 0 }, end: { row: 0, column: 7 } },
                  text: "package",
                },
              ],
            },
          },
          diagnostics: { items: [] },
          core: { state: "not_requested" },
          targetIr: { state: "not_requested" },
          status: {
            status: "ok",
            checked: 1,
            errors: 0,
            exitCode: 0,
          },
        };
      },
    };
    const projectionRegistry = createProjectionProviderRegistry().register({
      language: "edict",
      extensions: [".edict"],
      provider: { kind: "edict", provider: edictProjector },
    });
    const buffer = track(createStructuredBuffer("DEMO.EDICT", "package demo.echo@1;\n", {
      basis,
      projectionRegistry,
    }));

    expect(buffer.format).toBe("edict");
    expect(buffer.edictProjection()).toEqual(expect.objectContaining({
      language: "edict",
      name: "DEMO.EDICT",
      basis,
    }));
    expect(buffer.syntaxSpans().spans).toEqual([
      expect.objectContaining({ className: "keyword", text: "package" }),
    ]);
  });

  it("routes synthetic dirty Edict buffers by explicit language id", () => {
    const edictProjector: EdictProjectionProvider = {
      project(input) {
        expect(input.name).toBe("untitled-1");
        return {
          language: "edict",
          name: input.name,
          basis: input.basis ?? null,
          syntax: { state: "available", value: { spans: [] } },
          diagnostics: { items: [] },
          core: { state: "not_requested" },
          targetIr: { state: "not_requested" },
          status: {
            status: "ok",
            checked: 1,
            errors: 0,
            exitCode: 0,
          },
        };
      },
    };
    const projectionRegistry = createProjectionProviderRegistry().register({
      language: "edict",
      extensions: [".edict"],
      provider: { kind: "edict", provider: edictProjector },
    });
    const buffer = track(createStructuredBuffer("untitled-1", "package demo.echo@1;\n", {
      basis,
      language: "edict",
      projectionRegistry,
    }));

    expect(buffer.format).toBe("edict");
    expect(buffer.edictProjection()).toEqual(expect.objectContaining({
      language: "edict",
      name: "untitled-1",
      basis,
    }));
    expect(buffer.projectionBundle().parseStatus).toEqual(expect.objectContaining({
      format: "edict",
      status: "full",
    }));
  });

  it("creates one-shot projection bundles through a projection provider registry", () => {
    const edictProjector: EdictProjectionProvider = {
      project(input) {
        expect(input.name).toBe("demo.edict");
        return {
          language: "edict",
          name: input.name,
          basis: input.basis ?? null,
          syntax: {
            state: "available",
            value: {
              spans: [
                {
                  className: "keyword",
                  range: { start: { row: 0, column: 0 }, end: { row: 0, column: 7 } },
                  text: "package",
                },
              ],
            },
          },
          diagnostics: { items: [] },
          core: { state: "not_requested" },
          targetIr: { state: "not_requested" },
          status: {
            status: "ok",
            checked: 1,
            errors: 0,
            exitCode: 0,
          },
        };
      },
    };
    const projectionRegistry = createProjectionProviderRegistry().register({
      language: "edict",
      extensions: [".edict"],
      provider: { kind: "edict", provider: edictProjector },
    });

    const bundle = createProjectionBundle("demo.edict", "package demo.echo@1;\n", {
      basis,
      projectionRegistry,
    });

    expect(bundle.parseStatus).toEqual(expect.objectContaining({
      format: "edict",
      status: "full",
    }));
    expect(bundle.syntax.spans).toEqual([
      expect.objectContaining({ className: "keyword", text: "package" }),
    ]);
  });

  it("attaches resolved authority context to bundles and registry provider requests", () => {
    let receivedAuthority: unknown;
    const edictProjector: EdictProjectionProvider = {
      project(input) {
        receivedAuthority = input.authority;
        return {
          language: "edict",
          name: input.name,
          basis: input.basis ?? null,
          syntax: { state: "available", value: { spans: [] } },
          diagnostics: { items: [] },
          core: { state: "not_requested" },
          targetIr: { state: "not_requested" },
          status: {
            status: "ok",
            checked: 1,
            errors: 0,
            exitCode: 0,
          },
        };
      },
    };
    const projectionRegistry = createProjectionProviderRegistry().register({
      language: "edict",
      extensions: [".edict"],
      provider: { kind: "edict", provider: edictProjector },
    });
    const projectionProfileResolver = edictAuthorityResolver();

    const bundle = createProjectionBundle("lawpacks/demo.edict", "package demo.echo@1;\n", {
      basis,
      projectionProfileResolver,
      projectionRegistry,
    });

    expect(bundle.authority).toEqual({
      state: "resolved",
      authority: expect.objectContaining({
        language: "edict",
        provider: "edict",
        profileId: "edict-lawpack",
        resolutionSource: "project_config",
        routingDigest: expect.stringMatching(/^sha256:[0-9a-f]{64}$/u),
        profileDigest: expect.stringMatching(/^sha256:[0-9a-f]{64}$/u),
        extensions: [
          { coordinate: "edict.projection/v1", digest: BASE_DIGEST },
          { coordinate: "edict.lawpack-descriptors/v1", digest: EDICT_DIGEST },
        ],
      }),
    });
    expect(bundle.authority.state).toBe("resolved");
    if (bundle.authority.state !== "resolved") {
      throw new Error("expected resolved authority context");
    }
    expect(receivedAuthority).toEqual(bundle.authority.authority);
  });

  it("treats blank profile overrides as absent and explicit profile overrides as authority", () => {
    const edictProjector: EdictProjectionProvider = {
      project(input) {
        return {
          language: "edict",
          name: input.name,
          basis: input.basis ?? null,
          syntax: { state: "available", value: { spans: [] } },
          diagnostics: { items: [] },
          core: { state: "not_requested" },
          targetIr: { state: "not_requested" },
          status: {
            status: "ok",
            checked: 1,
            errors: 0,
            exitCode: 0,
          },
        };
      },
    };
    const projectionRegistry = createProjectionProviderRegistry().register({
      language: "edict",
      extensions: [".edict"],
      provider: { kind: "edict", provider: edictProjector },
    });
    const projectionProfileResolver = edictAuthorityResolver();

    const blankOverride = createProjectionBundle("lawpacks/demo.edict", "package demo.echo@1;\n", {
      basis,
      profile: "   ",
      projectionProfileResolver,
      projectionRegistry,
    });
    const explicitOverride = createProjectionBundle("lawpacks/demo.edict", "package demo.echo@1;\n", {
      basis,
      profile: "edict-base",
      projectionProfileResolver,
      projectionRegistry,
    });

    expect(blankOverride.authority).toEqual({
      state: "resolved",
      authority: expect.objectContaining({
        profileId: "edict-lawpack",
        resolutionSource: "project_config",
      }),
    });
    expect(explicitOverride.authority.state).toBe("resolved");
    if (explicitOverride.authority.state !== "resolved") {
      throw new Error("expected explicit override to resolve authority");
    }
    expect(explicitOverride.authority.authority).toEqual(expect.objectContaining({
      profileId: "edict-base",
      resolutionSource: "explicit",
    }));
    expect(explicitOverride.authority.authority).not.toHaveProperty("routingDigest");
  });

  it("surfaces authority failures without invoking registry providers", () => {
    const edictProjector: EdictProjectionProvider = {
      project() {
        throw new Error("provider should not run when authority resolution fails");
      },
    };
    const projectionRegistry = createProjectionProviderRegistry().register({
      language: "edict",
      extensions: [".edict"],
      provider: { kind: "edict", provider: edictProjector },
    });
    const projectionProfileResolver = edictAuthorityResolver();

    const bundle = createProjectionBundle("demo.edict", "package demo.echo@1;\n", {
      basis,
      profile: "missing-profile",
      projectionProfileResolver,
      projectionRegistry,
    });

    expect(bundle.authority).toEqual({
      state: "failed",
      failure: expect.objectContaining({
        kind: "unknown_profile",
        profileId: "missing-profile",
      }),
    });
    expect(bundle.parseStatus).toEqual(expect.objectContaining({
      status: "unsupported",
      reason: "PROJECTION_AUTHORITY_UNAVAILABLE",
    }));
  });

  it("keeps XML projection lanes unavailable when authority resolution fails", () => {
    const bundle = createProjectionBundle("assets/logo.svg", "<svg><path fill=\"#17b6ff\"/></svg>", {
      basis,
      profile: "missing-profile",
      projectionProfileResolver: createProjectionProfileResolver({ profiles: [] }),
    });

    expect(bundle.authority).toEqual({
      state: "failed",
      failure: expect.objectContaining({
        kind: "unknown_profile",
        profileId: "missing-profile",
      }),
    });
    expect(bundle.parseStatus).toEqual(expect.objectContaining({
      status: "unsupported",
      reason: "PROJECTION_AUTHORITY_UNAVAILABLE",
    }));
    expect(bundle.syntax).toEqual(expect.objectContaining({
      spans: [],
      injections: [],
      reason: "PROJECTION_AUTHORITY_UNAVAILABLE",
    }));
    expect(bundle.outline).toEqual(expect.objectContaining({
      outline: [],
      jumpTable: [],
      reason: "PROJECTION_AUTHORITY_UNAVAILABLE",
    }));
    expect(bundle.diagnostics).toEqual(expect.objectContaining({
      diagnostics: [],
      reason: "PROJECTION_AUTHORITY_UNAVAILABLE",
    }));
    expect(bundle.folds).toEqual(expect.objectContaining({
      regions: [],
      reason: "PROJECTION_AUTHORITY_UNAVAILABLE",
    }));
  });

  it("marks Edict authority no-provider failures partial", () => {
    const bundle = createProjectionBundle("demo.edict", "package demo.echo@1;\n", {
      basis,
      projectionProfileResolver: createProjectionProfileResolver({ profiles: [] }),
    });

    expect(bundle.authority).toEqual({
      state: "failed",
      failure: expect.objectContaining({
        kind: "no_provider",
        path: "demo.edict",
      }),
    });
    expect(bundle.parseStatus).toEqual(expect.objectContaining({
      partial: true,
      status: "unsupported",
      reason: "PROJECTION_AUTHORITY_UNAVAILABLE",
    }));
    expect(bundle.partial).toBe(true);
  });

  it("reports authority as not configured when no resolver is supplied", () => {
    const bundle = createProjectionBundle("src/view.ts", "export const x = 1;\n", { basis });

    expect(bundle.authority).toEqual({ state: "not_configured" });
    expect(bundle.parseStatus).toEqual(expect.objectContaining({
      status: "full",
    }));
  });

  it("reports provider unavailable when resolved authority has no registry provider", () => {
    const bundle = createProjectionBundle("schemas/demo.graphql", "type Query { greeting: String }\n", {
      basis,
      projectionProfileResolver: wesleyAuthorityResolver(),
    });

    expect(bundle.authority).toEqual({
      state: "resolved",
      authority: expect.objectContaining({
        language: "wesley-sdl",
        provider: "wesley",
        profileId: "wesley-base",
        resolutionSource: "project_config",
      }),
    });
    expect(bundle.parseStatus).toEqual(expect.objectContaining({
      status: "unsupported",
      reason: "PROJECTION_PROVIDER_UNAVAILABLE",
    }));
  });

  it("projects Wesley SDL through registry authority context without owning payload semantics", () => {
    const source = "type Query { greeting: String }\n";
    let receivedInput: Parameters<WesleyProjectionProvider["project"]>[0] | undefined;
    const wesleyProvider: WesleyProjectionProvider = {
      project(input) {
        receivedInput = input;
        return {
          language: "wesley-sdl",
          name: input.name,
          basis: input.basis ?? null,
          syntax: {
            state: "available",
            value: {
              spans: [
                {
                  className: "type",
                  range: { start: { row: 0, column: 5 }, end: { row: 0, column: 10 } },
                  text: "Query",
                },
              ],
            },
          },
          diagnostics: { items: [] },
          digests: {
            state: "available",
            value: {
              items: [
                { kind: "schemaModel", digest: WESLEY_DIGEST },
              ],
            },
          },
          payloads: {
            schemaModel: {
              state: "available",
              value: {
                digest: WESLEY_DIGEST,
                review: { types: ["Query"] },
              },
            },
            descriptors: {
              state: "available",
              value: [],
            },
          },
          status: { status: "ok", checked: 1, errors: 0 },
        };
      },
    };
    const projectionRegistry = createProjectionProviderRegistry().register({
      language: "wesley-sdl",
      extensions: [".graphql", ".graphqls"],
      provider: { kind: "wesley", provider: wesleyProvider },
    });
    const buffer = track(createStructuredBuffer("schemas/demo.graphqls", source, {
      basis,
      projectionProfileResolver: wesleyAuthorityResolver(),
      projectionRegistry,
    }));

    expect(buffer.format).toBe("graphql");
    expect(buffer.syntaxSpans()).toEqual(expect.objectContaining({
      format: "graphql",
      partial: false,
      spans: [expect.objectContaining({ className: "type", text: "Query" })],
    }));
    expect(buffer.diagnostics().diagnostics).toEqual([]);
    expect(buffer.projectionBundle().authority).toEqual({
      state: "resolved",
      authority: expect.objectContaining({
        language: "wesley-sdl",
        provider: "wesley",
        profileId: "wesley-base",
        resolutionSource: "extension_fallback",
      }),
    });
    expect(buffer.wesleyProjection()).toEqual(expect.objectContaining({
      language: "wesley-sdl",
      name: "schemas/demo.graphqls",
      basis,
      payloads: expect.objectContaining({
        schemaModel: {
          state: "available",
          value: {
            digest: WESLEY_DIGEST,
            review: { types: ["Query"] },
          },
        },
      }),
    }));
    expect(receivedInput).toEqual(expect.objectContaining({
      name: "schemas/demo.graphqls",
      content: source,
      basis,
      emit: ["syntax", "diagnostics", "digests", "payloads"],
      authority: expect.objectContaining({
        profileId: "wesley-base",
        extensions: [
          { coordinate: "wesley.graphql-sdl/v1", digest: WESLEY_DIGEST },
        ],
      }),
    }));
  });

  it("preserves Wesley wrong-profile diagnostics without rerouting source directives", () => {
    const source = "extend schema @echoContractHost\n";
    let receivedProfile: string | undefined;
    const wesleyProvider: WesleyProjectionProvider = {
      project(input) {
        receivedProfile = input.authority.profileId;
        return {
          language: "wesley-sdl",
          name: input.name,
          basis: input.basis ?? null,
          syntax: { state: "available", value: { spans: [] } },
          diagnostics: {
            items: [
              {
                stage: "semantic",
                kind: "missing_extension",
                severity: "error",
                message: "echo contract descriptors are not enabled for this profile",
                range: { start: { row: 0, column: 14 }, end: { row: 0, column: 31 } },
              },
            ],
          },
          digests: { state: "not_requested" },
          payloads: {
            descriptors: { state: "blocked", reason: [{ kind: "missing_extension" }] },
          },
          status: { status: "error", checked: 1, errors: 1 },
        };
      },
    };
    const projectionRegistry = createProjectionProviderRegistry().register({
      language: "wesley-sdl",
      extensions: [".graphql", ".graphqls"],
      provider: { kind: "wesley", provider: wesleyProvider },
    });
    const bundle = createProjectionBundle("schemas/echo/contract.graphqls", source, {
      basis,
      profile: "wesley-base",
      projectionProfileResolver: wesleyAuthorityResolver(),
      projectionRegistry,
    });

    expect(receivedProfile).toBe("wesley-base");
    expect(bundle.authority).toEqual({
      state: "resolved",
      authority: expect.objectContaining({
        profileId: "wesley-base",
        resolutionSource: "explicit",
      }),
    });
    expect(bundle.partial).toBe(true);
    expect(bundle.parseStatus).toEqual(expect.objectContaining({
      format: "graphql",
      status: "partial",
    }));
    expect(bundle.diagnostics.diagnostics).toEqual([
      expect.objectContaining({
        code: "compiler_diagnostic",
        source: "wesley",
        stage: "semantic",
        kind: "missing_extension",
      }),
    ]);
  });

  it("reports provider unavailable when a Wesley provider throws", () => {
    const wesleyProvider: WesleyProjectionProvider = {
      project() {
        throw new Error("wesley unavailable");
      },
    };
    const projectionRegistry = createProjectionProviderRegistry().register({
      language: "wesley-sdl",
      extensions: [".graphql", ".graphqls"],
      provider: { kind: "wesley", provider: wesleyProvider },
    });
    const bundle = createProjectionBundle("schemas/demo.graphqls", "type Query { greeting: String }\n", {
      basis,
      projectionProfileResolver: wesleyAuthorityResolver(),
      projectionRegistry,
    });

    expect(bundle.parseStatus).toEqual(expect.objectContaining({
      status: "unsupported",
      reason: "PROJECTION_PROVIDER_UNAVAILABLE",
    }));
    expect(bundle.authority).toEqual({
      state: "resolved",
      authority: expect.objectContaining({
        profileId: "wesley-base",
      }),
    });
  });

  it("fails closed when Wesley authority resolves to a mismatched registry provider kind", () => {
    let edictInvoked = false;
    const edictProjector: EdictProjectionProvider = {
      project(input) {
        edictInvoked = true;
        return {
          language: "edict",
          name: input.name,
          basis: input.basis ?? null,
          syntax: { state: "available", value: { spans: [] } },
          diagnostics: { items: [] },
          core: { state: "not_requested" },
          targetIr: { state: "not_requested" },
          status: { status: "ok", checked: 1, errors: 0, exitCode: 0 },
        };
      },
    };
    const projectionRegistry = createProjectionProviderRegistry().register({
      language: "wesley-sdl",
      extensions: [".graphql", ".graphqls"],
      provider: { kind: "edict", provider: edictProjector },
    });

    const bundle = createProjectionBundle("schemas/demo.graphqls", "type Query { greeting: String }\n", {
      basis,
      projectionProfileResolver: wesleyAuthorityResolver(),
      projectionRegistry,
    });

    expect(edictInvoked).toBe(false);
    expect(bundle.parseStatus).toEqual(expect.objectContaining({
      format: "graphql",
      status: "unsupported",
      reason: "PROJECTION_PROVIDER_UNAVAILABLE",
    }));
    expect(bundle.authority).toEqual({
      state: "resolved",
      authority: expect.objectContaining({
        language: "wesley-sdl",
        provider: "wesley",
        profileId: "wesley-base",
      }),
    });
  });

  it("marks Wesley snapshots partial when provider status reports errors", () => {
    const wesleyProvider: WesleyProjectionProvider = {
      project(input) {
        return {
          language: "wesley-sdl",
          name: input.name,
          basis: input.basis ?? null,
          syntax: { state: "available", value: { spans: [] } },
          diagnostics: { items: [] },
          digests: { state: "not_requested" },
          payloads: {},
          status: { status: "error", checked: 1, errors: 1 },
        };
      },
    };
    const projectionRegistry = createProjectionProviderRegistry().register({
      language: "wesley-sdl",
      extensions: [".graphql", ".graphqls"],
      provider: { kind: "wesley", provider: wesleyProvider },
    });
    const buffer = track(createStructuredBuffer("schemas/demo.graphqls", "type Query { greeting: String }\n", {
      basis,
      projectionProfileResolver: wesleyAuthorityResolver(),
      projectionRegistry,
    }));

    expect(buffer.partial).toBe(true);
    expect(buffer.projectionBundle().parseStatus).toEqual(expect.objectContaining({
      format: "graphql",
      partial: true,
      status: "partial",
    }));
  });

  it("preserves native structured parsing when resolver has no matching profile", () => {
    const bundle = createProjectionBundle("src/view.ts", "export const x = 1;\n", {
      basis,
      projectionProfileResolver: edictAuthorityResolver(),
    });

    expect(bundle.authority).toEqual({
      state: "failed",
      failure: expect.objectContaining({
        kind: "no_provider",
        path: "src/view.ts",
      }),
    });
    expect(bundle.parseStatus).toEqual(expect.objectContaining({
      format: "ts",
      status: "full",
      reason: undefined,
    }));
    expect(bundle.syntax.spans).toContainEqual(expect.objectContaining({
      className: "keyword",
      text: "export",
    }));
  });

  it("prefers a direct Edict projector over a registry provider", () => {
    const directProjector: EdictProjectionProvider = {
      project(input) {
        return {
          language: "edict",
          name: input.name,
          basis: input.basis ?? null,
          syntax: {
            state: "available",
            value: {
              spans: [
                {
                  className: "keyword",
                  range: { start: { row: 0, column: 0 }, end: { row: 0, column: 6 } },
                  text: "direct",
                },
              ],
            },
          },
          diagnostics: { items: [] },
          core: { state: "not_requested" },
          targetIr: { state: "not_requested" },
          status: {
            status: "ok",
            checked: 1,
            errors: 0,
            exitCode: 0,
          },
        };
      },
    };
    const registryProjector: EdictProjectionProvider = {
      project() {
        throw new Error("registry provider should not be used when a direct Edict projector is supplied");
      },
    };
    const projectionRegistry = createProjectionProviderRegistry().register({
      language: "edict",
      extensions: [".edict"],
      provider: { kind: "edict", provider: registryProjector },
    });
    const buffer = track(createStructuredBuffer("demo.edict", "package demo.echo@1;\n", {
      basis,
      edictProjector: directProjector,
      projectionRegistry,
    }));

    expect(buffer.syntaxSpans().spans).toEqual([
      expect.objectContaining({ className: "keyword", text: "direct" }),
    ]);
  });

  it("treats blank explicit language ids as absent when a registry is present", () => {
    const edictProjector: EdictProjectionProvider = {
      project() {
        throw new Error("blank language id should not route synthetic buffers");
      },
    };
    const projectionRegistry = createProjectionProviderRegistry().register({
      language: "edict",
      extensions: [".edict"],
      provider: { kind: "edict", provider: edictProjector },
    });
    const buffer = track(createStructuredBuffer("untitled-1", "package demo.echo@1;\n", {
      basis,
      language: "  ",
      projectionRegistry,
    }));

    expect(buffer.format).toBeNull();
    expect(buffer.syntaxSpans()).toEqual(expect.objectContaining({
      format: null,
      basis,
      reason: "UNSUPPORTED_LANGUAGE",
    }));
  });

  it("marks Edict snapshots partial when requested syntax projection fails", () => {
    const edictProjector: EdictProjectionProvider = {
      project(input) {
        return {
          language: "edict",
          name: input.name,
          basis: input.basis ?? null,
          syntax: {
            state: "failed",
            error: { kind: "missing_projection_record" },
          },
          diagnostics: { items: [] },
          core: {
            state: "available",
            value: {
              digest: "sha256:1111111111111111111111111111111111111111111111111111111111111111",
              review: { apiVersion: "edict.core/v1" },
            },
          },
          targetIr: {
            state: "available",
            value: {
              domain: "echo.span-ir/v1",
              target: {
                coordinate: "echo.dpo@1",
                digest: "sha256:2222222222222222222222222222222222222222222222222222222222222222",
              },
              digest: "sha256:3333333333333333333333333333333333333333333333333333333333333333",
              review: { intents: {} },
            },
          },
          status: {
            status: "ok",
            checked: 1,
            errors: 0,
            exitCode: 0,
          },
        };
      },
    };
    const buffer = track(createStructuredBuffer("demo.edict", "package demo.echo@1;\n", {
      basis,
      edictProjector,
    }));

    expect(buffer.syntaxSpans()).toEqual(expect.objectContaining({
      format: "edict",
      partial: true,
      spans: [],
    }));
    expect(buffer.projectionBundle().parseStatus).toEqual(expect.objectContaining({
      format: "edict",
      status: "partial",
    }));
  });

  it("reports projection provider unavailable when an Edict projector throws", () => {
    const edictProjector: EdictProjectionProvider = {
      project() {
        throw new Error("edict CLI unavailable");
      },
    };

    const buffer = track(createStructuredBuffer("demo.edict", "package demo.echo@1;\n", {
      basis,
      edictProjector,
    }));

    expect(buffer.format).toBe("edict");
    expect(buffer.syntaxSpans()).toEqual(expect.objectContaining({
      format: "edict",
      basis,
      reason: "PROJECTION_PROVIDER_UNAVAILABLE",
    }));
    expect(buffer.projectionBundle().parseStatus).toEqual(expect.objectContaining({
      format: "edict",
      status: "unsupported",
      reason: "PROJECTION_PROVIDER_UNAVAILABLE",
    }));
  });

  it("projects prose buffers when a Colorful-compatible projector is supplied", () => {
    const proseProjector: ProseProjectionProvider = {
      project(input) {
        expect(input.path).toBe("notes.txt");
        expect(input.content).toBe("ship it\n");
        return {
          format: "prose",
          partial: false,
          syntaxSpans: [
            {
              className: "keyword",
              range: { start: { row: 0, column: 0 }, end: { row: 0, column: 4 } },
              text: "ship",
            },
          ],
          outline: [
            new OutlineEntry({
              kind: "paragraph",
              name: "Paragraph 1",
              exported: false,
              signature: "ship it",
            }),
          ],
          jumpTable: [
            new JumpEntry({ symbol: "Paragraph 1", kind: "paragraph", start: 1, end: 1 }),
          ],
        };
      },
    };
    const buffer = track(createStructuredBuffer("notes.txt", "ship it\n", { basis, proseProjector }));

    expect(buffer.format).toBe("prose");
    expect(buffer.outline()).toEqual(expect.objectContaining({
      format: "prose",
      outline: [expect.objectContaining({ kind: "paragraph", name: "Paragraph 1" })],
    }));
    const syntaxSpans = buffer.syntaxSpans();
    expect(syntaxSpans).toEqual(expect.objectContaining({
      format: "prose",
      spans: [expect.objectContaining({ className: "keyword", text: "ship" })],
    }));
    expect(syntaxSpans).not.toHaveProperty("reason");
    const projectionBundle = buffer.projectionBundle();
    expect(projectionBundle).toEqual(expect.objectContaining({
      format: "prose",
      parseStatus: expect.objectContaining({
        format: "prose",
        status: "full",
        reason: undefined,
      }),
      diagnostics: expect.objectContaining({
        format: "prose",
        diagnostics: [],
      }),
    }));
    expect(projectionBundle.diagnostics).not.toHaveProperty("reason");
  });
});
