import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";

const STRUCTURAL_QUERIES = path.resolve(
  import.meta.dirname,
  "../../src/warp/structural-queries.ts",
);

function read(pathname: string): string {
  return fs.readFileSync(pathname, "utf-8");
}

describe("0093 structural-queries use traverse + query, not getEdges()", () => {
  it("Does structural-queries.ts never call getEdges() to pull all edges into memory?", () => {
    const content = read(STRUCTURAL_QUERIES);

    // getEdges() pulls all edges into JS memory — scalability bug.
    expect(content).not.toContain(".getEdges()");
  });

  it("Does structural-queries.ts use traverse.bfs for edge-following?", () => {
    const content = read(STRUCTURAL_QUERIES);

    // Traverse for edge walks — substrate-side filtering
    expect(content).toContain("traverse.bfs(");
    expect(content).toContain("labelFilter");
  });

  it("Does structural-queries.ts use QueryBuilder for pattern matching and batch prop reads?", () => {
    const content = read(STRUCTURAL_QUERIES);

    // Query for pattern matching + batch prop reads
    expect(content).toContain(".query()");
    expect(content).toContain("select(");
  });

  it("Does the public API surface remain unchanged?", () => {
    const content = read(STRUCTURAL_QUERIES);

    // Same exports, same signatures
    expect(content).toMatch(/export async function symbolsForCommit\(\s*ctx: WarpContext/);
    expect(content).toMatch(/export async function commitsForSymbol\(\s*ctx: WarpContext/);

    // Same return types
    expect(content).toContain("Promise<CommitSymbols>");
    expect(content).toContain("Promise<SymbolHistory>");
  });
});
