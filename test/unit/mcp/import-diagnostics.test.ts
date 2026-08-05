import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { cleanupTestRepo, createTestRepo, git } from "../../helpers/git.js";
import { createServerInRepo, parse } from "../../helpers/mcp.js";
import { nodeGit } from "../../../src/adapters/node-git.js";
import type { ToolContext } from "../../../src/mcp/context.js";
import { importDiagnosticsTool } from "../../../src/mcp/tools/import-diagnostics.js";

describe("mcp: graft_import_diagnostics", () => {
  it("fails closed when the pinned repository contains a supported parse error", async () => {
    const cwd = createTestRepo("import-diagnostics-incomplete-");
    try {
      fs.mkdirSync(path.join(cwd, "pkg"), { recursive: true });
      fs.writeFileSync(path.join(cwd, "pkg", "broken.py"), "def broken(:\n");
      git(cwd, "add -A"); git(cwd, "commit -m incomplete");

      const handler = importDiagnosticsTool.createHandler();
      await expect(handler({}, {
        projectRoot: cwd,
        git: nodeGit,
        recordFootprint: () => undefined,
        respond: (_tool: string, payload: Record<string, unknown>) => payload,
      } as unknown as ToolContext)).rejects.toMatchObject({
        name: "IncompleteImportDiagnosticsError",
        code: "import_diagnostics_incomplete",
      });
    } finally {
      cleanupTestRepo(cwd);
    }
  });

  it("reports every first-party import shadow at the requested ref", async () => {
    const cwd = createTestRepo("import-diagnostics-");
    try {
      fs.mkdirSync(path.join(cwd, "pkg"), { recursive: true });
      fs.writeFileSync(path.join(cwd, "pkg", "sources.py"), "def pending_ids(): return []\n");
      fs.writeFileSync(path.join(cwd, "pkg", "caller.py"), [
        "import json",
        "import pkg.sources as source",
        "def caller(source):",
        "    return source.pending_ids()",
      ].join("\n"));
      git(cwd, "add -A"); git(cwd, "commit -m import-shadow");
      const ref = git(cwd, "rev-parse HEAD");
      fs.writeFileSync(path.join(cwd, "pkg", "caller.py"), "import pkg.sources as source\nsource.pending_ids()\n");

      const result = parse(await createServerInRepo(cwd).callTool("graft_import_diagnostics", { ref }));
      expect(result).toMatchObject({ ref, summary: "1 import binding shadow warning" });
      expect(result["diagnostics"]).toEqual([{
        code: "import_binding_shadowed",
        severity: "warning",
        language: "python",
        filePath: "pkg/caller.py",
        range: { startLine: 3, startColumn: 12, endLine: 3, endColumn: 18 },
        binding: "source",
        targetFilePath: "pkg/sources.py",
        shadowKind: "parameter",
        message: "Import binding 'source' is shadowed; affected qualified accesses were excluded from reference inference.",
      }]);
    } finally {
      cleanupTestRepo(cwd);
    }
  });

  it("records unique diagnostic paths and affected bindings in the tool footprint", async () => {
    const cwd = createTestRepo("import-diagnostics-footprint-");
    try {
      fs.mkdirSync(path.join(cwd, "pkg"), { recursive: true });
      fs.writeFileSync(path.join(cwd, "pkg", "sources.py"), "def pending_ids(): return []\n");
      fs.writeFileSync(path.join(cwd, "pkg", "caller.py"), [
        "import pkg.sources as source",
        "def first(source): return source.pending_ids()",
        "def second(source): return source.pending_ids()",
      ].join("\n"));
      fs.writeFileSync(path.join(cwd, "pkg", "other.py"), [
        "import pkg.sources as source",
        "def third(source): return source.pending_ids()",
      ].join("\n"));
      git(cwd, "add -A"); git(cwd, "commit -m footprint");
      const footprints: unknown[] = [];
      const handler = importDiagnosticsTool.createHandler();

      await handler({}, {
        projectRoot: cwd,
        git: nodeGit,
        recordFootprint: (footprint: unknown) => footprints.push(footprint),
        respond: (_tool: string, payload: Record<string, unknown>) => payload,
      } as unknown as ToolContext);

      expect(footprints).toEqual([{
        paths: ["pkg/caller.py", "pkg/other.py"],
        symbols: ["source"],
      }]);
    } finally {
      cleanupTestRepo(cwd);
    }
  });
});
