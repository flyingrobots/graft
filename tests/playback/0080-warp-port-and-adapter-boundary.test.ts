import * as fs from "node:fs";
import * as path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const SRC = path.resolve(import.meta.dirname, "../../src");
const WARP_PORT = path.resolve(SRC, "ports/warp.ts");
const OPEN_WARP = path.resolve(SRC, "warp/open.ts");
const PLUMBING_DECLARATION = path.resolve(SRC, "warp/plumbing.d.ts");
const GIT_WARP_PACKAGE = "@git-stunts/git-warp";

const ALLOWED_GIT_WARP_IMPORTERS = new Set([
  OPEN_WARP,
  PLUMBING_DECLARATION,
]);

function collectTypeScriptFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectTypeScriptFiles(full));
    } else if (entry.name.endsWith(".ts")) {
      results.push(full);
    }
  }
  return results;
}

function stringLiteralText(node: ts.Node | undefined): string | null {
  if (node !== undefined && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))) {
    return node.text;
  }
  return null;
}

function importedModules(sourceText: string, fileName = "boundary.ts"): string[] {
  const source = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const modules: string[] = [];

  function record(node: ts.Node | undefined): void {
    const moduleName = stringLiteralText(node);
    if (moduleName !== null) modules.push(moduleName);
  }

  function visit(node: ts.Node): void {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      record(node.moduleSpecifier);
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference)
    ) {
      record(node.moduleReference.expression);
    } else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) {
      record(node.argument.literal);
    } else if (ts.isCallExpression(node)) {
      const isDynamicImport = node.expression.kind === ts.SyntaxKind.ImportKeyword;
      const isRequire = ts.isIdentifier(node.expression) && node.expression.text === "require";
      if (isDynamicImport || isRequire) record(node.arguments[0]);
    }
    ts.forEachChild(node, visit);
  }

  visit(source);
  return modules;
}

function gitWarpImports(file: string): string[] {
  return importedModules(fs.readFileSync(file, "utf8"), file)
    .filter((moduleName) => moduleName === GIT_WARP_PACKAGE);
}

function exportedInterfaceNames(file: string): string[] {
  const source = ts.createSourceFile(
    file,
    fs.readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  return source.statements.flatMap((statement) => {
    if (!ts.isInterfaceDeclaration(statement)) return [];
    const exported = statement.modifiers?.some((modifier) =>
      modifier.kind === ts.SyntaxKind.ExportKeyword
    ) ?? false;
    return exported ? [statement.name.text] : [];
  });
}

describe("0080 warp boundary — git-warp behind a Graft port and adapter", () => {
  it("recognizes real module dependencies without treating package-name prose as an import", () => {
    const source = [
      'const explanation = "@git-stunts/git-warp";',
      'import type { Observer } from "@git-stunts/git-warp";',
      'export { QueryBuilder } from "@git-stunts/git-warp";',
      'type Patch = import("@git-stunts/git-warp").PatchV2;',
      'const lazy = import("@git-stunts/git-warp");',
      'const legacy = require("@git-stunts/git-warp");',
    ].join("\n");

    expect(importedModules(source)).toEqual([
      GIT_WARP_PACKAGE,
      GIT_WARP_PACKAGE,
      GIT_WARP_PACKAGE,
      GIT_WARP_PACKAGE,
      GIT_WARP_PACKAGE,
    ]);
  });

  it("provides one Graft-owned graph port contract", () => {
    expect(fs.existsSync(WARP_PORT), "src/ports/warp.ts must define the Graft boundary").toBe(true);
    expect(exportedInterfaceNames(WARP_PORT)).toContain("WarpGraphPort");
  });

  it("confines every production git-warp import to the secondary adapter", () => {
    const violations = collectTypeScriptFiles(SRC)
      .filter((file) => !ALLOWED_GIT_WARP_IMPORTERS.has(file))
      .filter((file) => gitWarpImports(file).length > 0)
      .map((file) => path.relative(SRC, file))
      .sort();

    expect(violations).toEqual([]);
  });

  it("keeps openWarp as the concrete package adapter", () => {
    expect(gitWarpImports(OPEN_WARP)).toEqual([GIT_WARP_PACKAGE]);
  });
});
