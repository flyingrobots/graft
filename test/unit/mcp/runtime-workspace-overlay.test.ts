import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { nodeFs } from "../../../src/adapters/node-fs.js";
import { nodeGit } from "../../../src/adapters/node-git.js";
import {
  buildRuntimeWorkspaceOverlayFooting,
  inspectGitHookBootstrap,
} from "../../../src/mcp/runtime-workspace-overlay.js";
import { cleanupTestRepo, createTestRepo, git } from "../../helpers/git.js";

describe("mcp: runtime workspace overlay footing", () => {
  it("reports absent target-repo git transition hooks by default", async () => {
    const repoDir = createTestRepo("graft-runtime-overlay-hooks-absent-");
    try {
      const gitCommonDir = git(repoDir, "rev-parse --git-common-dir");
      const hookBootstrap = await inspectGitHookBootstrap(
        nodeFs,
        nodeGit,
        repoDir,
        path.resolve(repoDir, gitCommonDir),
      );

      expect(hookBootstrap.posture).toBe("absent");
      expect(hookBootstrap.configuredCoreHooksPath).toBeNull();
      expect(hookBootstrap.resolvedHooksPath).toBe(path.join(repoDir, ".git", "hooks"));
      expect(hookBootstrap.presentHooks).toEqual([]);
      expect(hookBootstrap.missingHooks).toEqual([
        "post-checkout",
        "post-merge",
        "post-rewrite",
      ]);
      expect(hookBootstrap.supportsCheckoutBoundaries).toBe(false);
    } finally {
      cleanupTestRepo(repoDir);
    }
  });

  it("reports configured external git transition hooks without overclaiming Graft support", async () => {
    const repoDir = createTestRepo("graft-runtime-overlay-hooks-external-");
    try {
      fs.mkdirSync(path.join(repoDir, ".githooks"), { recursive: true });
      fs.writeFileSync(path.join(repoDir, ".githooks", "post-checkout"), "#!/bin/sh\necho external\n");
      git(repoDir, "config core.hooksPath .githooks");
      const gitCommonDir = git(repoDir, "rev-parse --git-common-dir");

      const hookBootstrap = await inspectGitHookBootstrap(
        nodeFs,
        nodeGit,
        repoDir,
        path.resolve(repoDir, gitCommonDir),
      );

      expect(hookBootstrap.posture).toBe("external_unknown");
      expect(hookBootstrap.configuredCoreHooksPath).toBe(".githooks");
      expect(hookBootstrap.resolvedHooksPath).toBe(path.join(repoDir, ".githooks"));
      expect(hookBootstrap.presentHooks).toEqual(["post-checkout"]);
      expect(hookBootstrap.missingHooks).toEqual(["post-merge", "post-rewrite"]);
      expect(hookBootstrap.supportsCheckoutBoundaries).toBe(false);
    } finally {
      cleanupTestRepo(repoDir);
    }
  });

  it("builds degraded inferred overlay footing from current repo state", async () => {
    const repoDir = createTestRepo("graft-runtime-overlay-footing-");
    try {
      fs.writeFileSync(path.join(repoDir, "app.ts"), "export const ready = true;\n");
      git(repoDir, "add -A");
      git(repoDir, "commit -m init");

      const gitCommonDir = git(repoDir, "rev-parse --git-common-dir");
      const footing = await buildRuntimeWorkspaceOverlayFooting(
        nodeFs,
        nodeGit,
        repoDir,
        path.resolve(repoDir, gitCommonDir),
        {
          checkoutEpoch: 3,
          lastTransition: null,
          workspaceOverlayId: "overlay:test",
          workspaceOverlay: {
            dirty: true,
            totalPaths: 1,
            stagedPaths: 0,
            changedPaths: 1,
            untrackedPaths: 0,
            actorGuess: "unknown",
            confidence: "low",
            evidence: {
              source: "git status --porcelain",
              reflogSubject: null,
              sample: [" M app.ts"],
            },
          },
        },
      );

      expect(footing.observationMode).toBe("inferred_between_tool_calls");
      expect(footing.degraded).toBe(true);
      expect(footing.degradedReason).toBe("target_repo_hooks_absent");
      expect(footing.checkoutEpoch).toBe(3);
      expect(footing.workspaceOverlayId).toBe("overlay:test");
      expect(footing.hookBootstrap.posture).toBe("absent");
    } finally {
      cleanupTestRepo(repoDir);
    }
  });
});
