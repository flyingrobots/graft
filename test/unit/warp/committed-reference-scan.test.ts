import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { nodeGit } from "../../../src/adapters/node-git.js";
import { nodePathOps } from "../../../src/adapters/node-paths.js";
import type { GitClient } from "../../../src/ports/git.js";
import {
  analyzeCommittedReferencesAtRef,
  importDiagnosticsAtRef,
  scanQualifiedReferencesAtRef,
} from "../../../src/warp/committed-reference-scan.js";
import { cleanupTestRepo, createTestRepo, git } from "../../helpers/git.js";

function write(repo: string, filePath: string, content: string): void {
  const absolute = path.join(repo, filePath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, content);
}

describe("committed qualified-reference scan", { timeout: 20_000 }, () => {
  it("counts Python, TypeScript, Rust, and Go callers at the exact ref", async () => {
    const cwd = createTestRepo("committed-qualified-scan-");
    try {
      const files = {
        "py/sources.py": "def pending_ids(): return []\n",
        "py/caller.py": "import py.sources as source\nsource.pending_ids()\n",
        "ts/api.ts": "export function buildThing() {}\n",
        "ts/caller.ts": 'import * as api from "./api"; api.buildThing();\n',
        "Cargo.toml": "[package]\nname='scan'\nversion='0.1.0'\n",
        "src/sources.rs": "pub fn pending_ids() {}\n",
        "src/caller.rs": "use crate::sources as source; fn call(){ source::pending_ids(); }\n",
        "go.mod": "module example.com/project\n",
        "go/sources/pending.go": "package sources\nfunc PendingIDs() {}\n",
        "go/caller.go": "package caller\nimport src \"example.com/project/go/sources\"\nfunc call(){ src.PendingIDs() }\n",
      };
      for (const [filePath, content] of Object.entries(files)) write(cwd, filePath, content);
      git(cwd, "add -A"); git(cwd, "commit -m qualified-scan");
      const ref = git(cwd, "rev-parse HEAD");
      write(cwd, "py/uncommitted.py", "import py.sources as source\nsource.pending_ids()\n");
      const base = { cwd, git: nodeGit, pathOps: nodePathOps, ref };

      await expect(scanQualifiedReferencesAtRef({ ...base, symbolName: "pending_ids", filePath: "py/sources.py" }))
        .resolves.toMatchObject({ referenceCount: 1, referencingFiles: ["py/caller.py"], confidence: "complete" });
      await expect(scanQualifiedReferencesAtRef({ ...base, symbolName: "buildThing", filePath: "ts/api.ts" }))
        .resolves.toMatchObject({ referenceCount: 1, referencingFiles: ["ts/caller.ts"] });
      await expect(scanQualifiedReferencesAtRef({ ...base, symbolName: "pending_ids", filePath: "src/sources.rs" }))
        .resolves.toMatchObject({ referenceCount: 1, referencingFiles: ["src/caller.rs"] });
      await expect(scanQualifiedReferencesAtRef({ ...base, symbolName: "PendingIDs", filePath: "go/sources/pending.go" }))
        .resolves.toMatchObject({ referenceCount: 1, referencingFiles: ["go/caller.go"] });
    } finally {
      cleanupTestRepo(cwd);
    }
  });

  it("returns only relevant shadow warnings and ignores standard-library imports", async () => {
    const cwd = createTestRepo("committed-shadow-scan-");
    try {
      write(cwd, "pkg/sources.py", "def pending_ids(): return []\n");
      write(cwd, "pkg/caller.py", [
        "import json",
        "import pkg.sources as source",
        "def shadow(source): source.pending_ids(); source.pending_ids()",
        "source.pending_ids()",
      ].join("\n"));
      git(cwd, "add -A"); git(cwd, "commit -m shadow-scan");
      const ref = git(cwd, "rev-parse HEAD");
      const options = { cwd, git: nodeGit, pathOps: nodePathOps, ref };
      const result = await scanQualifiedReferencesAtRef({ ...options, symbolName: "pending_ids", filePath: "pkg/sources.py" });
      expect(result).toMatchObject({ referenceCount: 1, referencingFiles: ["pkg/caller.py"], confidence: "partial" });
      expect(result.warnings).toEqual([expect.objectContaining({ code: "import_binding_shadowed", binding: "source", targetFilePath: "pkg/sources.py", shadowKind: "parameter" })]);

      const diagnostics = await importDiagnosticsAtRef(options);
      expect(diagnostics.ref).toBe(ref);
      expect(diagnostics.diagnostics).toEqual([expect.objectContaining({ binding: "source", targetFilePath: "pkg/sources.py" })]);
      expect(diagnostics.diagnostics.some((diagnostic) => diagnostic.binding === "json")).toBe(false);
    } finally {
      cleanupTestRepo(cwd);
    }
  });

  it("orders diagnostic paths by locale-free code points", async () => {
    const cwd = createTestRepo("committed-diagnostic-order-");
    try {
      write(cwd, "pkg/sources.py", "def pending_ids(): return []\n");
      const caller = "import pkg.sources as source\ndef shadow(source): source.pending_ids()\n";
      write(cwd, "Z.py", caller);
      write(cwd, "a.py", caller);
      git(cwd, "add -A"); git(cwd, "commit -m diagnostic-order");

      const result = await importDiagnosticsAtRef({
        cwd, git: nodeGit, pathOps: nodePathOps, ref: "HEAD",
      });

      expect(result.diagnostics.map((diagnostic) => diagnostic.filePath)).toEqual(["Z.py", "a.py"]);
    } finally {
      cleanupTestRepo(cwd);
    }
  });

  it("analyzes tracked source paths that Git would otherwise quote", async () => {
    const cwd = createTestRepo("committed-quoted-path-");
    try {
      write(cwd, "pkg/sources.py", "def pending_ids(): return []\n");
      write(cwd, "ä.py", "import pkg.sources as source\ndef shadow(source): source.pending_ids()\n");
      git(cwd, "add -A"); git(cwd, "commit -m quoted-path");

      const result = await importDiagnosticsAtRef({
        cwd, git: nodeGit, pathOps: nodePathOps, ref: "HEAD",
      });

      expect(result.diagnostics).toEqual([
        expect.objectContaining({ filePath: "ä.py", targetFilePath: "pkg/sources.py" }),
      ]);
    } finally {
      cleanupTestRepo(cwd);
    }
  });

  it("builds Go reference context for each importing file", async () => {
    const cwd = createTestRepo("committed-go-context-scan-");
    try {
      write(cwd, "go.mod", "module example.com/project\n");
      write(cwd, "go/alpha/alpha.go", "package alpha\nfunc Alpha() {}\n");
      write(cwd, "go/beta/beta.go", "package beta\nfunc Beta() {}\n");
      write(cwd, "go/a_caller.go", [
        "package caller",
        'import alpha "example.com/project/go/alpha"',
        "func callAlpha(){ alpha.Alpha() }",
      ].join("\n"));
      write(cwd, "go/z_caller.go", [
        "package caller",
        'import beta "example.com/project/go/beta"',
        "func callBeta(){ beta.Beta() }",
      ].join("\n"));
      git(cwd, "add -A"); git(cwd, "commit -m go-context-scan");

      const result = await scanQualifiedReferencesAtRef({
        cwd, git: nodeGit, pathOps: nodePathOps, ref: "HEAD",
        symbolName: "Beta", filePath: "go/beta/beta.go",
      });

      expect(result).toMatchObject({
        referenceCount: 1,
        referencingFiles: ["go/z_caller.go"],
      });
    } finally {
      cleanupTestRepo(cwd);
    }
  });

  it("counts every TypeScript import by its imported name and target", async () => {
    const cwd = createTestRepo("committed-typescript-import-scan-");
    try {
      write(cwd, "src/api.ts", "export function buildThing() {}\n");
      write(cwd, "src/other.ts", "export function buildThing() {}\nexport function other() {}\n");
      write(cwd, "src/valid.ts", [
        'import { buildThing as otherBuild } from "./other";',
        'import { buildThing as targetBuild } from "./api";',
        "targetBuild();",
      ].join("\n"));
      write(cwd, "src/local-alias.ts", [
        'import { other as buildThing } from "./api";',
        "buildThing();",
      ].join("\n"));
      git(cwd, "add -A"); git(cwd, "commit -m typescript-import-scan");

      const result = await scanQualifiedReferencesAtRef({
        cwd, git: nodeGit, pathOps: nodePathOps, ref: "HEAD",
        symbolName: "buildThing", filePath: "src/api.ts",
      });

      expect(result).toMatchObject({
        referenceCount: 1,
        referencingFiles: ["src/valid.ts"],
      });
    } finally {
      cleanupTestRepo(cwd);
    }
  });

  it("reuses one committed analysis for multiple symbol queries", async () => {
    const cwd = createTestRepo("committed-analysis-session-");
    try {
      write(cwd, "pkg/sources.py", "def pending_ids(): return []\ndef survivors(): return []\n");
      write(cwd, "pkg/caller.py", [
        "import pkg.sources as source",
        "source.pending_ids()",
        "source.survivors()",
      ].join("\n"));
      git(cwd, "add -A"); git(cwd, "commit -m analysis-session");
      let blobReads = 0;
      const countingGit: GitClient = {
        async run(request) {
          if (request.args[0] === "show") blobReads++;
          return nodeGit.run(request);
        },
      };

      const analysis = await analyzeCommittedReferencesAtRef({
        cwd, git: countingGit, pathOps: nodePathOps, ref: "HEAD",
      });
      const readsAfterAnalysis = blobReads;
      expect(analysis.countReferences("pending_ids", "pkg/sources.py")).toMatchObject({ referenceCount: 1 });
      expect(analysis.countReferences("survivors", "pkg/sources.py")).toMatchObject({ referenceCount: 1 });
      expect(blobReads).toBe(readsAfterAnalysis);
    } finally {
      cleanupTestRepo(cwd);
    }
  });

  it("pins a symbolic ref to one commit before reading its tree and blobs", async () => {
    const cwd = createTestRepo("committed-pinned-ref-");
    try {
      write(cwd, "pkg/sources.py", "def pending_ids(): return []\n");
      write(cwd, "pkg/caller.py", "import pkg.sources as source\nsource.pending_ids()\n");
      git(cwd, "add -A"); git(cwd, "commit -m pinned-ref");
      const commitId = git(cwd, "rev-parse HEAD");
      const requests: string[][] = [];
      const recordingGit: GitClient = {
        async run(request) {
          requests.push([...request.args]);
          return nodeGit.run(request);
        },
      };

      await analyzeCommittedReferencesAtRef({
        cwd, git: recordingGit, pathOps: nodePathOps, ref: "HEAD",
      });

      expect(requests[0]).toEqual(["rev-parse", "--verify", "HEAD^{commit}"]);
      expect(requests.find((args) => args[0] === "ls-tree")?.at(-1)).toBe(commitId);
      expect(requests.filter((args) => args[0] === "show").every((args) => args[1]?.startsWith(`${commitId}:`))).toBe(true);
    } finally {
      cleanupTestRepo(cwd);
    }
  });

  it("counts qualified callers when the declaring file is deleted at the reviewed ref", async () => {
    const cwd = createTestRepo("committed-deleted-target-");
    try {
      write(cwd, "pkg/sources.py", "def pending_ids(): return []\n");
      write(cwd, "pkg/caller.py", "import pkg.sources as source\nsource.pending_ids()\n");
      git(cwd, "add -A"); git(cwd, "commit -m before-delete");
      fs.unlinkSync(path.join(cwd, "pkg/sources.py"));
      git(cwd, "add -A"); git(cwd, "commit -m delete-target");

      const result = await scanQualifiedReferencesAtRef({
        cwd, git: nodeGit, pathOps: nodePathOps, ref: "HEAD",
        symbolName: "pending_ids", filePath: "pkg/sources.py",
      });

      expect(result).toMatchObject({
        referenceCount: 1,
        referencingFiles: ["pkg/caller.py"],
        confidence: "complete",
      });
    } finally {
      cleanupTestRepo(cwd);
    }
  });

  it("marks an unresolved Go selector partial when its declaring file is deleted", async () => {
    const cwd = createTestRepo("committed-deleted-go-target-");
    try {
      write(cwd, "go.mod", "module example.com/project\n");
      write(cwd, "go/sources/pending.go", "package sources\nfunc PendingIDs() {}\n");
      write(cwd, "go/caller.go", [
        "package caller",
        'import source "example.com/project/go/sources"',
        "func call(){ source.PendingIDs() }",
        "func shadow(source interface{ PendingIDs() }) { source.PendingIDs() }",
      ].join("\n"));
      git(cwd, "add -A"); git(cwd, "commit -m before-go-delete");
      fs.unlinkSync(path.join(cwd, "go/sources/pending.go"));
      git(cwd, "add -A"); git(cwd, "commit -m delete-go-target");

      const result = await scanQualifiedReferencesAtRef({
        cwd, git: nodeGit, pathOps: nodePathOps, ref: "HEAD",
        symbolName: "PendingIDs", filePath: "go/sources/pending.go",
      });

      expect(result).toMatchObject({
        referenceCount: 0,
        referencingFiles: [],
        confidence: "partial",
      });
      expect(result.warnings).toEqual([
        expect.objectContaining({
          binding: "source",
          targetFilePath: "go/sources/pending.go",
          shadowKind: "parameter",
        }),
      ]);
      await expect(scanQualifiedReferencesAtRef({
        cwd, git: nodeGit, pathOps: nodePathOps, ref: "HEAD",
        symbolName: "Other", filePath: "go/sources/pending.go",
      })).resolves.toMatchObject({
        referenceCount: 0,
        referencingFiles: [],
        confidence: "complete",
        warnings: [],
      });
    } finally {
      cleanupTestRepo(cwd);
    }
  });

  it("counts direct Python and Rust symbol imports by their imported names", async () => {
    const cwd = createTestRepo("committed-direct-import-scan-");
    try {
      write(cwd, "py/sources.py", "def pending_ids(): return []\n");
      write(cwd, "py/caller.py", "from py.sources import pending_ids as local\nlocal()\n");
      write(cwd, "Cargo.toml", "[package]\nname='direct'\nversion='0.1.0'\n");
      write(cwd, "src/sources.rs", "pub fn pending_ids() {}\n");
      write(cwd, "src/caller.rs", "use crate::sources::pending_ids as local; fn call(){ local(); }\n");
      git(cwd, "add -A"); git(cwd, "commit -m direct-import-scan");
      const base = { cwd, git: nodeGit, pathOps: nodePathOps, ref: "HEAD", symbolName: "pending_ids" };

      await expect(scanQualifiedReferencesAtRef({ ...base, filePath: "py/sources.py" }))
        .resolves.toMatchObject({ referenceCount: 1, referencingFiles: ["py/caller.py"] });
      await expect(scanQualifiedReferencesAtRef({ ...base, filePath: "src/sources.rs" }))
        .resolves.toMatchObject({ referenceCount: 1, referencingFiles: ["src/caller.rs"] });
    } finally {
      cleanupTestRepo(cwd);
    }
  });

  it("marks a target-specific dynamic import limitation partial without inventing a caller", async () => {
    const cwd = createTestRepo("committed-dynamic-scan-");
    try {
      write(cwd, "pkg/sources.py", "def pending_ids(): return []\n");
      write(cwd, "pkg/dynamic.py", "import importlib\nmod = importlib.import_module('pkg.sources')\ngetattr(mod, 'pending_ids')()\n");
      git(cwd, "add -A"); git(cwd, "commit -m dynamic-scan");
      const result = await scanQualifiedReferencesAtRef({
        cwd, git: nodeGit, pathOps: nodePathOps, ref: "HEAD",
        symbolName: "pending_ids", filePath: "pkg/sources.py",
      });
      expect(result).toMatchObject({ referenceCount: 0, referencingFiles: [], confidence: "partial", warnings: [] });
    } finally {
      cleanupTestRepo(cwd);
    }
  });

  it("ignores dynamic-reference words that occur only in comments and strings", async () => {
    const cwd = createTestRepo("committed-dynamic-decoy-");
    try {
      write(cwd, "pkg/sources.py", "def pending_ids(): return []\n");
      write(cwd, "pkg/decoy.py", [
        "# importlib getattr pkg.sources pending_ids",
        "note = 'importlib getattr pkg.sources pending_ids'",
      ].join("\n"));
      git(cwd, "add -A"); git(cwd, "commit -m dynamic-decoy");

      const result = await scanQualifiedReferencesAtRef({
        cwd, git: nodeGit, pathOps: nodePathOps, ref: "HEAD",
        symbolName: "pending_ids", filePath: "pkg/sources.py",
      });

      expect(result).toMatchObject({
        referenceCount: 0, referencingFiles: [], confidence: "complete", warnings: [],
      });
    } finally {
      cleanupTestRepo(cwd);
    }
  });
});
