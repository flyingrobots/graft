import { describe, expect, it } from "vitest";
import packageJson from "../../../package.json";

describe("release package library surface", () => {
  it("ships built artifacts for the root import surface", () => {
    expect(packageJson.files).toEqual(expect.arrayContaining([
      "dist/",
      "src/",
    ]));
  });

  it("declares a root import/export contract", () => {
    expect(packageJson.main).toBe("./dist/index.js");
    expect(packageJson.types).toBe("./dist/index.d.ts");
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

  it("builds dist automatically before packing", () => {
    expect(packageJson.scripts.prepack).toBe("pnpm build");
  });
});
