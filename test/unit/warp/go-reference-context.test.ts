import { describe, expect, it } from "vitest";
import { createGoReferenceContextResolver } from "../../../src/warp/go-reference-context.js";

describe("Go reference context", () => {
  it("caches imported package analysis across callers", async () => {
    const files = new Map([
      ["go.mod", "module example.com/project\n"],
      ["cli/one.go", "package cli\nimport \"example.com/project/sources\"\n"],
      ["cli/two.go", "package cli\nimport \"example.com/project/sources\"\n"],
      ["sources/pending.go", "package sources\nfunc Pending() {}\n"],
    ]);
    const reads = new Map<string, number>();
    const resolve = createGoReferenceContextResolver(new Set(files.keys()), (filePath) => {
      reads.set(filePath, (reads.get(filePath) ?? 0) + 1);
      return Promise.resolve(files.get(filePath) ?? null);
    });

    await resolve("cli/one.go");
    await resolve("cli/two.go");

    expect(reads.get("sources/pending.go")).toBe(1);
  });

  it("does not inspect package paths mentioned only in strings", async () => {
    const files = new Map([
      ["go.mod", "module example.com/project\n"],
      ["cli/main.go", "package cli\nconst example = \"example.com/project/sources\"\n"],
      ["sources/pending.go", "package sources\nfunc Pending() {}\n"],
    ]);
    const reads = new Map<string, number>();
    const resolve = createGoReferenceContextResolver(new Set(files.keys()), (filePath) => {
      reads.set(filePath, (reads.get(filePath) ?? 0) + 1);
      return Promise.resolve(files.get(filePath) ?? null);
    });

    await resolve("cli/main.go");

    expect(reads.get("sources/pending.go")).toBeUndefined();
  });
});
