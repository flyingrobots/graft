import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import packageJson from "../../package.json";

const README = path.resolve(import.meta.dirname, "../../README.md");
const PUBLIC_API = path.resolve(import.meta.dirname, "../../docs/public-api.md");
const RELEASE = path.resolve(import.meta.dirname, "../../docs/method/release.md");
const RELEASE_RUNBOOK = path.resolve(import.meta.dirname, "../../docs/method/release-runbook.md");
const PUBLIC_API_INVARIANT = path.resolve(
  import.meta.dirname,
  "../../docs/invariants/public-api-root-import-only.md",
);

function read(pathname: string): string {
  return fs.readFileSync(pathname, "utf-8");
}

describe("0083 public api contract and stability policy", () => {
  it("Can an integrator point to one repo-truth document that says the only semver-public module path is `@flyingrobots/graft`, and that deep imports into `src/` or `dist/` are not public contract?", () => {
    const contract = read(PUBLIC_API);
    const invariant = read(PUBLIC_API_INVARIANT);

    expect(contract).toContain("The only semver-public JavaScript module path is");
    expect(contract).toContain('import { ... } from "@flyingrobots/graft";');
    expect(contract).toContain("Deep imports into `src/`, `dist/`, or other package-internal paths are");
    expect(contract).toContain("not public contract.");
    expect(invariant).toContain("The only semver-public JavaScript module path for Graft is:");
    expect(Object.keys(packageJson.exports).sort()).toEqual([
      ".",
      "./package.json",
    ]);
  });

  it("Does that same contract distinguish direct typed integration surfaces from bridge/host surfaces instead of treating every root export as one undifferentiated bucket?", () => {
    const contract = read(PUBLIC_API);

    expect(contract).toContain("### 1. Direct Repo-Local Integration");
    expect(contract).toContain("### 2. Buffer-Native Editor Integration");
    expect(contract).toContain("### 3. Tool Bridge Surface");
    expect(contract).toContain("### 4. Host / Runtime Surface");
  });

  it("Do package metadata, release doctrine, and README links all agree on the public API posture instead of leaving the root export contract implied?", () => {
    expect(read(README)).toContain("[Public API Contract](./docs/public-api.md)");
    expect(read(RELEASE)).toContain("New public root-package exports or changed documented API behavior");
    expect(read(RELEASE_RUNBOOK)).toContain("semver-public module path(s) and documented public API surface");
    expect(read(RELEASE_RUNBOOK)).toContain("If documented public API changed, verify the release notes name the");
    expect(read(RELEASE_RUNBOOK)).toContain("changed exports, classify the change as additive or breaking");
  });

  it("Can release review classify public API additions and breaking changes as SemVer-relevant facts before another API expansion lands?", () => {
    const release = read(RELEASE);
    const contract = read(PUBLIC_API);

    expect(release).toContain("documented public API exports/types/semantics");
    expect(release).toContain("public root exports, or additive public API fields/options");
    expect(contract).toContain("removing, renaming, or incompatibly changing documented root exports");
    expect(contract).toContain("Any release that changes the documented public API must answer these");
    expect(contract).toContain("questions explicitly:");
  });
});
