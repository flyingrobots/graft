import { describe, expect, it } from "vitest";
import { nodePathOps } from "../../../src/adapters/node-paths.js";
import { nodeGit } from "../../../src/adapters/node-git.js";
import { parseStructuredTree } from "../../../src/parser/runtime.js";
import { resolveImportEdges } from "../../../src/warp/ast-import-resolver.js";
import { emitAstNodes } from "../../../src/warp/ast-emitter.js";
import { openWarp } from "../../../src/warp/open.js";
import { resolvePythonImportEdges } from "../../../src/warp/python-import-resolver.js";
import { resolveQualifiedReferenceEdges } from "../../../src/warp/qualified-reference-resolver.js";
import { indexHead } from "../../../src/warp/index-head.js";
import { referencesForSymbol } from "../../../src/warp/references.js";
import type { WarpContext } from "../../../src/warp/context.js";
import { cleanupTestRepo, createTestRepo, git } from "../../helpers/git.js";
import * as fs from "node:fs";
import * as path from "node:path";

type Resolver = typeof resolveImportEdges;

async function resolveEdges(
  language: "python" | "ts",
  filePath: string,
  source: string,
  knownFiles: readonly string[],
  resolver: Resolver,
) {
  const cwd = createTestRepo("warp-python-import-");
  try {
    const warp = await openWarp({ cwd });
    const parsed = parseStructuredTree(language, source);
    try {
      await warp.patch((patch) => {
        patch.addNode(`file:${filePath}`);
        for (const knownFile of knownFiles) {
          patch.addNode(`file:${knownFile}`);
          for (const symbol of ["symbol", "other", "pending_ids", "scan_survivors", "format_scope_note", "profile", "named"]) {
            patch.addNode(`sym:${knownFile}:${symbol}`);
          }
        }
        emitAstNodes(patch, filePath, parsed.root);
        resolver(patch, filePath, parsed.root, nodePathOps, new Set(knownFiles));
      });
    } finally {
      parsed.delete();
    }

    await warp.core().materialize();
    const observer = await warp.observer({ match: ["ast:*", "file:*", "sym:*"] });
    const edges = await observer.getEdges();
    const nodes = await observer.getNodes();
    const metadata = await Promise.all(nodes.map(async (id) => [id, await observer.getNodeProps(id)] as const));
    return {
      edges: edges
        .filter((edge) => edge.label === "references" || edge.label === "resolves_to")
        .map((edge) => ({ from: edge.from, to: edge.to, label: edge.label }))
        .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right))),
      metadata: metadata
        .filter(([, properties]) => properties?.["importedName"] !== undefined)
        .map(([, properties]) => ({
          importedName: properties?.["importedName"],
          localName: properties?.["localName"],
          filePath: properties?.["filePath"],
        }))
        .sort((left, right) => `${String(left.importedName)}:${String(left.localName)}`.localeCompare(`${String(right.importedName)}:${String(right.localName)}`)),
    };
  } finally {
    cleanupTestRepo(cwd);
  }
}

