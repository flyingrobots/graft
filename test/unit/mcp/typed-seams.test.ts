import { describe, it, expect } from "vitest";
import { GitFileList, GitFileQuery } from "../../../src/mcp/tools/git-files.js";
import { PrecisionSymbolMatch } from "../../../src/mcp/tools/precision-match.js";
import { PrecisionSearchRequest } from "../../../src/mcp/tools/precision-query.js";

describe("mcp typed seams: git file queries", () => {
  it("builds tracked and project git file queries through explicit value objects", () => {
    expect(GitFileQuery.tracked("/repo", "src").toArgs()).toEqual(["ls-files", "--", "src"]);
    expect(GitFileQuery.project("/repo", "src").toArgs()).toEqual([
      "ls-files",
      "--cached",
      "--others",
      "--exclude-standard",
      "--",
      "src",
    ]);
  });

  it("freezes git file lists after construction", () => {
    const files = new GitFileList(["src/a.ts", "src/b.ts"]);
    expect(files.paths).toEqual(["src/a.ts", "src/b.ts"]);
    expect(Object.isFrozen(files)).toBe(true);
    expect(Object.isFrozen(files.paths)).toBe(true);
  });

  it("rejects empty cwd on git file queries", () => {
    expect(() => new GitFileQuery({ cwd: "", dirPath: "", mode: "project" })).toThrow("cwd");
  });
});

describe("mcp typed seams: precision search models", () => {
  it("constructs frozen precision symbol matches", () => {
    const match = new PrecisionSymbolMatch({
      name: "greet",
      kind: "function",
      path: "src/app.ts",
      exported: true,
      startLine: 1,
      endLine: 3,
    });

    expect(match).toBeInstanceOf(PrecisionSymbolMatch);
    expect(Object.isFrozen(match)).toBe(true);
  });

  it("rejects invalid precision match ranges", () => {
    expect(() => new PrecisionSymbolMatch({
      name: "greet",
      kind: "function",
      path: "src/app.ts",
      exported: true,
      startLine: 5,
      endLine: 4,
    })).toThrow("endLine");
  });

  it("ranks plain precision queries deterministically", () => {
    const request = new PrecisionSearchRequest({ query: "adapter" });
    const exact = new PrecisionSymbolMatch({
      name: "adapter",
      kind: "function",
      path: "src/a.ts",
      exported: true,
    });
    const substring = new PrecisionSymbolMatch({
      name: "GitWarpAdapter",
      kind: "class",
      path: "src/b.ts",
      exported: true,
    });

    const ranked = [
      request.rank(substring),
      request.rank(exact),
    ].filter((entry) => entry !== null);

    expect(request.sort(ranked)).toEqual([exact, substring]);
  });

  it("uses file and exact-name lenses when available", () => {
    expect(new PrecisionSearchRequest({
      exactName: "greet",
      filePath: "src/app.ts",
    }).selectLens()).toBe("file");
    expect(new PrecisionSearchRequest({ exactName: "greet" }).selectLens()).toBe("exact");
  });

  it("rejects empty precision requests", () => {
    expect(() => new PrecisionSearchRequest({})).toThrow("required");
  });
});
