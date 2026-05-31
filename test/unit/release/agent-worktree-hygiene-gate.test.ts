import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import packageJson from "../../../package.json";

const repoRoot = resolve(import.meta.dirname, "../../..");
const ACTIONS_CACHE_V4_SHA = "0057852bfaa89a56745cba8c7296529d2fc39830";

function readRepoFile(filePath: string): string {
  return readFileSync(resolve(repoRoot, filePath), "utf8");
}

describe("release: agent worktree hygiene gate", () => {
  it("keeps agent worktree hygiene wired into release and pre-commit gates", () => {
    const preCommitHook = readRepoFile("scripts/hooks/pre-commit");
    const releaseRunbook = readRepoFile("docs/method/release-runbook.md");
    const invariant = readRepoFile("docs/invariants/agent-worktree-hygiene.md");

    expect(packageJson.scripts["guard:agent-worktrees"]).toBe(
      "tsx scripts/check-agent-worktree-hygiene.ts",
    );
    expect(packageJson.scripts["release:check"]).toContain(
      "pnpm guard:agent-worktrees && pnpm schema:structural-history:check && pnpm lint",
    );
    expect(preCommitHook).toContain("pnpm guard:agent-worktrees");
    expect(releaseRunbook).toContain("`pnpm guard:agent-worktrees`");
    expect(invariant).toContain("scripts/check-agent-worktree-hygiene.ts");
  });

  it("pins the Wesley cache action to the verified actions/cache v4 commit", () => {
    const workflowText = [
      readRepoFile(".github/workflows/ci.yml"),
      readRepoFile(".github/workflows/release.yml"),
    ].join("\n");

    const cacheActionRefs = [...workflowText.matchAll(/uses:\s+actions\/cache@([^\s]+)/gu)].map(
      ([, ref]) => ref,
    );

    expect(cacheActionRefs).toEqual([
      ACTIONS_CACHE_V4_SHA,
      ACTIONS_CACHE_V4_SHA,
      ACTIONS_CACHE_V4_SHA,
    ]);
  });
});
