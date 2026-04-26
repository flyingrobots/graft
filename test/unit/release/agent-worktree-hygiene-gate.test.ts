import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import packageJson from "../../../package.json";

const repoRoot = resolve(import.meta.dirname, "../../..");

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
      "pnpm guard:agent-worktrees && pnpm lint",
    );
    expect(preCommitHook).toContain("pnpm guard:agent-worktrees");
    expect(releaseRunbook).toContain("`pnpm guard:agent-worktrees`");
    expect(invariant).toContain("scripts/check-agent-worktree-hygiene.ts");
  });
});
