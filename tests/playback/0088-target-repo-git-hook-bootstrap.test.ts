import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runInit } from "../../src/cli/init.js";
import { cleanupTestRepo, createTestRepo, git } from "../../test/helpers/git.js";
import { createIsolatedServer, parse } from "../../test/helpers/mcp.js";

const cleanups: (() => void)[] = [];

afterEach(() => {
  while (cleanups.length > 0) {
    cleanups.pop()!();
  }
});

function silentWriter() {
  return { write(): true { return true; } };
}

function createBufferWriter() {
  const chunks: string[] = [];
  return {
    write(chunk: string): true {
      chunks.push(chunk);
      return true;
    },
    text(): string {
      return chunks.join("");
    },
  };
}

function createCommittedRepo(prefix: string): string {
  const repoDir = createTestRepo(prefix);
  cleanups.push(() => {
    cleanupTestRepo(repoDir);
  });
  fs.writeFileSync(path.join(repoDir, "app.ts"), "export const ready = true;\n");
  git(repoDir, "add -A");
  git(repoDir, "commit -m init");
  return repoDir;
}

function writeHookEvent(repoDir: string, event: {
  hookName: string;
  hookArgs: string[];
  worktreeRoot: string;
  observedAt: string;
}): void {
  const runtimeDir = path.join(repoDir, ".graft", "runtime");
  fs.mkdirSync(runtimeDir, { recursive: true });
  fs.appendFileSync(path.join(runtimeDir, "git-transitions.ndjson"), `${JSON.stringify(event)}\n`);
}

