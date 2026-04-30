import { describe, it, expect, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { createRepoPathResolver, toRepoPolicyPath } from "../../../src/adapters/repo-paths.js";
import { createPathResolver } from "../../../src/mcp/context.js";

describe.each([
  ["createPathResolver", createPathResolver],
  ["createRepoPathResolver", createRepoPathResolver],
] as const)("path resolver confinement parity: %s", (_name, createResolver) => {
  let root: string | null = null;
  let outsideDir: string | null = null;

  function setup(): {
    readonly root: string;
    readonly outsideDir: string;
    readonly resolve: (input: string) => string;
  } {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "graft-path-root-"));
    outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-path-outside-"));
    fs.mkdirSync(path.join(root, "src", "nested"), { recursive: true });
    fs.writeFileSync(path.join(root, "src", "app.ts"), "export const ok = true;\n");
    fs.writeFileSync(path.join(outsideDir, "secret.ts"), "export const secret = true;\n");
    return {
      root,
      outsideDir,
      resolve: createResolver(root),
    };
  }

  afterEach(() => {
    if (root !== null) {
      fs.rmSync(root, { recursive: true, force: true });
      root = null;
    }
    if (outsideDir !== null) {
      fs.rmSync(outsideDir, { recursive: true, force: true });
      outsideDir = null;
    }
  });

  it("allows simple relative paths inside the root", () => {
    const { root, resolve } = setup();
    expect(resolve("src/app.ts")).toBe(path.resolve(root, "src/app.ts"));
  });

  it("allows absolute paths inside the root", () => {
    const { root, resolve } = setup();
    const inside = path.join(root, "src", "app.ts");
    expect(resolve(inside)).toBe(path.resolve(root, "src", "app.ts"));
  });

  it("rejects relative traversal outside the root", () => {
    const { resolve } = setup();
    expect(() => resolve("../../../etc/passwd")).toThrow("Path traversal blocked");
  });

  it("rejects absolute paths outside the root", () => {
    const { outsideDir, resolve } = setup();
    expect(() => resolve(path.join(outsideDir, "secret.ts"))).toThrow("Path traversal blocked");
  });

  it("rejects /etc/passwd when the repo root is elsewhere", () => {
    const { resolve } = setup();
    expect(() => resolve("/etc/passwd")).toThrow("Path traversal blocked");
  });

  it("rejects symlink directory escapes when the target exists", () => {
    const { outsideDir, resolve } = setup();
    fs.symlinkSync(outsideDir, path.join(root!, "escape-dir"));
    expect(() => resolve("escape-dir/secret.ts")).toThrow("Path traversal blocked");
  });

  it("rejects non-existent children under symlinked directories that escape the root", () => {
    const { outsideDir, resolve } = setup();
    fs.symlinkSync(outsideDir, path.join(root!, "escape-dir"));
    expect(() => resolve("escape-dir/new-file.ts")).toThrow("Path traversal blocked");
  });

  it("rejects symlink file escapes when the target exists", () => {
    const { outsideDir, resolve } = setup();
    fs.symlinkSync(path.join(outsideDir, "secret.ts"), path.join(root!, "linked-secret.ts"));
    expect(() => resolve("linked-secret.ts")).toThrow("Path traversal blocked");
  });

  it("allows non-existent paths inside the root", () => {
    const { root, resolve } = setup();
    expect(resolve("src/nested/new-file.ts")).toBe(path.resolve(root, "src", "nested", "new-file.ts"));
  });
});

describe("path resolver project root canonicalization", () => {
  let realRoot: string | null = null;
  let aliasParent: string | null = null;
  let outsideDir: string | null = null;

  function setup(): {
    readonly aliasRoot: string;
    readonly outsideDir: string;
    readonly realRoot: string;
  } {
    realRoot = fs.mkdtempSync(path.join(os.tmpdir(), "graft-path-real-root-"));
    aliasParent = fs.mkdtempSync(path.join(os.tmpdir(), "graft-path-alias-parent-"));
    outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-path-outside-"));
    fs.mkdirSync(path.join(realRoot, "src"), { recursive: true });
    const aliasRoot = path.join(aliasParent, "repo-link");
    fs.symlinkSync(realRoot, aliasRoot);
    return { aliasRoot, outsideDir, realRoot };
  }

  afterEach(() => {
    if (aliasParent !== null) {
      fs.rmSync(aliasParent, { recursive: true, force: true });
      aliasParent = null;
    }
    if (realRoot !== null) {
      fs.rmSync(realRoot, { recursive: true, force: true });
      realRoot = null;
    }
    if (outsideDir !== null) {
      fs.rmSync(outsideDir, { recursive: true, force: true });
      outsideDir = null;
    }
  });

  it("allows non-existent children consistently for logical projectRoot and canonical real projectRoot", () => {
    const { aliasRoot, realRoot } = setup();

    expect(createRepoPathResolver(aliasRoot)("src/new-file.ts")).toBe(path.join(aliasRoot, "src", "new-file.ts"));
    expect(createRepoPathResolver(realRoot)("src/new-file.ts")).toBe(path.join(realRoot, "src", "new-file.ts"));
  });

  it("rejects symlink-parent write escapes consistently for logical projectRoot and canonical real projectRoot", () => {
    const { aliasRoot, outsideDir, realRoot } = setup();
    fs.symlinkSync(outsideDir, path.join(realRoot, "escape-dir"));

    expect(() => createRepoPathResolver(aliasRoot)("escape-dir/new-file.ts")).toThrow("Path traversal blocked");
    expect(() => createRepoPathResolver(realRoot)("escape-dir/new-file.ts")).toThrow("Path traversal blocked");
  });
});

describe("toRepoPolicyPath", () => {
  const root = "/home/user/project";

  it("converts absolute paths within root to relative forward-slash paths", () => {
    expect(toRepoPolicyPath(root, "/home/user/project/src/app.ts")).toBe("src/app.ts");
  });

  it("converts relative paths to forward-slash normalized form", () => {
    expect(toRepoPolicyPath(root, "src/app.ts")).toBe("src/app.ts");
  });

  it("returns absolute path for paths outside the project root", () => {
    expect(toRepoPolicyPath(root, "/etc/passwd")).toBe("/etc/passwd");
  });

  it("returns absolute path for traversal escapes", () => {
    const result = toRepoPolicyPath(root, "/home/user/project/../../etc/passwd");
    expect(result).toBe("/home/user/project/../../etc/passwd");
  });

  it("handles the project root itself", () => {
    expect(toRepoPolicyPath(root, root)).toBe(root);
  });
});
