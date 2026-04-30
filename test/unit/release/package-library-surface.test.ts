import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import packageJson from "../../../package.json";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

describe("release package library surface", () => {
  it("ships built artifacts without publishing source internals", () => {
    expect(packageJson.files).toEqual(expect.arrayContaining(["dist/"]));
    expect(packageJson.files).not.toContain("src/");
  });

  it("declares a root import/export contract", () => {
    expect(packageJson.main).toBe("./dist/index.js");
    expect(packageJson.types).toBe("./dist/index.d.ts");
    expect(packageJson.sideEffects).toBe(false);
    expect(packageJson.exports).toEqual(expect.objectContaining({
      ".": {
        types: "./dist/index.d.ts",
        import: "./dist/index.js",
      },
    }));
  });

  it("does not publish implementation subpath exports as semver-public modules", () => {
    expect(Object.keys(packageJson.exports).sort()).toEqual([
      ".",
      "./package.json",
    ]);
  });

  it("builds dist automatically before packing and blocks manual publish drift", () => {
    expect(packageJson.scripts.prepack).toBe("pnpm build");
    expect(packageJson.scripts.prepublishOnly).toBe("pnpm release:check");
  });

  it("keeps TypeScript execution tooling out of runtime dependencies", () => {
    expect(packageJson.dependencies).not.toHaveProperty("tsx");
    expect(packageJson.devDependencies).toHaveProperty("tsx");
  });

  it("runs the published bin from built dist output", () => {
    const bin = fs.readFileSync(path.join(ROOT, "bin/graft.js"), "utf8");
    expect(bin.startsWith("#!/usr/bin/env node")).toBe(true);
    expect(bin).toContain("../dist/cli/entrypoint.js");
    expect(bin).not.toContain("../src/");
    expect(bin).not.toContain("tsx");
  });
});
