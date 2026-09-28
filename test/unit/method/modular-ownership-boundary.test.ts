import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The source ownership inventory in CORE_modular-graft-runtime-and-library.md
 * (Appendix A) is the plan the package extraction follows. These tests hold it
 * to the design's own boundary: a file the inventory assigns to the library
 * must not depend on the MCP transport or on a file it assigns to the operator,
 * or the library's declaration graph reaches its consumer after the move.
 */

const repoRoot = path.resolve(import.meta.dirname, "../../..");
const designPath = path.join(repoRoot, "docs", "design", "CORE_modular-graft-runtime-and-library.md");

function inventory(): Map<string, string> {
  const owner = new Map<string, string>();
  for (const line of fs.readFileSync(designPath, "utf8").split("\n")) {
    const match = /^\| \[(src\/[^\]]+)\][^|]*\| ([A-Za-z]+)/.exec(line);
    if (match?.[1] !== undefined && match[2] !== undefined) owner.set(match[1], match[2]);
  }
  return owner;
}

function importsOf(file: string): string[] {
  const text = fs.readFileSync(path.join(repoRoot, file), "utf8");
  return [...text.matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1] ?? "");
}

function resolveRelative(file: string, specifier: string): string {
  return path.posix.normalize(path.posix.join(path.posix.dirname(file), specifier)).replace(/\.js$/, ".ts");
}

function libraryFiles(owner: Map<string, string>): string[] {
  return [...owner].filter(([file, who]) => who === "Library" && fs.existsSync(path.join(repoRoot, file))).map(([file]) => file);
}

describe("modular Graft ownership inventory", () => {
  it("assigns no library file an import of the MCP SDK or of the MCP server module", () => {
    const owner = inventory();
    const leaks = libraryFiles(owner).flatMap((file) =>
      importsOf(file)
        .filter((s) => s.startsWith("@modelcontextprotocol/") || (s.startsWith(".") && resolveRelative(file, s) === "src/mcp/server.ts"))
        .map((s) => `${file} -> ${s}`),
    );
    expect(leaks).toEqual([]);
  });
});