describe("warp: Python import resolver", { timeout: 15000 }, () => {
  it("resolves direct, aliased, and multiple whole-module imports", async () => {
    const result = await resolveEdges(
      "python",
      "app.py",
      "import package.direct\nimport package.aliased as alias\nimport package.first, package.second\n",
      ["package/direct.py", "package/aliased.py", "package/first.py", "package/second.py"],
      resolvePythonImportEdges,
    );

    expect(result.edges.filter((edge) => edge.label === "references").map((edge) => edge.to).sort()).toEqual([
      "file:package/aliased.py",
      "file:package/direct.py",
      "file:package/first.py",
      "file:package/second.py",
    ]);
    expect(result.edges.filter((edge) => edge.label === "resolves_to")).toHaveLength(4);
    expect(result.metadata).toEqual([
      { importedName: "*", localName: "alias", filePath: "app.py" },
      { importedName: "*", localName: "package", filePath: "app.py" },
      { importedName: "*", localName: "package", filePath: "app.py" },
      { importedName: "*", localName: "package", filePath: "app.py" },
    ]);
  });

  it("resolves from imports, aliases, wildcards, and module-before-symbol ambiguity", async () => {
    const result = await resolveEdges(
      "python",
      "consumer.py",
      "from package.module import symbol, other as local_other\nfrom package import child\nfrom package.wild import *\n",
      ["package/module.py", "package/__init__.py", "package/child.py", "package/wild.py"],
      resolvePythonImportEdges,
    );

    expect(result.edges.filter((edge) => edge.label === "references").map((edge) => edge.to).sort()).toEqual([
      "file:package/child.py",
      "file:package/wild.py",
      "sym:package/module.py:other",
      "sym:package/module.py:symbol",
    ]);
    expect(result.edges.filter((edge) => edge.label === "resolves_to").map((edge) => edge.to).sort()).toEqual([
      "file:package/__init__.py",
      "file:package/module.py",
      "file:package/wild.py",
    ]);
    expect(result.metadata).toEqual([
      { importedName: "*", localName: "*", filePath: "consumer.py" },
      { importedName: "child", localName: "child", filePath: "consumer.py" },
      { importedName: "other", localName: "local_other", filePath: "consumer.py" },
      { importedName: "symbol", localName: "symbol", filePath: "consumer.py" },
    ]);
  });

  it("resolves single and parent relative imports from the importing package", async () => {
    const result = await resolveEdges(
      "python",
      "coqui/matcher/cli.py",
      "from .sources import pending_ids\nfrom ..dev_profiler.cli import profile\n",
      ["coqui/matcher/sources.py", "coqui/dev_profiler/cli.py"],
      resolvePythonImportEdges,
    );

    expect(result.edges.filter((edge) => edge.label === "references").map((edge) => edge.to).sort()).toEqual([
      "sym:coqui/dev_profiler/cli.py:profile",
      "sym:coqui/matcher/sources.py:pending_ids",
    ]);
  });

  it("emits no edge for stdlib or unresolvable first-party imports", async () => {
    const result = await resolveEdges(
      "python",
      "consumer.py",
      "import json\nfrom missing.module import typo\n",
      ["package/real.py"],
      resolvePythonImportEdges,
    );

    expect(result.edges).toEqual([]);
  });

  it("preserves the TypeScript resolver edge vocabulary byte-for-byte", async () => {
    const result = await resolveEdges(
      "ts",
      "src/consumer.ts",
      'import { named as local } from "./module"; import * as namespace from "./whole";',
      ["src/module.ts", "src/whole.ts"],
      resolveImportEdges,
    );

    expect(JSON.stringify(result)).toBe('{"edges":[{"from":"ast:src/consumer.ts:413c7c7e4515","to":"file:src/whole.ts","label":"references"},{"from":"ast:src/consumer.ts:5d68e1e6697b","to":"file:src/module.ts","label":"resolves_to"},{"from":"ast:src/consumer.ts:bfd46b79d5c9","to":"file:src/whole.ts","label":"resolves_to"},{"from":"ast:src/consumer.ts:e02cd5ad38a4","to":"sym:src/module.ts:named","label":"references"}],"metadata":[{"importedName":"*","localName":"namespace","filePath":"src/consumer.ts"},{"importedName":"named","localName":"local","filePath":"src/consumer.ts"}]}');
  });

  it("indexes Python caller edges for downstream reference counting", async () => {
    const cwd = createTestRepo("warp-python-index-");
    try {
      fs.mkdirSync(path.join(cwd, "coqui", "matcher"), { recursive: true });
      fs.mkdirSync(path.join(cwd, "coqui", "dev_profiler"), { recursive: true });
      fs.writeFileSync(path.join(cwd, "coqui", "matcher", "sources.py"), "def pending_ids():\n    return []\n");
      fs.writeFileSync(path.join(cwd, "coqui", "dev_profiler", "cli.py"), "from coqui.matcher.sources import pending_ids\npending_ids()\n");
      git(cwd, "add -A");
      git(cwd, "commit -m python-imports");

      const warp = await openWarp({ cwd });
      const ctx: WarpContext = { app: warp, strandId: null };
      await indexHead({ cwd, git: nodeGit, pathOps: nodePathOps, ctx });
      await warp.core().materialize();

      const refs = await referencesForSymbol(ctx, "pending_ids", "coqui/matcher/sources.py");
      expect(refs).toEqual([{ filePath: "coqui/dev_profiler/cli.py", importedName: "pending_ids", localName: "pending_ids" }]);
    } finally {
      cleanupTestRepo(cwd);
    }
  });

  it("resolves qualified module members to their symbols without duplicate call edges", async () => {
    const cwd = createTestRepo("warp-python-members-");
    try {
      const warp = await openWarp({ cwd });
      const parsed = parseStructuredTree("python", "from coqui.matcher import sources\nsources.pending_ids([], root)\nvalue = sources.scan_survivors\n");
      try {
        await warp.patch((patch) => {
          patch.addNode("file:coqui/matcher/__init__.py");
          patch.addNode("file:coqui/matcher/sources.py");
          patch.addNode("sym:coqui/matcher/sources.py:pending_ids");
          patch.addNode("sym:coqui/matcher/sources.py:scan_survivors");
          resolvePythonImportEdges(patch, "coqui/matcher/cli.py", parsed.root, nodePathOps, new Set([
            "coqui/matcher/__init__.py",
            "coqui/matcher/sources.py",
          ]));
          resolveQualifiedReferenceEdges(patch, "python", "coqui/matcher/cli.py", parsed.root, {
            pathOps: nodePathOps,
            knownFiles: new Set(["coqui/matcher/__init__.py", "coqui/matcher/sources.py"]),
          }, false);
        });
      } finally {
        parsed.delete();
      }
      await warp.core().materialize();
      const observer = await warp.observer({ match: ["ast:*", "file:*", "sym:*"] });
      const edges = await observer.getEdges();
      expect(edges.filter((edge) => edge.label === "references").map((edge) => edge.to).sort()).toEqual([
        "file:coqui/matcher/sources.py",
        "sym:coqui/matcher/sources.py:pending_ids",
        "sym:coqui/matcher/sources.py:scan_survivors",
      ]);
    } finally {
      cleanupTestRepo(cwd);
    }
  });
});
