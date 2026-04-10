import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { nodeFs } from "../../../src/adapters/node-fs.js";
import { nodeGit } from "../../../src/adapters/node-git.js";
import { runInit } from "../../../src/cli/init.js";
import {
  buildRuntimeWorkspaceOverlayFooting,
  inspectGitHookBootstrap,
} from "../../../src/mcp/runtime-workspace-overlay.js";
import { cleanupTestRepo, createTestRepo, git } from "../../helpers/git.js";

function silentWriter() {
  return { write(): true { return true; } };
}

function writeHookEvent(repoDir: string, event: {
  hookName: string;
  hookArgs: string[];
  worktreeRoot: string;
  observedAt: string;
}): void {
  const runtimeDir = path.join(repoDir, ".graft", "runtime");
  fs.mkdirSync(runtimeDir, { recursive: true });
  fs.appendFileSync(
    path.join(runtimeDir, "git-transitions.ndjson"),
    `${JSON.stringify(event)}\n`,
  );
}

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

  it("recognizes installed graft target-repo hooks and narrows degradation honestly", async () => {
    const repoDir = createTestRepo("graft-runtime-overlay-hooks-installed-");
    try {
      runInit({
        cwd: repoDir,
        args: ["--write-target-git-hooks"],
        stdout: silentWriter(),
        stderr: silentWriter(),
      });
      const gitCommonDir = git(repoDir, "rev-parse --git-common-dir");

      const footing = await buildRuntimeWorkspaceOverlayFooting(
        nodeFs,
        nodeGit,
        repoDir,
        path.resolve(repoDir, gitCommonDir),
        {
          checkoutEpoch: 2,
          lastTransition: null,
          workspaceOverlayId: "overlay:hooked",
          workspaceOverlay: null,
        },
      );

      expect(footing.observationMode).toBe("inferred_between_tool_calls");
      expect(footing.degraded).toBe(true);
      expect(footing.degradedReason).toBe("local_edit_watchers_absent");
      expect(footing.hookBootstrap.posture).toBe("installed");
      expect(footing.hookBootstrap.presentHooks).toEqual([
        "post-checkout",
        "post-merge",
        "post-rewrite",
      ]);
      expect(footing.hookBootstrap.missingHooks).toEqual([]);
      expect(footing.hookBootstrap.supportsCheckoutBoundaries).toBe(true);
      expect(footing.latestHookEvent).toBeNull();
    } finally {
      cleanupTestRepo(repoDir);
    }
  });

  it("promotes footing to hook-observed when an installed transition hook fires", async () => {
    const repoDir = createTestRepo("graft-runtime-overlay-hook-observed-");
    try {
      runInit({
        cwd: repoDir,
        args: ["--write-target-git-hooks"],
        stdout: silentWriter(),
        stderr: silentWriter(),
      });
      writeHookEvent(repoDir, {
        hookName: "post-checkout",
        hookArgs: ["oldsha", "newsha", "1"],
        worktreeRoot: repoDir,
        observedAt: new Date().toISOString(),
      });
      const gitCommonDir = git(repoDir, "rev-parse --git-common-dir");

      const footing = await buildRuntimeWorkspaceOverlayFooting(
        nodeFs,
        nodeGit,
        repoDir,
        path.resolve(repoDir, gitCommonDir),
        {
          checkoutEpoch: 2,
          lastTransition: null,
          workspaceOverlayId: null,
          workspaceOverlay: null,
        },
      );

      expect(footing.observationMode).toBe("hook_observed_checkout_boundaries");
      expect(footing.degraded).toBe(true);
      expect(footing.degradedReason).toBe("local_edit_watchers_absent");
      expect(footing.latestHookEvent).toEqual(
        expect.objectContaining({
          hookName: "post-checkout",
          hookArgs: ["oldsha", "newsha", "1"],
          worktreeRoot: repoDir,
        }),
      );
    } finally {
      cleanupTestRepo(repoDir);
    }
  });
});
