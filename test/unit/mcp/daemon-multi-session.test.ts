import { afterEach, describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { createInProcessDaemonHarness } from "../../helpers/daemon.js";
import { cleanupTestRepo, createCommittedTestRepo, git } from "../../helpers/git.js";

const cleanups: (() => Promise<void> | void)[] = [];

afterEach(async () => {
  while (cleanups.length > 0) {
    await cleanups.pop()!();
  }
});

function createCommittedRepo(prefix: string): string {
  const repoDir = createCommittedTestRepo(prefix);
  cleanups.push(() => {
    cleanupTestRepo(repoDir);
  });
  return repoDir;
}

describe("mcp: in-process daemon shared sessions", () => {
  it("shares daemon-wide workspace authorization and bound session state across sessions on the same repo", { timeout: 15_000 }, async () => {
    const repoDir = createCommittedRepo("graft-daemon-shared-auth-");
    fs.writeFileSync(path.join(repoDir, "app.ts"), [
      "export function greet(name: string): string {",
      "  return `hello ${name}`;",
      "}",
      "",
    ].join("\n"));
    git(repoDir, "add -A");
    git(repoDir, "commit -m feature");

    const harness = await createInProcessDaemonHarness();
    cleanups.push(() => harness.close());
    const sessionA = harness.createSession();
    const sessionB = harness.createSession();

    const authorization = await sessionA.callToolJson<{
      ok: boolean;
      authorization: { capabilityProfile: { runCapture: boolean } };
    }>("workspace_authorize", { cwd: repoDir, runCapture: true });
    expect(authorization.ok).toBe(true);
    expect(authorization.authorization.capabilityProfile.runCapture).toBe(true);

    const bindA = await sessionA.callToolJson<{
      ok: boolean;
      repoId: string;
      bindState: string;
    }>("workspace_bind", { cwd: repoDir });
    const bindB = await sessionB.callToolJson<{
      ok: boolean;
      repoId: string;
      bindState: string;
    }>("workspace_bind", { cwd: repoDir });
    expect(bindA).toEqual(expect.objectContaining({ ok: true, bindState: "bound" }));
    expect(bindB).toEqual(expect.objectContaining({ ok: true, bindState: "bound" }));
    expect(bindA.repoId).toBe(bindB.repoId);

    const authorizations = await sessionA.callToolJson<{
      workspaces: { activeSessions: number }[];
    }>("workspace_authorizations", {});
    expect(authorizations.workspaces).toEqual([
      expect.objectContaining({ activeSessions: 2 }),
    ]);

    const daemonSessions = await sessionA.callToolJson<{
      sessions: {
        bindState: string;
        causalSessionId: string | null;
        checkoutEpochId: string | null;
      }[];
    }>("daemon_sessions", {});
    expect(daemonSessions.sessions).toHaveLength(2);
    expect(daemonSessions.sessions.every((session) => session.bindState === "bound")).toBe(true);
    expect(daemonSessions.sessions.every((session) =>
      typeof session.causalSessionId === "string" && typeof session.checkoutEpochId === "string"
    )).toBe(true);

    const daemonRepos = await sessionA.callToolJson<{
      repos: {
        repoId: string;
        authorizedWorkspaces: number;
        boundSessions: number;
        activeWorktrees: number;
      }[];
    }>("daemon_repos", {});
    expect(daemonRepos.repos).toEqual([
      expect.objectContaining({
        repoId: bindA.repoId,
        authorizedWorkspaces: 1,
        boundSessions: 2,
        activeWorktrees: 1,
      }),
    ]);

    const findA = await sessionA.callToolJson<{ total: number }>("code_find", { query: "greet" });
    const findB = await sessionB.callToolJson<{ total: number }>("code_find", { query: "greet" });
    expect(findA.total).toBe(1);
    expect(findB.total).toBe(1);

    const structuralMap = await sessionA.callToolJson<{ files: { path: string }[] }>("graft_map", {});
    expect(structuralMap.files.some((file) => file.path === "app.ts")).toBe(true);

    const daemonStatus = await sessionA.callToolJson<{
      workers: { completedTasks: number; mode: string };
    }>("daemon_status", {});
    expect(daemonStatus.workers.mode).toBe("inline");
    expect(daemonStatus.workers.completedTasks).toBeGreaterThanOrEqual(1);
  });

  it("surfaces shared-worktree posture and explicit handoff for two daemon sessions on one worktree", async () => {
    const repoDir = createCommittedRepo("graft-daemon-shared-worktree-");

    const harness = await createInProcessDaemonHarness();
    cleanups.push(() => harness.close());
    const sessionA = harness.createSession();
    const sessionB = harness.createSession();

    const authorization = await sessionA.callToolJson<{ ok: boolean }>("workspace_authorize", { cwd: repoDir });
    expect(authorization.ok).toBe(true);

    await sessionA.callToolJson("workspace_bind", { cwd: repoDir });
    await sessionB.callToolJson("workspace_bind", { cwd: repoDir });

    const sharedStatus = await sessionB.callToolJson<{
      nextAction: string;
      activeCausalWorkspace: {
        repoConcurrency: {
          posture: string;
          authority: string;
          observedWorktreeCount: number;
        };
      } | null;
    }>("causal_status", {});
    expect(sharedStatus.activeCausalWorkspace?.repoConcurrency).toEqual(expect.objectContaining({
      posture: "shared_worktree",
      authority: "daemon_live_sessions",
      observedWorktreeCount: 1,
    }));
    expect(sharedStatus.nextAction).toBe("coordinate_shared_worktree_before_continuing");

    const attached = await sessionB.callToolJson<{
      ok: boolean;
      nextAction: string;
      activeCausalWorkspace: {
        repoConcurrency: {
          posture: string;
          authority: string;
          overlappingPathCount: number;
        };
      } | null;
    }>("causal_attach", {
      actor_kind: "agent",
      actor_id: "agent:two",
      from_actor_id: "agent:one",
    });
    expect(attached.ok).toBe(true);
    expect(attached.activeCausalWorkspace?.repoConcurrency).toEqual(expect.objectContaining({
      posture: "exclusive",
      authority: "explicit_handoff",
      overlappingPathCount: 0,
    }));
    expect(attached.nextAction).toBe("continue_active_causal_workspace");
  });

  it("surfaces divergent checkout posture for same-repo daemon sessions on different worktrees", async () => {
    const repoDir = createCommittedRepo("graft-daemon-divergent-checkout-");
    const featureWorktreeDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-daemon-worktree-"));
    git(repoDir, `worktree add -b feature/concurrency ${featureWorktreeDir}`);
    cleanups.push(() => {
      try {
        git(repoDir, `worktree remove --force ${featureWorktreeDir}`);
      } catch {
        fs.rmSync(featureWorktreeDir, { recursive: true, force: true });
      }
    });

    const harness = await createInProcessDaemonHarness();
    cleanups.push(() => harness.close());
    const sessionA = harness.createSession();
    const sessionB = harness.createSession();

    await sessionA.callToolJson("workspace_authorize", { cwd: repoDir });
    await sessionA.callToolJson("workspace_authorize", { cwd: featureWorktreeDir });
    await sessionA.callToolJson("workspace_bind", { cwd: repoDir });
    await sessionB.callToolJson("workspace_bind", { cwd: featureWorktreeDir });

    const featureStatus = await sessionB.callToolJson<{
      nextAction: string;
      activeCausalWorkspace: {
        repoConcurrency: {
          posture: string;
          authority: string;
          observedWorktreeCount: number;
        };
      } | null;
    }>("causal_status", {});
    expect(featureStatus.activeCausalWorkspace?.repoConcurrency).toEqual(expect.objectContaining({
      posture: "divergent_checkout",
      authority: "daemon_live_sessions",
      observedWorktreeCount: 2,
    }));
    expect(featureStatus.nextAction).toBe("review_divergent_checkout_before_continuing");
  });
});