describe("0088 target-repo git hook bootstrap", () => {
  it("writes target-repo git transition hooks with an explicit flag", () => {
    const repoDir = createCommittedRepo("graft-playback-target-hooks-");

    const stdout = createBufferWriter();
    runInit({
      cwd: repoDir,
      args: ["--json", "--write-target-git-hooks"],
      stdout,
      stderr: silentWriter(),
    });

    const result = JSON.parse(stdout.text()) as {
      ok: boolean;
      actions: { action: string; label: string; detail?: string }[];
    };
    expect(result.ok).toBe(true);

    // Verify the init result reports all three hooks were created
    const hookActions = result.actions.filter((a) => a.label.endsWith("post-checkout") || a.label.endsWith("post-merge") || a.label.endsWith("post-rewrite"));
    expect(hookActions).toHaveLength(3);
    for (const a of hookActions) {
      expect(a.action).toBe("create");
    }

    // Verify each hook is executable (behavioral check)
    const hooksDir = path.join(repoDir, ".git", "hooks");
    for (const hook of ["post-checkout", "post-merge", "post-rewrite"]) {
      expect(() => {
        execSync(`sh ${path.join(hooksDir, hook)} aaa bbb 1`, { cwd: repoDir, stdio: "ignore" });
      }).not.toThrow();
    }
  });

  it("respects configured core.hooksPath and preserves external target-repo hooks", () => {
    const repoDir = createCommittedRepo("graft-playback-target-core-hooks-");

    fs.mkdirSync(path.join(repoDir, ".githooks"), { recursive: true });
    git(repoDir, "config core.hooksPath .githooks");
    fs.writeFileSync(path.join(repoDir, ".githooks", "post-checkout"), "#!/bin/sh\necho external\n");

    const stdout = createBufferWriter();
    runInit({
      cwd: repoDir,
      args: ["--json", "--write-target-git-hooks"],
      stdout,
      stderr: silentWriter(),
    });

    const result = JSON.parse(stdout.text()) as {
      ok: boolean;
      actions: { action: string; label: string; detail?: string }[];
    };
    expect(result.ok).toBe(true);

    // External post-checkout should be preserved, not overwritten
    const checkoutAction = result.actions.find((a) => a.label.endsWith("post-checkout"));
    expect(checkoutAction).toBeDefined();
    expect(checkoutAction!.action).toBe("exists");
    expect(checkoutAction!.detail).toBe("external hook preserved");

    // Other hooks should be created at the custom hooksPath
    const mergeAction = result.actions.find((a) => a.label.endsWith("post-merge"));
    expect(mergeAction).toBeDefined();
    expect(mergeAction!.action).toBe("create");
    const rewriteAction = result.actions.find((a) => a.label.endsWith("post-rewrite"));
    expect(rewriteAction).toBeDefined();
    expect(rewriteAction!.action).toBe("create");

    // Verify external hook still works (behavioral check)
    const output = execSync("sh .githooks/post-checkout", { cwd: repoDir, encoding: "utf-8" });
    expect(output.trim()).toBe("external");
  });

  it("installed target-repo git hooks append transition events when executed", () => {
    const repoDir = createCommittedRepo("graft-playback-target-exec-");
    const realWorktreeRoot = fs.realpathSync(repoDir);

    runInit({
      cwd: repoDir,
      args: ["--write-target-git-hooks"],
      stdout: silentWriter(),
      stderr: silentWriter(),
    });

    execSync("sh .git/hooks/post-checkout oldsha newsha 1", { cwd: repoDir, stdio: "ignore" });

    const logPath = path.join(repoDir, ".graft", "runtime", "git-transitions.ndjson");
    const events = fs.readFileSync(logPath, "utf-8").trim().split("\n").map((line) => JSON.parse(line) as {
      hookName: string;
      hookArgs: string[];
      worktreeRoot: string;
    });

    expect(events.at(-1)).toEqual(expect.objectContaining({
      hookName: "post-checkout",
      hookArgs: ["oldsha", "newsha", "1"],
      worktreeRoot: realWorktreeRoot,
    }));
  });

  it("returns a JSON error when target-repo hook bootstrap is requested outside a git worktree", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-playback-no-git-"));
    cleanups.push(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });
    const stdout = createBufferWriter();
    const stderr = createBufferWriter();

    runInit({
      cwd: tmpDir,
      args: ["--json", "--write-target-git-hooks"],
      stdout,
      stderr,
    });

    const parsed = JSON.parse(stdout.text()) as { ok: boolean; error: string };
    process.exitCode = 0;
    expect(parsed.ok).toBe(false);
    expect(parsed.error).toBe("--write-target-git-hooks requires a git worktree");
  });

  it("surfaces installed target-repo git hooks without pretending local edit reactivity", async () => {
    const repoDir = createCommittedRepo("graft-playback-hook-installed-");

    runInit({
      cwd: repoDir,
      args: ["--write-target-git-hooks"],
      stdout: silentWriter(),
      stderr: silentWriter(),
    });

    const isolated = createIsolatedServer({
      projectRoot: repoDir,
      graftDir: path.join(repoDir, ".graft"),
    });
    cleanups.push(() => {
      isolated.cleanup();
    });

    const doctor = parse(await isolated.server.callTool("doctor", {}));
    const footing = doctor["workspaceOverlayFooting"] as {
      observationMode: string;
      degradedReason: string;
      hookBootstrap: {
        posture: string;
        presentHooks: string[];
        missingHooks: string[];
        supportsCheckoutBoundaries: boolean;
      };
      latestHookEvent: null | Record<string, unknown>;
    };

    expect(footing.observationMode).toBe("inferred_between_tool_calls");
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
  });

  it("surfaces hook-observed checkout boundaries after an installed transition hook fires", async () => {
    const repoDir = createCommittedRepo("graft-playback-hook-observed-");

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

    const isolated = createIsolatedServer({
      projectRoot: repoDir,
      graftDir: path.join(repoDir, ".graft"),
    });
    cleanups.push(() => {
      isolated.cleanup();
    });

    const doctor = parse(await isolated.server.callTool("doctor", {}));
    const footing = doctor["workspaceOverlayFooting"] as {
      observationMode: string;
      boundaryAuthority: string;
      latestHookEvent: {
        hookName: string;
        hookArgs: string[];
        worktreeRoot: string;
      } | null;
    };

    expect(footing.observationMode).toBe("hook_observed_checkout_boundaries");
    expect(footing.boundaryAuthority).toBe("hook_observed");
    expect(footing.latestHookEvent).toEqual(expect.objectContaining({
      hookName: "post-checkout",
      hookArgs: ["oldsha", "newsha", "1"],
      worktreeRoot: repoDir,
    }));
  });
});
