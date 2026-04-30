import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";

const REFERENCES = path.resolve(
  import.meta.dirname,
  "../../src/warp/references.ts",
);

function read(pathname: string): string {
  return fs.readFileSync(pathname, "utf-8");
}

describe("0094 references.ts uses traverse, not getEdges()", () => {
  it("Does references.ts never call getEdges()?", () => {
    const content = read(REFERENCES);
    expect(content).not.toContain(".getEdges()");
  });

  it("Does references.ts use traverse.bfs for edge discovery?", () => {
    const content = read(REFERENCES);
    expect(content).toContain("traverse.bfs(");
  });

  it("Does the public API remain unchanged?", () => {
    const content = read(REFERENCES);
    expect(content).toMatch(/export async function referencesForSymbol\(/);
    expect(content).toContain("Promise<SymbolReference[]>");
  });
});
