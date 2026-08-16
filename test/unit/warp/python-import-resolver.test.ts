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
      "sym:package/module.py:other",
      "sym:package/module.py:symbol",
    ]);
    expect(result.edges.filter((edge) => edge.label === "resolves_to").map((edge) => edge.to).sort()).toEqual([
      "file:package/__init__.py",
      "file:package/module.py",
      "file:package/wild.py",
    ]);
    expect(result.metadata).toEqual([
      { importedName: "child", localName: "child", filePath: "consumer.py" },
      { importedName: "other", localName: "local_other", filePath: "consumer.py" },
      { importedName: "symbol", localName: "symbol", filePath: "consumer.py" },
    ]);
  });

  it("resolves single and parent relative imports from the importing package", async () => {
    const result = await resolveEdges(
      "python",
      "app/alpha/cli.py",
      "from .sources import pending_ids\nfrom ..beta.cli import profile\n",
      ["app/alpha/sources.py", "app/beta/cli.py"],
      resolvePythonImportEdges,
    );

    expect(result.edges.filter((edge) => edge.label === "references").map((edge) => edge.to).sort()).toEqual([
      "sym:app/alpha/sources.py:pending_ids",
      "sym:app/beta/cli.py:profile",
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

  it("resolves first-party modules and package children declared only by Python stubs", async () => {
    const result = await resolveEdges(
      "python",
      "consumer.py",
      "import package.direct as direct\nfrom package.module import symbol\nfrom package import child\n",
      ["package/direct.pyi", "package/module.pyi", "package/__init__.pyi", "package/child.pyi"],
      resolvePythonImportEdges,
    );

    expect(result.edges.filter((edge) => edge.label === "references").map((edge) => edge.to).sort()).toEqual([
      "file:package/child.pyi",
      "file:package/direct.pyi",
      "sym:package/module.pyi:symbol",
    ]);
    expect(result.edges.filter((edge) => edge.label === "resolves_to").map((edge) => edge.to).sort()).toEqual([
      "file:package/__init__.pyi",
      "file:package/direct.pyi",
      "file:package/module.pyi",
    ]);
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
    expect(result.edges.map(({ label, to }) => ({ label, to }))).toEqual([
      { label: "references", to: "file:src/whole.ts" },
      { label: "resolves_to", to: "file:src/module.ts" },
      { label: "resolves_to", to: "file:src/whole.ts" },
      { label: "references", to: "sym:src/module.ts:named" },
    ]);
    expect(result.edges.every((edge) => edge.from.startsWith("ast:src/consumer.ts:"))).toBe(true);
    expect(result.metadata).toEqual([
      { importedName: "*", localName: "namespace", filePath: "src/consumer.ts" },
      { importedName: "named", localName: "local", filePath: "src/consumer.ts" },
    ]);
  });

  it("indexes Python caller edges for downstream reference counting", async () => {
    const cwd = createTestRepo("warp-python-index-");
    try {
      fs.mkdirSync(path.join(cwd, "app", "alpha"), { recursive: true });
      fs.mkdirSync(path.join(cwd, "app", "beta"), { recursive: true });
      fs.writeFileSync(path.join(cwd, "app", "alpha", "sources.py"), "def pending_ids():\n    return []\n");
      fs.writeFileSync(path.join(cwd, "app", "beta", "cli.py"), "from app.alpha.sources import pending_ids\npending_ids()\n");
      git(cwd, "add -A");
      git(cwd, "commit -m python-imports");

      const warp = await openWarp({ cwd });
      const ctx: WarpContext = { app: warp, strandId: null };
      await indexHead({ cwd, git: nodeGit, pathOps: nodePathOps, ctx });
      await warp.core().materialize();

      const refs = await referencesForSymbol(ctx, "pending_ids", "app/alpha/sources.py");
      expect(refs).toEqual([{ filePath: "app/beta/cli.py", importedName: "pending_ids", localName: "pending_ids" }]);
    } finally {
      cleanupTestRepo(cwd);
    }
  });

  it("resolves qualified module members to their symbols without duplicate call edges", async () => {
    const cwd = createTestRepo("warp-python-members-");
    try {
      const warp = await openWarp({ cwd });
      const parsed = parseStructuredTree("python", "from app.alpha import sources\nsources.pending_ids([], root)\nvalue = sources.scan_survivors\n");
      try {
        await warp.patch((patch) => {
          patch.addNode("file:app/alpha/__init__.py");
          patch.addNode("file:app/alpha/sources.py");
          patch.addNode("sym:app/alpha/sources.py:pending_ids");
          patch.addNode("sym:app/alpha/sources.py:scan_survivors");
          resolvePythonImportEdges(patch, "app/alpha/cli.py", parsed.root, nodePathOps, new Set([
            "app/alpha/__init__.py",
            "app/alpha/sources.py",
          ]));
          resolveQualifiedReferenceEdges(patch, "python", "app/alpha/cli.py", parsed.root, {
            pathOps: nodePathOps,
            knownFiles: new Set(["app/alpha/__init__.py", "app/alpha/sources.py"]),
          }, false);
        });
      } finally {
        parsed.delete();
      }
      await warp.core().materialize();
      const observer = await warp.observer({ match: ["ast:*", "file:*", "sym:*"] });
      const edges = await observer.getEdges();
      expect(edges.filter((edge) => edge.label === "references").map((edge) => edge.to).sort()).toEqual([
        "file:app/alpha/sources.py",
        "sym:app/alpha/sources.py:pending_ids",
        "sym:app/alpha/sources.py:scan_survivors",
      ]);
    } finally {
      cleanupTestRepo(cwd);
    }
  });
});
