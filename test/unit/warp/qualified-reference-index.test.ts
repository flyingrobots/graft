import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { nodeGit } from "../../../src/adapters/node-git.js";
import { nodePathOps } from "../../../src/adapters/node-paths.js";
import { indexHead } from "../../../src/warp/index-head.js";
import { openWarp } from "../../../src/warp/open.js";
import { referencesForSymbol } from "../../../src/warp/references.js";
import type { WarpContext } from "../../../src/warp/context.js";
import { cleanupTestRepo, createTestRepo, git } from "../../helpers/git.js";

function write(repo: string, filePath: string, content: string): void {
  const absolute = path.join(repo, filePath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, content);
}

async function indexedReferences(
  files: Readonly<Record<string, string>>,
  symbol: string,
  targetFilePath: string,
) {
  const cwd = createTestRepo("warp-qualified-index-");
  try {
    for (const [filePath, content] of Object.entries(files)) write(cwd, filePath, content);
    git(cwd, "add -A");
    git(cwd, "commit -m qualified-reference-fixture");
    const warp = await openWarp({ cwd });
    const ctx: WarpContext = { app: warp, strandId: null };
    await indexHead({ cwd, git: nodeGit, pathOps: nodePathOps, ctx });
    await warp.core().materialize();
    return {
      symbol: await referencesForSymbol(ctx, symbol, targetFilePath),
      importedFile: await referencesForSymbol(ctx, "*", targetFilePath),
    };
  } finally {
    cleanupTestRepo(cwd);
  }
}

describe("qualified reference WARP indexing", { timeout: 20_000 }, () => {
  it("indexes Python module members and suppresses function-local shadows", async () => {
    const refs = await indexedReferences({
      "pkg/sources.py": "def pending_ids(): return []\n",
      "pkg/caller.py": [
        "import pkg.sources as source",
        "source.pending_ids()",
        "def shadowed():",
        "    source.pending_ids()",
        "    source = object()",
      ].join("\n"),
    }, "pending_ids", "pkg/sources.py");
    expect(refs.symbol).toEqual([{ filePath: "pkg/caller.py", importedName: "pending_ids", localName: "pending_ids" }]);
    expect(refs.importedFile).toEqual([{ filePath: "pkg/caller.py", importedName: "*", localName: "source" }]);
  });

  it("indexes a child module imported from the current Python package", async () => {
    const refs = await indexedReferences({
      "pkg/sources.py": "def pending_ids(): return []\n",
      "pkg/caller.py": "from . import sources\nsources.pending_ids()\n",
    }, "pending_ids", "pkg/sources.py");

    expect(refs.symbol).toEqual([{ filePath: "pkg/caller.py", importedName: "pending_ids", localName: "pending_ids" }]);
    expect(refs.importedFile).toEqual([{ filePath: "pkg/caller.py", importedName: "sources", localName: "sources" }]);
  });

  it("indexes members through an unaliased dotted Python import", async () => {
    const refs = await indexedReferences({
      "pkg/sources.py": "def pending_ids(): return []\n",
      "pkg/caller.py": "import pkg.sources\npkg.sources.pending_ids()\n",
    }, "pending_ids", "pkg/sources.py");

    expect(refs.symbol).toEqual([{ filePath: "pkg/caller.py", importedName: "pending_ids", localName: "pending_ids" }]);
    expect(refs.importedFile).toEqual([{ filePath: "pkg/caller.py", importedName: "*", localName: "pkg" }]);
  });

  it("indexes TypeScript namespace members and suppresses parameter shadows", async () => {
    const refs = await indexedReferences({
      "src/api.ts": "export function buildThing(): void {}\n",
      "src/consumer.ts": [
        'import * as api from "./api";',
        "api.buildThing();",
        "function shadow(api: unknown) { api.buildThing(); }",
      ].join("\n"),
    }, "buildThing", "src/api.ts");
    expect(refs.symbol).toEqual([{ filePath: "src/consumer.ts", importedName: "buildThing", localName: "buildThing" }]);
    expect(refs.importedFile).toEqual([{ filePath: "src/consumer.ts", importedName: "*", localName: "api" }]);
  });

  it("indexes Rust module members and suppresses declaration-point shadows", async () => {
    const refs = await indexedReferences({
      "Cargo.toml": "[package]\nname='qualified'\nversion='0.1.0'\n",
      "src/sources.rs": "pub fn pending_ids() {}\n",
      "src/consumer.rs": [
        "use crate::sources as imported;",
        "pub fn caller() { imported::pending_ids(); }",
        "pub fn shadowed() { let imported = (); imported::pending_ids(); }",
      ].join("\n"),
    }, "pending_ids", "src/sources.rs");
    expect(refs.symbol).toEqual([{ filePath: "src/consumer.rs", importedName: "pending_ids", localName: "pending_ids" }]);
    expect(refs.importedFile).toEqual([{ filePath: "src/consumer.rs", importedName: "*", localName: "imported" }]);
  });

  it("indexes a Rust qualified type exactly once", async () => {
    const refs = await indexedReferences({
      "Cargo.toml": "[package]\nname='qualified'\nversion='0.1.0'\n",
      "src/api.rs": "pub struct Target;\n",
      "src/consumer.rs": "use crate::api; pub fn caller(value: api::Target) {}\n",
    }, "Target", "src/api.rs");

    expect(refs.symbol).toEqual([{ filePath: "src/consumer.rs", importedName: "Target", localName: "Target" }]);
    expect(refs.importedFile).toEqual([{ filePath: "src/consumer.rs", importedName: "*", localName: "api" }]);
  });

  it("indexes a Go selector only when go.mod ownership and declaration uniqueness agree", async () => {
    const refs = await indexedReferences({
      "go.mod": "module example.com/project\n",
      "matcher/sources/pending.go": "package sources\nfunc PendingIDs() {}\n",
      "cli/main.go": [
        "package cli",
        'import src "example.com/project/matcher/sources"',
        "func caller() { src.PendingIDs() }",
        "func shadowed(src int) { src.PendingIDs() }",
      ].join("\n"),
    }, "PendingIDs", "matcher/sources/pending.go");
    expect(refs.symbol).toEqual([{ filePath: "cli/main.go", importedName: "PendingIDs", localName: "PendingIDs" }]);
    expect(refs.importedFile).toEqual([{ filePath: "cli/main.go", importedName: "*", localName: "src" }]);
  });

  it("does not index Go selectors across a nested module boundary", async () => {
    const refs = await indexedReferences({
      "go.mod": "module example.com/root\n",
      "cli/main.go": [
        "package cli",
        'import nested "example.com/root/nested/pkg"',
        "func caller() { nested.Run() }",
      ].join("\n"),
      "nested/go.mod": "module other.example/nested\n",
      "nested/pkg/value.go": "package pkg\nfunc Run() {}\n",
    }, "Run", "nested/pkg/value.go");

    expect(refs.symbol).toEqual([]);
    expect(refs.importedFile).toEqual([]);
  });
});
