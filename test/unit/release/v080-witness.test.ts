import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function readReleaseWitness(): string {
  return fs.readFileSync(path.join(ROOT, "docs/method/releases/v0.8.0/verification.md"), "utf8");
}

describe("v0.8.0 release witness", () => {
  it("records the pushed release blocker branch instead of stale pending sync text", () => {
    const witness = readReleaseWitness();

    expect(witness).toContain(
      "- Release blocker branch synced with origin: yes, `origin/release/v0.8.0-blockers`",
    );
    expect(witness).not.toContain("Release blocker branch synced with origin: pending");
  });

  it("records the merged-main graft review release comparison", () => {
    const witness = readReleaseWitness();

    expect(witness).toContain("`pnpm graft review --base v0.7.1 --head HEAD --json`");
    expect(witness).toContain("| Total changed files | `225` |");
    expect(witness).toContain("| Structural files | `54` |");
    expect(witness).toContain("| Test files | `44` |");
    expect(witness).toMatch(
      /Dependency and lockfile signature changes were observed as non-blocking\s+release-surface movement/,
    );
  });

  it("records the final tag and publication evidence after release", () => {
    const witness = readReleaseWitness();

    expect(witness).toContain("- Final release commit: `a579229 docs: refresh v0.8.0 release witness`");
    expect(witness).toContain("- Tag: `v0.8.0`, annotated and signed");
    expect(witness).toContain("- Release workflow: pass, GitHub Actions run `25842182477`");
    expect(witness).toContain("- npm publish by workflow: pass with OIDC provenance");
    expect(witness).toContain("- Direct npm registry verification: pass,");
    expect(witness).not.toContain("- Tag: pending");
    expect(witness).not.toContain("- npm publish by workflow: pending");
  });
});
