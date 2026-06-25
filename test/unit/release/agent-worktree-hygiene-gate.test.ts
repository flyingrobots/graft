import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import packageJson from "../../../package.json";

const repoRoot = resolve(import.meta.dirname, "../../..");
const COMMIT_SHA_PATTERN = /^[0-9a-f]{40}$/u;

function readRepoFile(filePath: string): string {
  return readFileSync(resolve(repoRoot, filePath), "utf8");
}

function readManifestWesleyCliVersion(): string {
  const parsed = JSON.parse(
    readRepoFile("schemas/graft-structural-history.manifest.json"),
  ) as unknown;
  if (parsed === null || typeof parsed !== "object") {
    throw new Error("Structural history manifest must be a JSON object.");
  }
  const version = (parsed as { readonly wesleyCliVersion?: unknown }).wesleyCliVersion;
  if (typeof version !== "string" || version.length === 0) {
    throw new Error("Structural history manifest must declare wesleyCliVersion.");
  }
  return version;
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

  it("installs the declared crates.io Wesley CLI through commit-pinned cache steps", () => {
    const workflowText = [
      readRepoFile(".github/workflows/ci.yml"),
      readRepoFile(".github/workflows/release.yml"),
    ].join("\n");
    const wesleyCliVersion = readManifestWesleyCliVersion();

    const cacheActionRefs = [...workflowText.matchAll(/uses:\s+actions\/cache@([^\s]+)/gu)]
      .map((match) => match[1])
      .filter((ref): ref is string => ref !== undefined);

    expect(cacheActionRefs.length).toBeGreaterThan(0);
    expect(cacheActionRefs.every((ref) => COMMIT_SHA_PATTERN.test(ref))).toBe(true);
    expect(workflowText).toContain(`WESLEY_CLI_VERSION: "${wesleyCliVersion}"`);
    expect(workflowText).toContain("wesley-cli-crates-io-${{ env.WESLEY_CLI_VERSION }}");
    expect(workflowText).toContain("--version \"$WESLEY_CLI_VERSION\"");
    expect(workflowText).not.toContain("WESLEY_CLI_REVISION");
    expect(workflowText).not.toContain("--git https://github.com/flyingrobots/wesley.git");
    expect(workflowText).not.toContain("--rev \"$WESLEY_CLI_REVISION\"");
  });
});
