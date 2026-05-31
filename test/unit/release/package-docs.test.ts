import { describe, expect, it } from "vitest";
import { lstatSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, relative, resolve } from "node:path";
import packageJson from "../../../package.json";

const repoRoot = resolve(import.meta.dirname, "../../..");

function markdownFilesUnder(directory: string): readonly string[] {
  const entries = readdirSync(directory);
  const markdownFiles: string[] = [];

  for (const entry of entries) {
    const entryPath = join(directory, entry);
    const stat = lstatSync(entryPath);
    if (stat.isSymbolicLink()) {
      continue;
    }
    if (stat.isDirectory()) {
      markdownFiles.push(...markdownFilesUnder(entryPath));
      continue;
    }
    if (entry.endsWith(".md")) {
      markdownFiles.push(entryPath);
    }
  }

  return markdownFiles;
}

describe("release package docs", () => {
  it("ships every release-facing doc linked from README", () => {
    expect(packageJson.files).toEqual(expect.arrayContaining([
      "ADVANCED_GUIDE.md",
      "ARCHITECTURE.md",
      "CHANGELOG.md",
      "CODE_OF_CONDUCT.md",
      "GUIDE.md",
      "docs/CLI.md",
      "docs/MCP.md",
      "docs/SETUP.md",
      "README.md",
    ]));
  });

  it("keeps doc-local links from pretending repo-root paths are current-directory paths", () => {
    const badLinks: string[] = [];
    const repoRootShapedLink = /\]\((\.\/(?:src|docs|test|tests|scripts|schemas|bin|package\.json|README\.md|METHOD\.md|ARCHITECTURE\.md|GUIDE\.md)[^)]*)\)/gu;

    expect([..."](./README.md)".matchAll(repoRootShapedLink)].map((match) => match[1])).toEqual([
      "./README.md",
    ]);

    for (const filePath of markdownFilesUnder(join(repoRoot, "docs"))) {
      const markdown = readFileSync(filePath, "utf8");
      for (const match of markdown.matchAll(repoRootShapedLink)) {
        const target = match[1];
        if (target !== undefined) {
          badLinks.push(`${relative(repoRoot, filePath)} -> ${target}`);
        }
      }
    }

    expect(badLinks).toEqual([]);
  });

  it("skips symlink cycles while collecting Markdown docs", () => {
    const workspace = mkdtempSync(join(tmpdir(), "graft-package-docs-"));

    try {
      writeFileSync(join(workspace, "doc.md"), "# fixture\n");
      symlinkSync("loop", join(workspace, "loop"), "dir");

      expect(() => markdownFilesUnder(workspace)).not.toThrow();
      expect(markdownFilesUnder(workspace).map((filePath) => basename(filePath))).toEqual(["doc.md"]);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });
});
