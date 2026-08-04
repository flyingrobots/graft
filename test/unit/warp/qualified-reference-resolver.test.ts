import { describe, expect, it } from "vitest";
import { nodePathOps } from "../../../src/adapters/node-paths.js";
import { parseStructuredTreeAsync } from "../../../src/parser/runtime.js";
import { buildGoReferenceContext } from "../../../src/warp/go-reference-context.js";
import { analyzeQualifiedReferences } from "../../../src/warp/qualified-reference-resolver.js";

async function analyze(
  language: "python" | "ts" | "tsx" | "js" | "rust" | "go",
  filePath: string,
  source: string,
  files: ReadonlyMap<string, string>,
) {
  const parsed = await parseStructuredTreeAsync(language, source);
  try {
    const knownFiles = new Set(files.keys());
    const go = language === "go"
      ? await buildGoReferenceContext(filePath, knownFiles, (candidate) => Promise.resolve(files.get(candidate) ?? null))
      : undefined;
    return analyzeQualifiedReferences(language, filePath, parsed.root, {
      pathOps: nodePathOps,
      knownFiles,
      ...(go !== undefined ? { go } : {}),
    });
  } finally {
    parsed.delete();
  }
}

describe("qualified reference language adapters", () => {
  it("ignores standard-library, third-party, and unresolved module bindings", async () => {
    const python = await analyze("python", "caller.py", "import json\njson.loads('{}')\n", new Map([["caller.py", ""]]));
    const typescript = await analyze("ts", "src/caller.ts", 'import * as path from "node:path"; path.join("a", "b");', new Map([["src/caller.ts", ""]]));
    const rust = await analyze("rust", "src/caller.rs", "use serde::json as data; fn f(){ data::parse(); }", new Map([
      ["Cargo.toml", "[package]\nname='x'"], ["src/caller.rs", ""],
    ]));
    expect(python.bindings).toEqual([]);
    expect(typescript.bindings).toEqual([]);
    expect(rust.bindings).toEqual([]);
    expect([...python.diagnostics, ...typescript.diagnostics, ...rust.diagnostics]).toEqual([]);
  });

  it("treats Python parameters and locals as whole-function shadows", async () => {
    const source = [
      "from coqui.matcher import sources",
      "sources.pending_ids()",
      "def parameter_shadow(sources):",
      "    sources.pending_ids()",
      "def local_shadow():",
      "    sources.pending_ids()",
      "    sources = object()",
      "def mutate_module():",
      "    sources.cache = {}",
      "    sources.pending_ids()",
      "def sibling():",
      "    sources.pending_ids()",
    ].join("\n");
    const analysis = await analyze("python", "coqui/matcher/cli.py", source, new Map([
      ["coqui/matcher/cli.py", source],
      ["coqui/matcher/__init__.py", ""],
      ["coqui/matcher/sources.py", "def pending_ids(): return []"],
    ]));

    expect(analysis.accesses.map((access) => access.shadow?.shadowKind ?? "resolved")).toEqual([
      "resolved", "parameter", "local_binding", "resolved", "resolved",
    ]);
    expect(analysis.diagnostics.map((diagnostic) => diagnostic.binding)).toEqual(["sources", "sources"]);
  });

  it("excludes Python qualified writes and deletes from caller references", async () => {
    const source = [
      "import pkg.sources as source",
      "source.pending_ids = replacement",
      "del source.pending_ids",
      "source.pending_ids()",
    ].join("\n");
    const analysis = await analyze("python", "pkg/caller.py", source, new Map([
      ["pkg/caller.py", source],
      ["pkg/sources.py", "def pending_ids(): return []\n"],
    ]));

    expect(analysis.accesses.map((access) => access.member)).toEqual(["pending_ids"]);
    expect(analysis.unresolvedAccesses).toEqual([
      expect.objectContaining({ binding: "source", member: "pending_ids", targetFilePath: "pkg/sources.py" }),
      expect.objectContaining({ binding: "source", member: "pending_ids", targetFilePath: "pkg/sources.py" }),
    ]);
  });

  it("honors Python global and nonlocal declarations before reassignment", async () => {
    const source = [
      "import pkg.sources as source",
      "def mutate_global(replacement):",
      "    global source",
      "    source.pending_ids()",
      "    source = replacement",
      "    source.pending_ids()",
      "def outer():",
      "    import pkg.sources as nested_source",
      "    def mutate_nonlocal(replacement):",
      "        nonlocal nested_source",
      "        nested_source.pending_ids()",
      "        nested_source = replacement",
      "        nested_source.pending_ids()",
    ].join("\n");
    const analysis = await analyze("python", "pkg/caller.py", source, new Map([
      ["pkg/caller.py", source],
      ["pkg/sources.py", "def pending_ids(): return []\n"],
    ]));

    expect(analysis.accesses.map((access) => access.shadow?.shadowKind ?? "resolved")).toEqual([
      "resolved", "assignment", "resolved", "assignment",
    ]);
  });

  it("targets Python shadow diagnostics to the import active in each lexical scope", async () => {
    const source = [
      "def first():",
      "    import pkg.alpha as source",
      "    def shadow(source): source.run()",
      "def second():",
      "    import pkg.beta as source",
      "    def shadow(source): source.run()",
      "def unrelated():",
      "    def shadow(source): source.run()",
    ].join("\n");
    const analysis = await analyze("python", "pkg/caller.py", source, new Map([
      ["pkg/caller.py", source],
      ["pkg/alpha.py", "def run(): pass\n"],
      ["pkg/beta.py", "def run(): pass\n"],
    ]));

    expect(analysis.diagnostics).toEqual([
      expect.objectContaining({ binding: "source", targetFilePath: "pkg/alpha.py", shadowKind: "parameter" }),
      expect.objectContaining({ binding: "source", targetFilePath: "pkg/beta.py", shadowKind: "parameter" }),
    ]);
  });

  it("extracts every binding pattern without treating defaults as bindings", async () => {
    const python = [
      "import pkg.sources as source",
      "def default_only(value=source.pending_ids()):",
      "    source.pending_ids()",
    ].join("\n");
    const pythonAnalysis = await analyze("python", "pkg/caller.py", python, new Map([
      ["pkg/caller.py", python], ["pkg/sources.py", "def pending_ids(): return []"],
    ]));
    expect(pythonAnalysis.accesses.map((access) => access.shadow?.shadowKind ?? "resolved")).toEqual([
      "resolved", "resolved",
    ]);

    const typescript = [
      'import * as api from "./api";',
      'import * as other from "./other";',
      "{ const { left: api, right: other } = value; api.run(); other.run(); }",
    ].join("\n");
    const typescriptAnalysis = await analyze("ts", "src/caller.ts", typescript, new Map([
      ["src/caller.ts", typescript], ["src/api.ts", "export function run() {}"],
      ["src/other.ts", "export function run() {}"],
    ]));
    expect(typescriptAnalysis.accesses.map((access) => access.shadow?.shadowKind ?? "resolved")).toEqual([
      "local_binding", "local_binding",
    ]);
  });

  it("treats Python with aliases and match captures as enclosing-scope bindings", async () => {
    const source = [
      "import pkg.sources as source",
      "def with_shadow():",
      "    source.pending_ids()",
      "    with manager() as source:",
      "        source.pending_ids()",
      "    source.pending_ids()",
      "def match_shadow(value):",
      "    source.pending_ids()",
      "    match value:",
      "        case (_, source):",
      "            source.pending_ids()",
      "    source.pending_ids()",
      "source.pending_ids()",
    ].join("\n");
    const analysis = await analyze("python", "pkg/caller.py", source, new Map([
      ["pkg/caller.py", source], ["pkg/sources.py", "def pending_ids(): return []"],
    ]));

    expect(analysis.accesses.map((access) => access.shadow?.shadowKind ?? "resolved")).toEqual([
      "with_binding", "with_binding", "with_binding",
      "pattern_binding", "pattern_binding", "pattern_binding",
      "resolved",
    ]);
  });

  it("treats bare Python deletion targets as whole-function shadows", async () => {
    const source = [
      "import pkg.sources as source",
      "def delete_name():",
      "    source.pending_ids()",
      "    del source",
      "    source.pending_ids()",
      "def delete_attribute():",
      "    del source.cache",
      "    source.pending_ids()",
      "source.pending_ids()",
    ].join("\n");
    const analysis = await analyze("python", "pkg/caller.py", source, new Map([
      ["pkg/caller.py", source],
      ["pkg/sources.py", "def pending_ids(): return []\n"],
    ]));

    expect(analysis.accesses.map((access) => access.shadow?.shadowKind ?? "resolved")).toEqual([
      "deletion", "deletion", "resolved", "resolved",
    ]);
    expect(analysis.diagnostics).toEqual([
      expect.objectContaining({ binding: "source", shadowKind: "deletion" }),
    ]);
  });

  it("resolves nested Python imports within their lexical scopes", async () => {
    const source = [
      "import pkg.outer as source",
      "def nested():",
      "    source.pending_ids()",
      "    import pkg.inner as source",
      "    source.pending_ids()",
      "source.pending_ids()",
    ].join("\n");
    const analysis = await analyze("python", "pkg/caller.py", source, new Map([
      ["pkg/caller.py", source],
      ["pkg/outer.py", "def pending_ids(): return []"],
      ["pkg/inner.py", "def pending_ids(): return []"],
    ]));

    expect(analysis.accesses.map((access) => [
      access.targetFilePath,
      access.shadow?.shadowKind ?? "resolved",
    ])).toEqual([
      ["pkg/outer.py", "import_declaration"],
      ["pkg/inner.py", "resolved"],
      ["pkg/outer.py", "resolved"],
    ]);
    expect(analysis.diagnostics).toEqual([
      expect.objectContaining({ binding: "source", targetFilePath: "pkg/outer.py", shadowKind: "import_declaration" }),
    ]);
  });

  it("does not expose Python class imports inside method bodies", async () => {
    const source = [
      "import pkg.outer as api",
      "class Container:",
      "    import pkg.inner as api",
      "    class_value = api.run()",
      "    def method(self):",
      "        api.run()",
      "api.run()",
    ].join("\n");
    const analysis = await analyze("python", "pkg/caller.py", source, new Map([
      ["pkg/caller.py", source],
      ["pkg/outer.py", "def run(): pass\n"],
      ["pkg/inner.py", "def run(): pass\n"],
    ]));

    expect(analysis.accesses.map((access) => access.targetFilePath)).toEqual([
      "pkg/inner.py",
      "pkg/outer.py",
      "pkg/outer.py",
    ]);
  });

  it("does not leak Python class bindings into methods or comprehension bodies", async () => {
    const source = [
      "import pkg.outer as api",
      "class Shadowing:",
      "    api = object()",
      "    def method(self):",
      "        api.run()",
      "class Comprehension:",
      "    import pkg.inner as api",
      "    values = [api.run() for item in api.items()]",
    ].join("\n");
    const analysis = await analyze("python", "pkg/caller.py", source, new Map([
      ["pkg/caller.py", source],
      ["pkg/outer.py", "def run(): pass\n"],
      ["pkg/inner.py", "def run(): pass\ndef items(): return []\n"],
    ]));

    expect(analysis.accesses.map((access) => [
      access.targetFilePath,
      access.shadow?.shadowKind ?? "resolved",
    ])).toEqual([
      ["pkg/outer.py", "resolved"],
      ["pkg/outer.py", "resolved"],
      ["pkg/inner.py", "resolved"],
    ]);
  });

  it("uses TypeScript block and parameter scopes without suppressing siblings", async () => {
    const source = [
      'import * as api from "./api";',
      "api.buildThing();",
      "function shadow(api: Api) { api.buildThing(); }",
      "{ const api = local; api.buildThing(); }",
      "api.buildThing();",
    ].join("\n");
    const analysis = await analyze("ts", "src/consumer.ts", source, new Map([
      ["src/consumer.ts", source], ["src/api.ts", "export function buildThing() {}"],
    ]));

    expect(analysis.accesses.map((access) => access.shadow?.shadowKind ?? "resolved")).toEqual([
      "resolved", "parameter", "local_binding", "resolved",
    ]);

    const loopSource = [
      'import * as api from "./api";',
      "for (const item of api.items) {",
      "  api.buildThing();",
      "  const api = local;",
      "}",
      "api.buildThing();",
    ].join("\n");
    const loopAnalysis = await analyze("ts", "src/loop.ts", loopSource, new Map([
      ["src/loop.ts", loopSource], ["src/api.ts", "export function buildThing() {}"],
    ]));
    expect(loopAnalysis.accesses.map((access) => access.shadow?.shadowKind ?? "resolved")).toEqual([
      "resolved", "local_binding", "resolved",
    ]);
  });

  it("scopes TypeScript and JavaScript parameters across default initializers", async () => {
    const source = [
      'import * as api from "./api";',
      "function self(api = api.run()) {}",
      "function later(value = api.run(), api) {}",
      "function unshadowed(value = api.run()) {}",
    ].join("\n");
    const files = new Map([
      ["src/api.ts", "export function run() {}"],
      ["src/caller.ts", source],
      ["src/caller.js", source],
    ]);

    const typescript = await analyze("ts", "src/caller.ts", source, files);
    const javascript = await analyze("js", "src/caller.js", source, files);

    expect(typescript.accesses.map((access) => access.shadow?.shadowKind ?? "resolved")).toEqual([
      "parameter", "parameter", "resolved",
    ]);
    expect(javascript.accesses.map((access) => access.shadow?.shadowKind ?? "resolved")).toEqual([
      "parameter", "parameter", "resolved",
    ]);
  });

  it("scopes named TypeScript and JavaScript expressions to their bodies", async () => {
    const source = [
      'import * as api from "./api";',
      "const callable = function api() { api.run(); };",
      "const constructable = class api { method() { api.run(); } };",
      "api.run();",
    ].join("\n");
    const files = new Map([
      ["src/api.ts", "export function run() {}\nexport interface Options {}"],
      ["src/caller.ts", source],
      ["src/caller.js", source],
    ]);

    const typescript = await analyze("ts", "src/caller.ts", source, files);
    const javascript = await analyze("js", "src/caller.js", source, files);
    expect(typescript.accesses.map((access) => access.shadow?.shadowKind ?? "resolved")).toEqual([
      "function_declaration", "type_declaration", "resolved",
    ]);
    expect(javascript.accesses.map((access) => access.shadow?.shadowKind ?? "resolved")).toEqual([
      "function_declaration", "type_declaration", "resolved",
    ]);

    const typedSource = [
      'import * as api from "./api";',
      "const callable = function api(): api.Options { api.run(); throw new Error(); };",
    ].join("\n");
    const typed = await analyze("ts", "src/typed.ts", typedSource, new Map([
      ["src/typed.ts", typedSource],
      ["src/api.ts", "export function run() {}\nexport interface Options {}"],
    ]));
    expect(typed.accesses.map((access) => [access.member, access.shadow?.shadowKind ?? "resolved"])).toEqual([
      ["Options", "resolved"],
      ["run", "function_declaration"],
    ]);
  });

  it("treats TypeScript enum declarations as lexical namespace shadows", async () => {
    const source = [
      'import * as api from "./api";',
      "function enumShadow() { api.run(); enum api { run }; api.run(); }",
      "function sibling() { api.run(); }",
    ].join("\n");
    const analysis = await analyze("ts", "src/caller.ts", source, new Map([
      ["src/caller.ts", source],
      ["src/api.ts", "export function run() {}"],
    ]));

    expect(analysis.accesses.map((access) => access.shadow?.shadowKind ?? "resolved")).toEqual([
      "type_declaration", "type_declaration", "resolved",
    ]);
    expect(analysis.diagnostics).toEqual([
      expect.objectContaining({ binding: "api", shadowKind: "type_declaration" }),
    ]);
  });

  it("limits TypeScript switch lexical shadows while hoisting var to the function", async () => {
    const source = [
      'import * as api from "./api";',
      "function letShadow(value) { switch (value) { case 1: let api = local; api.run(); break; case 2: api.run(); } api.run(); }",
      "function constShadow(value) { switch (value) { case 1: const api = local; api.run(); break; case 2: api.run(); } api.run(); }",
      "function varShadow(value) { api.run(); switch (value) { case 1: var api = local; api.run(); } api.run(); }",
    ].join("\n");
    const analysis = await analyze("ts", "src/caller.ts", source, new Map([
      ["src/caller.ts", source], ["src/api.ts", "export function run() {}"],
    ]));

    expect(analysis.accesses.map((access) => access.shadow?.shadowKind ?? "resolved")).toEqual([
      "local_binding", "local_binding", "resolved",
      "local_binding", "local_binding", "resolved",
      "local_binding", "local_binding", "local_binding",
    ]);
  });

  it("resolves TypeScript namespace members in both type and value positions", async () => {
    const source = [
      'import * as api from "./api";',
      "type Local = api.Options;",
      "const value: api.Options = api.buildThing();",
      "function shadow(api: unknown) { const local: api.Options = api.buildThing(); }",
    ].join("\n");
    const analysis = await analyze("ts", "src/consumer.ts", source, new Map([
      ["src/consumer.ts", source],
      ["src/api.ts", "export interface Options {}\nexport function buildThing(): Options { return {}; }"],
    ]));

    expect(analysis.accesses.map((access) => [access.member, access.shadow?.shadowKind ?? "resolved"])).toEqual([
      ["Options", "resolved"],
      ["Options", "resolved"],
      ["buildThing", "resolved"],
      ["Options", "resolved"],
      ["buildThing", "parameter"],
    ]);
  });

  it("resolves extensionless modern TypeScript module candidates", async () => {
    const source = [
      'import * as mts from "./module-mts";',
      'import * as cts from "./module-cts";',
      'import * as jsxIndex from "./jsx-index";',
      'import * as mtsIndex from "./mts-index";',
      'import * as ctsIndex from "./cts-index";',
      'import type * as declaration from "./declaration";',
      'import type * as moduleDeclaration from "./module-declaration";',
      'import type * as commonDeclaration from "./common-declaration";',
      "mts.run(); cts.run(); jsxIndex.run(); mtsIndex.run(); ctsIndex.run();",
      "type Declared = declaration.Options | moduleDeclaration.Options | commonDeclaration.Options;",
    ].join("\n");
    const analysis = await analyze("ts", "src/caller.ts", source, new Map([
      ["src/caller.ts", source],
      ["src/module-mts.mts", "export function run() {}"],
      ["src/module-cts.cts", "export function run() {}"],
      ["src/jsx-index/index.jsx", "export function run() {}"],
      ["src/mts-index/index.mts", "export function run() {}"],
      ["src/cts-index/index.cts", "export function run() {}"],
      ["src/declaration.d.ts", "export interface Options {}"],
      ["src/module-declaration.d.mts", "export interface Options {}"],
      ["src/common-declaration.d.cts", "export interface Options {}"],
    ]));

    expect(analysis.accesses.map((access) => access.targetFilePath)).toEqual([
      "src/module-mts.mts",
      "src/module-cts.cts",
      "src/jsx-index/index.jsx",
      "src/mts-index/index.mts",
      "src/cts-index/index.cts",
      "src/declaration.d.ts",
      "src/module-declaration.d.mts",
      "src/common-declaration.d.cts",
    ]);
  });

  it("shares namespace resolution and lexical declaration scopes across TSX and JavaScript", async () => {
    const tsx = [
      'import * as view from "./view";',
      "function render() {",
      "  view.Card();",
      "  { view.Card(); const view = local; }",
      "  view.Card();",
      "}",
    ].join("\n");
    const tsxAnalysis = await analyze("tsx", "src/render.tsx", tsx, new Map([
      ["src/render.tsx", tsx], ["src/view.tsx", "export function Card() { return <div />; }"],
    ]));
    expect(tsxAnalysis.accesses.map((access) => access.shadow?.shadowKind ?? "resolved")).toEqual([
      "resolved", "local_binding", "resolved",
    ]);

    const javascript = [
      'import * as api from "./api.js";',
      "function call() {",
      "  api.run();",
      "  if (ok) { var api = local; }",
      "  api.run();",
      "}",
      "function parameterShadow(api) { api.run(); }",
    ].join("\n");
    const jsAnalysis = await analyze("js", "src/caller.js", javascript, new Map([
      ["src/caller.js", javascript], ["src/api.js", "export function run() {}"],
    ]));
    expect(jsAnalysis.accesses.map((access) => access.shadow?.shadowKind ?? "resolved")).toEqual([
      "local_binding", "local_binding", "parameter",
    ]);
  });

  it("hoists TypeScript function and class shadows across their lexical blocks", async () => {
    const source = [
      'import * as api from "./api";',
      "{ api.run(); function api() {}; api.run(); }",
      "{ api.run(); class api {}; api.run(); }",
      "api.run();",
    ].join("\n");
    const analysis = await analyze("ts", "src/caller.ts", source, new Map([
      ["src/caller.ts", source],
      ["src/api.ts", "export function run() {}"],
    ]));

    expect(analysis.accesses.map((access) => access.shadow?.shadowKind ?? "resolved")).toEqual([
      "function_declaration", "function_declaration",
      "type_declaration", "type_declaration",
      "resolved",
    ]);
  });

  it("extracts JavaScript parameter patterns without traversing default expressions", async () => {
    const source = [
      'import * as api from "./api.js";',
      'import * as source from "./source.js";',
      "function defaulted(api = fallback) { api.run(); }",
      "function destructured({ api }) { api.run(); }",
      "const parenthesized = (source = fallback) => source.run();",
      "const single = api => api.run();",
      "function defaultExpression(value = api.run()) { api.run(); }",
    ].join("\n");
    const analysis = await analyze("js", "src/caller.js", source, new Map([
      ["src/caller.js", source],
      ["src/api.js", "export function run() {}"],
      ["src/source.js", "export function run() {}"],
    ]));

    expect(analysis.accesses.map((access) => access.shadow?.shadowKind ?? "resolved")).toEqual([
      "parameter", "parameter", "parameter", "parameter", "resolved", "resolved",
    ]);
  });

  it("treats TypeScript and JavaScript generator parameters as function-local shadows", async () => {
    const source = [
      'import * as api from "./api";',
      "function* declaration(api) { api.run(); }",
      "const expression = function* ({ api }) { api.run(); };",
      "{ api.run(); function* api() {} }",
      "api.run();",
    ].join("\n");
    const files = new Map([
      ["src/api.ts", "export function run() {}"],
      ["src/caller.ts", source],
      ["src/caller.js", source],
    ]);

    const typescript = await analyze("ts", "src/caller.ts", source, files);
    const javascript = await analyze("js", "src/caller.js", source, files);
    expect(typescript.accesses.map((access) => access.shadow?.shadowKind ?? "resolved")).toEqual([
      "parameter", "parameter", "function_declaration", "resolved",
    ]);
    expect(javascript.accesses.map((access) => access.shadow?.shadowKind ?? "resolved")).toEqual([
      "parameter", "parameter", "function_declaration", "resolved",
    ]);
  });

  it("confines comprehension, loop, catch, range, and pattern bindings to their lexical regions", async () => {
    const python = [
      "import pkg.sources as src",
      "values = [src.pending_ids() for src in items]",
      "try:",
      "    run()",
      "except Error as src:",
      "    src.pending_ids()",
      "src.pending_ids()",
    ].join("\n");
    const pythonAnalysis = await analyze("python", "caller.py", python, new Map([
      ["caller.py", python], ["pkg/sources.py", "def pending_ids(): return []"],
    ]));
    expect(pythonAnalysis.accesses.map((access) => access.shadow?.shadowKind ?? "resolved")).toEqual([
      "comprehension_binding", "except_binding", "except_binding",
    ]);

    const typescript = 'import * as api from "./api"; for (const api of xs) { api.build(); } try {} catch (api) { api.build(); } api.build();';
    const tsAnalysis = await analyze("ts", "src/caller.ts", typescript, new Map([
      ["src/caller.ts", typescript], ["src/api.ts", "export function build() {}"],
    ]));
    expect(tsAnalysis.accesses.map((access) => access.shadow?.shadowKind ?? "resolved")).toEqual(["loop_binding", "catch_binding", "resolved"]);

    const rust = "use crate::sources as src; fn f(){ for src in xs { src::pending(); } match x { src => src::pending(), _ => {} } src::pending(); }";
    const rustAnalysis = await analyze("rust", "src/caller.rs", rust, new Map([
      ["Cargo.toml", "[package]\nname='x'"], ["src/caller.rs", rust], ["src/sources.rs", "pub fn pending() {}"],
    ]));
    expect(rustAnalysis.accesses.map((access) => access.shadow?.shadowKind ?? "resolved")).toEqual(["resolved", "resolved", "resolved"]);

    const go = "package p\nimport src \"example.com/p/sources\"\nfunc f(){ for _, src := range xs { src.Pending() }; src.Pending() }";
    const goAnalysis = await analyze("go", "caller.go", go, new Map([
      ["go.mod", "module example.com/p\n"], ["caller.go", go], ["sources/pending.go", "package sources\nfunc Pending() {}"],
    ]));
    expect(goAnalysis.accesses.map((access) => access.shadow?.shadowKind ?? "resolved")).toEqual(["range_binding", "resolved"]);
  });

  it("models Python exception targets as function locals and deletes outer-scope aliases", async () => {
    const source = [
      "import pkg.sources as src",
      "def function_scope():",
      "    src.pending_ids()",
      "    try:",
      "        run()",
      "    except Error as src:",
      "        src.pending_ids()",
      "    src.pending_ids()",
      "class ClassScope:",
      "    import pkg.sources as src",
      "    src.pending_ids()",
      "    try:",
      "        run()",
      "    except Error as src:",
      "        src.pending_ids()",
      "    src.pending_ids()",
    ].join("\n");
    const analysis = await analyze("python", "pkg/caller.py", source, new Map([
      ["pkg/caller.py", source],
      ["pkg/sources.py", "def pending_ids(): return []\n"],
    ]));

    expect(analysis.accesses.map((access) => access.shadow?.shadowKind ?? "resolved")).toEqual([
      "except_binding", "except_binding", "except_binding",
      "resolved", "except_binding", "except_binding",
    ]);
  });

  it("resolves a Python comprehension iterable before binding its target", async () => {
    const source = [
      "import pkg.sources as source",
      "[source.pending_ids() for source in source.items()]",
      "source.pending_ids()",
    ].join("\n");
    const analysis = await analyze("python", "pkg/caller.py", source, new Map([
      ["pkg/caller.py", source],
      ["pkg/sources.py", "def pending_ids(): return []\ndef items(): return []\n"],
    ]));

    expect(analysis.accesses.map((access) => access.shadow?.shadowKind ?? "resolved")).toEqual([
      "comprehension_binding", "resolved", "resolved",
    ]);
    expect(analysis.diagnostics).toEqual([
      expect.objectContaining({ binding: "source", shadowKind: "comprehension_binding" }),
    ]);

    const nestedSource = [
      "import pkg.sources as source",
      "[source.pending_ids() for value in values for source in source.items()]",
    ].join("\n");
    const nested = await analyze("python", "pkg/nested.py", nestedSource, new Map([
      ["pkg/nested.py", nestedSource],
      ["pkg/sources.py", "def pending_ids(): return []\ndef items(): return []\n"],
    ]));
    expect(nested.accesses.map((access) => access.shadow?.shadowKind ?? "resolved")).toEqual([
      "comprehension_binding", "comprehension_binding",
    ]);
  });

  it("keeps Python comprehension walrus targets in the enclosing function scope", async () => {
    const source = [
      "import pkg.sources as source",
      "def rebind(values):",
      "    source.pending_ids()",
      "    [(source := value) for value in values]",
      "    source.pending_ids()",
      "source.pending_ids()",
    ].join("\n");
    const analysis = await analyze("python", "pkg/caller.py", source, new Map([
      ["pkg/caller.py", source],
      ["pkg/sources.py", "def pending_ids(): return []\n"],
    ]));

    expect(analysis.accesses.map((access) => access.shadow?.shadowKind ?? "resolved")).toEqual([
      "local_binding", "local_binding", "resolved",
    ]);
    expect(analysis.diagnostics).toEqual([
      expect.objectContaining({ binding: "source", shadowKind: "local_binding" }),
    ]);
  });

  it("resolves Rust crate/self/super aliases and declaration-point shadows", async () => {
    const source = [
      "use crate::sources as imported;",
      "fn outer() {",
      "    imported::pending_ids();",
      "    let imported = local;",
      "    imported::pending_ids();",
      "}",
      "fn sibling() { imported::pending_ids(); }",
      "fn item_shadow() { imported::pending_ids(); struct imported; }",
    ].join("\n");
    const analysis = await analyze("rust", "src/cli.rs", source, new Map([
      ["Cargo.toml", "[package]\nname='demo'"], ["src/cli.rs", source],
      ["src/sources.rs", "pub fn pending_ids() {}"],
    ]));

    expect(analysis.bindings).toEqual([expect.objectContaining({ name: "imported", targetFilePath: "src/sources.rs" })]);
    expect(analysis.accesses.map((access) => access.shadow?.shadowKind ?? "resolved")).toEqual([
      "resolved", "resolved", "resolved", "type_declaration",
    ]);

    const nested = "use self::local as child; use super::sources as parent; fn call(){ child::run(); parent::pending_ids(); }";
    const nestedAnalysis = await analyze("rust", "src/nested/mod.rs", nested, new Map([
      ["Cargo.toml", "[package]\nname='demo'"], ["src/nested/mod.rs", nested],
      ["src/nested/local.rs", "pub fn run() {}"], ["src/sources.rs", "pub fn pending_ids() {}"],
    ]));
    expect(nestedAnalysis.bindings).toEqual([
      expect.objectContaining({ name: "child", targetFilePath: "src/nested/local.rs" }),
      expect.objectContaining({ name: "parent", targetFilePath: "src/sources.rs" }),
    ]);

    const siblingModule = "use self::client as child; fn call(){ child::run(); }";
    const siblingAnalysis = await analyze("rust", "src/network.rs", siblingModule, new Map([
      ["Cargo.toml", "[package]\nname='demo'"], ["src/network.rs", siblingModule],
      ["src/network/client.rs", "pub fn run() {}"],
    ]));
    expect(siblingAnalysis.bindings).toEqual([
      expect.objectContaining({ name: "child", targetFilePath: "src/network/client.rs" }),
    ]);

    const childModule = "use super::sources as parent; fn call(){ parent::pending_ids(); }";
    const childAnalysis = await analyze("rust", "src/network/client.rs", childModule, new Map([
      ["Cargo.toml", "[package]\nname='demo'"], ["src/network/client.rs", childModule],
      ["src/network/sources.rs", "pub fn pending_ids() {}"],
    ]));
    expect(childAnalysis.bindings).toEqual([
      expect.objectContaining({ name: "parent", targetFilePath: "src/network/sources.rs" }),
    ]);
  });

  it("resolves Rust module members in qualified type positions", async () => {
    const source = "use crate::api; fn call(value: api::Target) { api::run(); }";
    const analysis = await analyze("rust", "src/caller.rs", source, new Map([
      ["Cargo.toml", "[package]\nname='qualified'\n"],
      ["src/caller.rs", source],
      ["src/api.rs", "pub struct Target; pub fn run() {}\n"],
    ]));

    expect(analysis.accesses.map((access) => [access.member, access.targetFilePath])).toEqual([
      ["Target", "src/api.rs"],
      ["run", "src/api.rs"],
    ]);
  });

  it("resolves external Rust module declarations as qualified bindings", async () => {
    const source = [
      "mod api;",
      "fn call(value: api::Target) { api::run(); }",
      "mod nested { mod child; fn call() { child::run(); } }",
    ].join("\n");
    const analysis = await analyze("rust", "src/lib.rs", source, new Map([
      ["Cargo.toml", "[package]\nname='qualified'\n"],
      ["src/lib.rs", source],
      ["src/api.rs", "pub struct Target; pub fn run() {}\n"],
      ["src/nested/child.rs", "pub fn run() {}\n"],
    ]));

    expect(analysis.bindings).toEqual([
      expect.objectContaining({ name: "api", targetFilePath: "src/api.rs" }),
      expect.objectContaining({ name: "child", targetFilePath: "src/nested/child.rs" }),
    ]);
    expect(analysis.accesses.map((access) => [access.member, access.targetFilePath])).toEqual([
      ["Target", "src/api.rs"],
      ["run", "src/api.rs"],
      ["run", "src/nested/child.rs"],
    ]);
  });

  it("resolves grouped Rust module imports without admitting unresolved leaves", async () => {
    const source = [
      "use crate::{sources as grouped};",
      "use crate::{sources};",
      "use crate::sources::{self as scoped, pending};",
      "use crate::{missing as unresolved};",
      "fn call() { grouped::pending(); sources::pending(); scoped::pending(); unresolved::pending(); }",
    ].join("\n");
    const analysis = await analyze("rust", "src/caller.rs", source, new Map([
      ["Cargo.toml", "[package]\nname='demo'"],
      ["src/caller.rs", source],
      ["src/sources.rs", "pub fn pending() {}"],
    ]));

    expect(analysis.bindings).toEqual([
      expect.objectContaining({ name: "grouped", targetFilePath: "src/sources.rs" }),
      expect.objectContaining({ name: "sources", targetFilePath: "src/sources.rs" }),
      expect.objectContaining({ name: "scoped", targetFilePath: "src/sources.rs" }),
    ]);
    expect(analysis.accesses.map((access) => [access.binding, access.member])).toEqual([
      ["grouped", "pending"],
      ["sources", "pending"],
      ["scoped", "pending"],
    ]);
  });

  it("marks aliases to possible inline Rust modules unresolved at their owner file", async () => {
    const source = "use crate::sources::nested as api; fn call() { api::pending(); }";
    const analysis = await analyze("rust", "src/caller.rs", source, new Map([
      ["Cargo.toml", "[package]\nname='demo'"],
      ["src/caller.rs", source],
      ["src/sources.rs", "pub mod nested { pub fn pending() {} }"],
    ]));

    expect(analysis.accesses).toEqual([]);
    expect(analysis.unresolvedAccesses).toEqual([
      expect.objectContaining({
        binding: "api",
        member: "pending",
        targetFilePath: "src/sources.rs",
      }),
    ]);
  });

  it("resolves Rust self and super through enclosing inline modules", async () => {
    const source = [
      "mod nested {",
      "    mod client;",
      "    use self::client as local;",
      "    mod deeper {",
      "        use super::client as parent;",
      "        fn call() { parent::run(); }",
      "    }",
      "    fn call() { local::run(); }",
      "}",
    ].join("\n");
    const analysis = await analyze("rust", "src/network.rs", source, new Map([
      ["Cargo.toml", "[package]\nname='demo'"],
      ["src/network.rs", source],
      ["src/network/nested/client.rs", "pub fn run() {}"],
      ["src/network/client.rs", "pub fn run() {}"],
      ["src/client.rs", "pub fn run() {}"],
    ]));

    expect(analysis.bindings).toEqual([
      expect.objectContaining({ name: "local", targetFilePath: "src/network/nested/client.rs" }),
      expect.objectContaining({ name: "parent", targetFilePath: "src/network/nested/client.rs" }),
      expect.objectContaining({ name: "client", targetFilePath: "src/network/nested/client.rs" }),
    ]);
    expect(analysis.accesses.map((access) => access.targetFilePath)).toEqual([
      "src/network/nested/client.rs", "src/network/nested/client.rs",
    ]);
  });

  it("confines Rust import bindings to their enclosing inline modules", async () => {
    const source = [
      "mod alpha {",
      "    mod client;",
      "    use self::client as api;",
      "    fn call() { api::run(); }",
      "}",
      "mod beta {",
      "    mod client;",
      "    use self::client as api;",
      "    fn call() { api::run(); }",
      "}",
    ].join("\n");
    const analysis = await analyze("rust", "src/network.rs", source, new Map([
      ["Cargo.toml", "[package]\nname='demo'"],
      ["src/network.rs", source],
      ["src/network/alpha/client.rs", "pub fn run() {}"],
      ["src/network/beta/client.rs", "pub fn run() {}"],
    ]));

    expect(analysis.accesses.map((access) => access.targetFilePath)).toEqual([
      "src/network/alpha/client.rs", "src/network/beta/client.rs",
    ]);
  });

  it("anchors Rust crate imports at Cargo auto-target roots", async () => {
    const source = "use crate::sources as src; fn call(){ src::pending(); }";
    const files = new Map([
      ["Cargo.toml", "[package]\nname='demo'"],
      ["src/sources.rs", "pub fn pending() {}"],
      ["src/library.rs", source],
      ["src/bin/cli.rs", source],
      ["src/bin/sources.rs", "pub fn pending() {}"],
      ["src/bin/admin/main.rs", source],
      ["src/bin/admin/sources.rs", "pub fn pending() {}"],
    ]);

    const library = await analyze("rust", "src/library.rs", source, files);
    const flatBinary = await analyze("rust", "src/bin/cli.rs", source, files);
    const directoryBinary = await analyze("rust", "src/bin/admin/main.rs", source, files);
    expect(library.bindings).toEqual([
      expect.objectContaining({ targetFilePath: "src/sources.rs" }),
    ]);
    expect(flatBinary.bindings).toEqual([
      expect.objectContaining({ targetFilePath: "src/bin/sources.rs" }),
    ]);
    expect(directoryBinary.bindings).toEqual([
      expect.objectContaining({ targetFilePath: "src/bin/admin/sources.rs" }),
    ]);
  });

  it("hoists Rust block item shadows and recognizes first-party local imports", async () => {
    const source = [
      "use crate::sources as src;",
      "fn const_shadow() { src::pending(); const src: usize = 0; src::pending(); }",
      "fn static_shadow() { src::pending(); static src: usize = 0; src::pending(); }",
      "fn union_shadow() { src::pending(); union src { value: usize } src::pending(); }",
      "fn trait_shadow() { src::pending(); trait src {} src::pending(); }",
      "fn module_shadow() { src::pending(); mod src {} src::pending(); }",
      "fn use_shadow() { src::pending(); use crate::other as src; src::pending(); }",
    ].join("\n");
    const analysis = await analyze("rust", "src/caller.rs", source, new Map([
      ["Cargo.toml", "[package]\nname='x'"], ["src/caller.rs", source],
      ["src/sources.rs", "pub fn pending() {}"], ["src/other.rs", "pub fn pending() {}"],
    ]));

    expect(analysis.accesses.map((access) => access.shadow?.shadowKind ?? "resolved")).toEqual([
      "resolved", "resolved",
      "resolved", "resolved",
      "type_declaration", "type_declaration",
      "type_declaration", "type_declaration",
      "module_declaration", "module_declaration",
      "resolved", "resolved",
    ]);
  });

  it("resolves first-party Rust block imports and conservatively shadows unresolved ones", async () => {
    const source = [
      "use crate::sources as src;",
      "fn local() { src::pending(); use crate::other as src; src::pending(); }",
      "fn external() { use serde::json as src; src::pending(); }",
      "fn sibling() { src::pending(); }",
    ].join("\n");
    const analysis = await analyze("rust", "src/caller.rs", source, new Map([
      ["Cargo.toml", "[package]\nname='x'"],
      ["src/caller.rs", source],
      ["src/sources.rs", "pub fn pending() {}"],
      ["src/other.rs", "pub fn pending() {}"],
    ]));

    expect(analysis.accesses.map((access) => [
      access.targetFilePath,
      access.shadow?.shadowKind ?? "resolved",
    ])).toEqual([
      ["src/other.rs", "resolved"],
      ["src/other.rs", "resolved"],
      ["src/sources.rs", "import_declaration"],
      ["src/sources.rs", "resolved"],
    ]);
    expect(analysis.diagnostics).toEqual([
      expect.objectContaining({ binding: "src", targetFilePath: "src/sources.rs", shadowKind: "import_declaration" }),
    ]);
  });

  it("extracts Rust closure parameter patterns without shadowing siblings", async () => {
    const source = [
      "use crate::sources as src;",
      "fn outer() {",
      "    let direct = |src| src::pending();",
      "    let tuple = |(src, other)| src::pending();",
      "    src::pending();",
      "}",
    ].join("\n");
    const analysis = await analyze("rust", "src/caller.rs", source, new Map([
      ["Cargo.toml", "[package]\nname='x'"],
      ["src/caller.rs", source],
      ["src/sources.rs", "pub fn pending() {}"],
    ]));

    expect(analysis.accesses.map((access) => access.shadow?.shadowKind ?? "resolved")).toEqual([
      "resolved", "resolved", "resolved",
    ]);
  });

  it("scopes Rust conditional pattern bindings to their branch and loop bodies", async () => {
    const source = [
      "use crate::sources as src;",
      "fn branch(value: Option<usize>) { if let Some(src) = value { src::pending(); } src::pending(); }",
      "fn looping(mut value: Option<usize>) { while let Some(src) = value { src::pending(); value = None; } src::pending(); }",
    ].join("\n");
    const analysis = await analyze("rust", "src/caller.rs", source, new Map([
      ["Cargo.toml", "[package]\nname='x'"], ["src/caller.rs", source],
      ["src/sources.rs", "pub fn pending() {}"],
    ]));

    expect(analysis.accesses.map((access) => access.shadow?.shadowKind ?? "resolved")).toEqual([
      "resolved", "resolved", "resolved", "resolved",
    ]);
  });

  it("shadows Rust module paths with type items and generic type parameters", async () => {
    const source = [
      "use crate::sources as api;",
      "fn generic<api>() { api::pending(); }",
      "fn type_item() { api::pending(); type api = usize; api::pending(); }",
      "fn value_items(api: usize) { api::pending(); let api = 1; api::pending(); fn api() {} api::pending(); }",
    ].join("\n");
    const analysis = await analyze("rust", "src/caller.rs", source, new Map([
      ["Cargo.toml", "[package]\nname='x'"],
      ["src/caller.rs", source],
      ["src/sources.rs", "pub fn pending() {}\n"],
    ]));

    expect(analysis.accesses.map((access) => access.shadow?.shadowKind ?? "resolved")).toEqual([
      "type_declaration",
      "type_declaration", "type_declaration",
      "resolved", "resolved", "resolved",
    ]);
  });

  it("confines Rust type-item shadows to their inline module declaration list", async () => {
    const source = [
      "use crate::sources as api;",
      "mod first { struct api; fn call() { api::pending(); } }",
      "mod second { fn call() { api::pending(); } }",
    ].join("\n");
    const analysis = await analyze("rust", "src/caller.rs", source, new Map([
      ["Cargo.toml", "[package]\nname='x'"],
      ["src/caller.rs", source],
      ["src/sources.rs", "pub fn pending() {}\n"],
    ]));

    expect(analysis.accesses.map((access) => access.shadow?.shadowKind ?? "resolved")).toEqual([
      "type_declaration", "resolved",
    ]);
  });

  it("anchors Go imports in go.mod and requires one exported declaration", async () => {
    const source = [
      "package cli",
      'import src "example.com/project/matcher/sources"',
      "func outer() { src.PendingIDs(); src.Other() }",
      "func shadow(src int) { src.PendingIDs() }",
      "func local() { src.PendingIDs(); src := value; src.PendingIDs() }",
      "func sibling() { src.PendingIDs() }",
    ].join("\n");
    const files = new Map([
      ["go.mod", 'module "example.com/project"\n'], ["cli/main.go", source],
      ["matcher/sources/pending.go", "package sources\nfunc PendingIDs() {}\nfunc Other() {}\n"],
      ["matcher/sources/duplicate.go", "package sources\nfunc Other() {}\n"],
    ]);
    const analysis = await analyze("go", "cli/main.go", source, files);

    expect(analysis.accesses.map((access) => [access.member, access.targetFilePath, access.shadow?.shadowKind ?? "resolved"])).toEqual([
      ["PendingIDs", "matcher/sources/pending.go", "resolved"],
      ["PendingIDs", "matcher/sources/pending.go", "parameter"],
      ["PendingIDs", "matcher/sources/pending.go", "resolved"],
      ["PendingIDs", "matcher/sources/pending.go", "local_binding"],
      ["PendingIDs", "matcher/sources/pending.go", "resolved"],
    ]);
    expect(analysis.accesses.some((access) => access.member === "Other")).toBe(false);
  });

  it("limits Go initializer bindings to their control-statement scopes", async () => {
    const source = [
      "package cli",
      'import src "example.com/project/sources"',
      "func ifShadow() { if src := local; ok { src.PendingIDs() }; src.PendingIDs() }",
      "func switchShadow() { switch src := local; value { case 1: src.PendingIDs() }; src.PendingIDs() }",
    ].join("\n");
    const analysis = await analyze("go", "cli/main.go", source, new Map([
      ["go.mod", "module example.com/project\n"], ["cli/main.go", source],
      ["sources/pending.go", "package sources\nfunc PendingIDs() {}\n"],
    ]));

    expect(analysis.accesses.map((access) => access.shadow?.shadowKind ?? "resolved")).toEqual([
      "local_binding", "resolved", "local_binding", "resolved",
    ]);
  });

  it("scopes Go select and type-switch bindings without suppressing siblings", async () => {
    const source = [
      "package cli",
      'import src "example.com/project/sources"',
      "func selectShadow(ch chan int) { select { case src := <-ch: src.PendingIDs(); default: }; src.PendingIDs() }",
      "func typeShadow(value any) { switch src := value.(type) { case int: src.PendingIDs() }; src.PendingIDs() }",
    ].join("\n");
    const analysis = await analyze("go", "cli/main.go", source, new Map([
      ["go.mod", "module example.com/project\n"], ["cli/main.go", source],
      ["sources/pending.go", "package sources\nfunc PendingIDs() {}\n"],
    ]));

    expect(analysis.accesses.map((access) => access.shadow?.shadowKind ?? "resolved")).toEqual([
      "pattern_binding", "resolved", "pattern_binding", "resolved",
    ]);
    expect(analysis.diagnostics).toEqual([
      expect.objectContaining({ binding: "src", shadowKind: "pattern_binding" }),
      expect.objectContaining({ binding: "src", shadowKind: "pattern_binding" }),
    ]);
  });

  it("limits Go declarations to implicit switch and select clause scopes", async () => {
    const source = [
      "package cli",
      'import src "example.com/project/sources"',
      "func switchShadow(value int) { switch value { case 1: src := local; src.PendingIDs() }; src.PendingIDs() }",
      "func selectShadow() { select { default: src := local; src.PendingIDs() }; src.PendingIDs() }",
    ].join("\n");
    const analysis = await analyze("go", "cli/main.go", source, new Map([
      ["go.mod", "module example.com/project\n"], ["cli/main.go", source],
      ["sources/pending.go", "package sources\nfunc PendingIDs() {}\n"],
    ]));

    expect(analysis.accesses.map((access) => access.shadow?.shadowKind ?? "resolved")).toEqual([
      "local_binding", "resolved", "local_binding", "resolved",
    ]);
  });

  it("treats local Go constants as declaration-point block shadows", async () => {
    const source = [
      "package cli",
      'import src "example.com/project/sources"',
      "func single() { src.PendingIDs(); const src = 1; src.PendingIDs() }",
      "func grouped() { const ( other = 1; src = 2 ); src.PendingIDs() }",
      "func sibling() { src.PendingIDs() }",
    ].join("\n");
    const analysis = await analyze("go", "cli/main.go", source, new Map([
      ["go.mod", "module example.com/project\n"], ["cli/main.go", source],
      ["sources/pending.go", "package sources\nfunc PendingIDs() {}\n"],
    ]));

    expect(analysis.accesses.map((access) => access.shadow?.shadowKind ?? "resolved")).toEqual([
      "resolved", "local_binding", "local_binding", "resolved",
    ]);
  });

  it("uses the declared Go package name when an import has no local alias", async () => {
    const source = "package cli\nimport \"example.com/project/v2/client\"\nfunc call(){ service.Run() }";
    const analysis = await analyze("go", "cli/main.go", source, new Map([
      ["go.mod", "module example.com/project\n"], ["cli/main.go", source],
      ["v2/client/client.go", "package service\nfunc Run() {}\n"],
    ]));
    expect(analysis.bindings).toEqual([expect.objectContaining({ name: "service", packageDirectory: "v2/client" })]);
    expect(analysis.accesses).toEqual([expect.objectContaining({ member: "Run", targetFilePath: "v2/client/client.go" })]);
  });

  it("resolves every exported name in a grouped Go declaration", async () => {
    const source = "package cli\nimport values \"example.com/project/values\"\nfunc call(){ values.Beta() }";
    const analysis = await analyze("go", "cli/main.go", source, new Map([
      ["go.mod", "module example.com/project\n"],
      ["cli/main.go", source],
      ["values/values.go", "package values\nvar Alpha, Beta = 1, 2\n"],
    ]));

    expect(analysis.accesses).toEqual([
      expect.objectContaining({ member: "Beta", targetFilePath: "values/values.go" }),
    ]);
  });

  it("binds Go shadow diagnostics to the accessed declaration file", async () => {
    const source = [
      "package cli",
      'import src "example.com/project/sources"',
      "func shadow(src int){ src.Zed() }",
    ].join("\n");
    const analysis = await analyze("go", "cli/main.go", source, new Map([
      ["go.mod", "module example.com/project\n"],
      ["cli/main.go", source],
      ["sources/a.go", "package sources\nfunc Alpha() {}\n"],
      ["sources/z.go", "package sources\nfunc Zed() {}\n"],
    ]));

    expect(analysis.diagnostics).toEqual([
      expect.objectContaining({ binding: "src", targetFilePath: "sources/z.go", shadowKind: "parameter" }),
    ]);
  });

  it("uses a deterministic package file for Go shadows without a resolved selector", async () => {
    const source = [
      "package cli",
      'import src "example.com/project/sources"',
      "func shadow(src int){ src.Missing() }",
    ].join("\n");
    const analysis = await analyze("go", "cli/main.go", source, new Map([
      ["go.mod", "module example.com/project\n"],
      ["cli/main.go", source],
      ["sources/a.go", "package sources\nfunc Alpha() {}\n"],
      ["sources/z.go", "package sources\nfunc Zed() {}\n"],
    ]));

    expect(analysis.accesses).toEqual([]);
    expect(analysis.diagnostics).toEqual([
      expect.objectContaining({ binding: "src", targetFilePath: "sources/a.go", shadowKind: "parameter" }),
    ]);
  });

  it("uses the Go package directory for shadows when the package has no files", async () => {
    const source = [
      "package cli",
      'import src "example.com/project/missing"',
      "func shadow(src int){ src.Pending() }",
    ].join("\n");
    const analysis = await analyze("go", "cli/main.go", source, new Map([
      ["go.mod", "module example.com/project\n"],
      ["cli/main.go", source],
    ]));

    expect(analysis.accesses).toEqual([]);
    expect(analysis.diagnostics).toEqual([
      expect.objectContaining({ binding: "src", targetFilePath: "missing", shadowKind: "parameter" }),
    ]);
  });

  it("ignores external Go imports and packages without a unique declaration", async () => {
    const source = [
      "package cli",
      'import external "example.net/external"',
      'import src "example.com/project/matcher/sources"',
      "func run() { external.PendingIDs(); src.PendingIDs() }",
    ].join("\n");
    const analysis = await analyze("go", "cli/main.go", source, new Map([
      ["go.mod", "module example.com/project\n"], ["cli/main.go", source],
      ["matcher/sources/a.go", "package sources\nfunc PendingIDs() {}\n"],
      ["matcher/sources/b.go", "package sources\nfunc PendingIDs() {}\n"],
    ]));

    expect(analysis.bindings.map((binding) => binding.name)).toEqual(["src"]);
    expect(analysis.accesses).toEqual([]);
  });
});
