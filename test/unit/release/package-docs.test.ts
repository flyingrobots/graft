import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import packageJson from "../../../package.json";

const repoRoot = resolve(import.meta.dirname, "../../..");

function markdownFilesUnder(directory: string): readonly string[] {
  const entries = readdirSync(directory);
  const markdownFiles: string[] = [];

  for (const entry of entries) {
    const entryPath = join(directory, entry);
    const stat = statSync(entryPath);
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
    const repoRootShapedLink = /\]\((\.\/(?:src|docs|test|tests|scripts|schemas|bin|package\.json|README\.md|METHOD\.md|ARCHITECTURE\.md|GUIDE\.md)[^)]+)\)/gu;

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
});
