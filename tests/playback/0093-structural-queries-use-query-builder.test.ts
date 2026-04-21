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

describe("0093 structural-queries use QueryBuilder, not getEdges()", () => {
  it("Does structural-queries.ts never call getEdges() to pull all edges into memory?", () => {
    const content = read(STRUCTURAL_QUERIES);

    // getEdges() pulls all edges into JS memory — scalability bug.
    // QueryBuilder filters inside the substrate.
    expect(content).not.toContain(".getEdges()");
  });

  it("Does structural-queries.ts use QueryBuilder for commit→symbol traversal?", () => {
    const content = read(STRUCTURAL_QUERIES);

    // Must use query() + outgoing/incoming for graph traversal
    expect(content).toContain(".query()");
    expect(content).toMatch(/\.outgoing\(|\.incoming\(/);
  });

  it("Does structural-queries.ts avoid per-node getNodeProps() round-trips by using select?", () => {
    const content = read(STRUCTURAL_QUERIES);

    // select(["id", "props"]) returns props inline from query results
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
