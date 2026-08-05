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

  it("normalizes quoted module coordinates", async () => {
    const files = new Map([
      ["go.mod", 'module "example.com/project"\n'],
      ["cli/main.go", 'package cli\nimport "example.com/project/sources"\n'],
      ["sources/pending.go", "package sources\nfunc Pending() {}\n"],
    ]);
    const resolve = createGoReferenceContextResolver(
      new Set(files.keys()),
      (filePath) => Promise.resolve(files.get(filePath) ?? null),
    );

    const context = await resolve("cli/main.go");

    expect(context?.modulePath).toBe("example.com/project");
    expect(context?.declarations.get("sources")?.get("Pending")).toBe("sources/pending.go");
  });

  it("does not resolve a root-module import through a nested module boundary", async () => {
    const files = new Map([
      ["go.mod", "module example.com/root\n"],
      ["cli/main.go", 'package cli\nimport nested "example.com/root/nested/pkg"\n'],
      ["nested/go.mod", "module other.example/nested\n"],
      ["nested/pkg/value.go", "package pkg\nfunc Run() {}\n"],
    ]);
    const resolve = createGoReferenceContextResolver(
      new Set(files.keys()),
      (filePath) => Promise.resolve(files.get(filePath) ?? null),
    );

    const context = await resolve("cli/main.go");

    expect(context?.packageFiles.has("nested/pkg")).toBe(false);
    expect(context?.declarations.get("nested/pkg")?.get("Run")).toBeUndefined();
  });

  it("uses the nested module coordinate for callers inside that module", async () => {
    const files = new Map([
      ["go.mod", "module example.com/root\n"],
      ["rootpkg/value.go", "package rootpkg\nfunc Root() {}\n"],
      ["nested/go.mod", "module other.example/nested\n"],
      ["nested/cli/main.go", [
        "package cli",
        'import nested "other.example/nested/pkg"',
        'import root "example.com/root/rootpkg"',
        "",
      ].join("\n")],
      ["nested/pkg/value.go", "package pkg\nfunc Run() {}\n"],
    ]);
    const resolve = createGoReferenceContextResolver(
      new Set(files.keys()),
      (filePath) => Promise.resolve(files.get(filePath) ?? null),
    );

    const context = await resolve("nested/cli/main.go");

    expect(context?.modulePath).toBe("other.example/nested");
    expect(context?.declarations.get("pkg")?.get("Run")).toBe("nested/pkg/value.go");
    expect(context?.packageFiles.has("rootpkg")).toBe(false);
  });
});
