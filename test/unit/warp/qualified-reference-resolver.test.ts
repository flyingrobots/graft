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
      "resolved", "parameter", "local_binding", "resolved", "resolved", "resolved",
    ]);
    expect(analysis.diagnostics.map((diagnostic) => diagnostic.binding)).toEqual(["sources", "sources"]);
  });

  it("resolves nested Python imports within their lexical scopes", async () => {
    const source = [
      "import pkg.outer as source",
      "def nested():",
      "    import pkg.inner as source",
      "    source.pending_ids()",
      "source.pending_ids()",
    ].join("\n");
    const analysis = await analyze("python", "pkg/caller.py", source, new Map([
      ["pkg/caller.py", source],
      ["pkg/outer.py", "def pending_ids(): return []"],
      ["pkg/inner.py", "def pending_ids(): return []"],
    ]));

    expect(analysis.accesses.map((access) => access.targetFilePath)).toEqual([
      "pkg/inner.py",
      "pkg/outer.py",
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

  it("confines comprehension, loop, catch, range, and pattern bindings to their lexical regions", async () => {
    const python = "import pkg.sources as src\nvalues = [src.pending_ids() for src in items]\nsrc.pending_ids()\n";
    const pythonAnalysis = await analyze("python", "caller.py", python, new Map([
      ["caller.py", python], ["pkg/sources.py", "def pending_ids(): return []"],
    ]));
    expect(pythonAnalysis.accesses.map((access) => access.shadow?.shadowKind ?? "resolved")).toEqual(["comprehension_binding", "resolved"]);

    const typescript = 'import * as api from "./api"; for (const api of xs) { api.build(); } try {} catch (api) { api.build(); } api.build();';
    const tsAnalysis = await analyze("ts", "src/caller.ts", typescript, new Map([
      ["src/caller.ts", typescript], ["src/api.ts", "export function build() {}"],
    ]));
    expect(tsAnalysis.accesses.map((access) => access.shadow?.shadowKind ?? "resolved")).toEqual(["loop_binding", "catch_binding", "resolved"]);

    const rust = "use crate::sources as src; fn f(){ for src in xs { src::pending(); } match x { src => src::pending(), _ => {} } src::pending(); }";
    const rustAnalysis = await analyze("rust", "src/caller.rs", rust, new Map([
      ["Cargo.toml", "[package]\nname='x'"], ["src/caller.rs", rust], ["src/sources.rs", "pub fn pending() {}"],
    ]));
    expect(rustAnalysis.accesses.map((access) => access.shadow?.shadowKind ?? "resolved")).toEqual(["pattern_binding", "pattern_binding", "resolved"]);

    const go = "package p\nimport src \"example.com/p/sources\"\nfunc f(){ for _, src := range xs { src.Pending() }; src.Pending() }";
    const goAnalysis = await analyze("go", "caller.go", go, new Map([
      ["go.mod", "module example.com/p\n"], ["caller.go", go], ["sources/pending.go", "package sources\nfunc Pending() {}"],
    ]));
    expect(goAnalysis.accesses.map((access) => access.shadow?.shadowKind ?? "resolved")).toEqual(["range_binding", "resolved"]);
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
    ].join("\n");
    const analysis = await analyze("rust", "src/cli.rs", source, new Map([
      ["Cargo.toml", "[package]\nname='demo'"], ["src/cli.rs", source],
      ["src/sources.rs", "pub fn pending_ids() {}"],
    ]));

    expect(analysis.bindings).toEqual([expect.objectContaining({ name: "imported", targetFilePath: "src/sources.rs" })]);
    expect(analysis.accesses.map((access) => access.shadow?.shadowKind ?? "resolved")).toEqual([
      "resolved", "local_binding", "resolved",
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
      ["go.mod", "module example.com/project\n"], ["cli/main.go", source],
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

  it("uses the declared Go package name when an import has no local alias", async () => {
    const source = "package cli\nimport \"example.com/project/v2/client\"\nfunc call(){ service.Run() }";
    const analysis = await analyze("go", "cli/main.go", source, new Map([
      ["go.mod", "module example.com/project\n"], ["cli/main.go", source],
      ["v2/client/client.go", "package service\nfunc Run() {}\n"],
    ]));
    expect(analysis.bindings).toEqual([expect.objectContaining({ name: "service", packageDirectory: "v2/client" })]);
    expect(analysis.accesses).toEqual([expect.objectContaining({ member: "Run", targetFilePath: "v2/client/client.go" })]);
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
