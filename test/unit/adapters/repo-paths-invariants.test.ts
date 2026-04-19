import { describe, it, expect, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { createRepoPathResolver, toRepoPolicyPath } from "../../../src/adapters/repo-paths.js";

describe("path resolver: escape invariants", () => {
  const root = "/home/user/project";
  const resolve = createRepoPathResolver(root);

  it("resolves relative paths within the project root", () => {
    const resolved = resolve("src/app.ts");
    expect(resolved).toBe(path.resolve(root, "src/app.ts"));
  });

  it("returns absolute paths as-is", () => {
    const abs = "/etc/passwd";
    expect(resolve(abs)).toBe(abs);
  });

  it("blocks .. traversal out of project root", () => {
    expect(() => resolve("../../../etc/passwd")).toThrow("Path traversal blocked");
  });

  it("blocks traversal disguised in the middle of a path", () => {
    expect(() => resolve("src/../../etc/passwd")).toThrow("Path traversal blocked");
  });

  it("allows .. that stays within the project root", () => {
    const resolved = resolve("src/../lib/util.ts");
    expect(resolved).toBe(path.resolve(root, "lib/util.ts"));
  });

  it("resolves the project root itself", () => {
    const resolved = resolve(".");
    expect(resolved).toBe(path.resolve(root));
  });
});

describe("path resolver: symlink escape invariants", () => {
  let tmpDir: string | null = null;

  afterEach(() => {
    if (tmpDir !== null) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
      tmpDir = null;
    }
  });

  it("resolves symlinks within the project root to their target", () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-path-sym-"));
    const realFile = path.join(tmpDir, "real.ts");
    const symlink = path.join(tmpDir, "link.ts");
    fs.writeFileSync(realFile, "export const x = 1;\n");
    fs.symlinkSync(realFile, symlink);

    const resolve = createRepoPathResolver(tmpDir);
    const resolved = resolve("link.ts");
    expect(resolved).toBe(path.resolve(tmpDir, "link.ts"));
    // The resolver doesn't follow symlinks itself — that's the fs layer's job.
    // But it should not throw for symlinks within the root.
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
    // toRepoPolicyPath does not normalize the absolute path — it returns it
    // verbatim when relative() shows it escapes the root
    const result = toRepoPolicyPath(root, "/home/user/project/../../etc/passwd");
    expect(result).toBe("/home/user/project/../../etc/passwd");
  });

  it("handles the project root itself", () => {
    // Empty relative path gets the absolute fallback
    expect(toRepoPolicyPath(root, root)).toBe(root);
  });
});
