import { afterEach, describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { resolveWorkspaceRequest } from "../../../src/mcp/workspace-router-resolution.js";
import {
  openWarpSidecar,
  resolveWarpSidecarLocation,
} from "../../../src/warp/sidecar.js";
import { buildSessionWarpWriterId } from "../../../src/warp/writer-id.js";
import { createInProcessDaemonHarness } from "../../helpers/daemon.js";
import {
  cleanupTestRepo,
  createCommittedTestRepo,
  git,
  testGitClient,
} from "../../helpers/git.js";

const cleanups: (() => Promise<void> | void)[] = [];

afterEach(async () => {
  while (cleanups.length > 0) {
    await cleanups.pop()!();
  }
});

function createDivergedWorktrees(): { primary: string; secondary: string } {
  const primary = fs.realpathSync(createCommittedTestRepo(
    "graft-sidecar-routing-",
    { "baseline.ts": "export const baseline = true;\n" },
  ));
  const secondaryPath = `${primary}-secondary`;
  git(primary, `worktree add -b secondary ${secondaryPath}`);
  const secondary = fs.realpathSync(secondaryPath);

  fs.writeFileSync(
    path.join(primary, "primary-only.ts"),
    "export function primaryOnly(): string { return 'primary'; }\n",
  );
  git(primary, "add primary-only.ts");
  git(primary, "commit -m primary-only");

  fs.writeFileSync(
    path.join(secondary, "secondary-only.ts"),
    "export function secondaryOnly(): string { return 'secondary'; }\n",
  );
  git(secondary, "add secondary-only.ts");
  git(secondary, "commit -m secondary-only");

  cleanups.push(() => {
    fs.rmSync(secondary, { recursive: true, force: true });
    cleanupTestRepo(primary);
  });
  return { primary, secondary };
}

async function resolvedWorkspace(cwd: string) {
  const resolved = await resolveWorkspaceRequest(testGitClient, { cwd });
  if ("code" in resolved) {
    throw new Error(resolved.message);
  }
  return resolved;
}

async function readEventSessionIds(
  graphRoot: string,
  sidecarRepo: string,
  writerId: string,
): Promise<Set<string>> {
  const app = await openWarpSidecar({ graphRoot, sidecarRepo, writerId });
  const observer = await app.observer({
    match: "lh:*",
    expose: ["eventKind", "transportSessionId"],
  });
  const sessionIds = new Set<string>();
  for (const nodeId of await observer.getNodes()) {
    const props = await observer.getNodeProps(nodeId);
    if (props?.["eventKind"] === "read" && typeof props["transportSessionId"] === "string") {
      sessionIds.add(props["transportSessionId"]);
    }
  }
  return sessionIds;
}

describe("mcp: WARP sidecar routing", { timeout: 30_000 }, () => {
  it("keeps parallel agents in one worktree on independent graph histories", async () => {
    const worktree = fs.realpathSync(createCommittedTestRepo(
      "graft-sidecar-same-worktree-",
      {
        "alpha.ts": "export const alpha = true;\n",
        "beta.ts": "export const beta = true;\n",
      },
    ));
    cleanups.push(() => {
      cleanupTestRepo(worktree);
    });
    const harness = await createInProcessDaemonHarness();
    cleanups.push(() => harness.close());
    const alphaSession = harness.createSession();
    const betaSession = harness.createSession();

    await Promise.all([
      alphaSession.callToolJson("safe_read", { cwd: worktree, path: "alpha.ts" }),
      betaSession.callToolJson("safe_read", { cwd: worktree, path: "beta.ts" }),
    ]);

    const workspace = await resolvedWorkspace(worktree);
    const graphRoot = path.join(harness.rootDir, "graphs");
    const alphaWriterId = buildSessionWarpWriterId(alphaSession.sessionId);
    const betaWriterId = buildSessionWarpWriterId(betaSession.sessionId);
    const alphaLocation = resolveWarpSidecarLocation(graphRoot, {
      ...workspace,
      writerId: alphaWriterId,
    });
    const betaLocation = resolveWarpSidecarLocation(graphRoot, {
      ...workspace,
      writerId: betaWriterId,
    });

    expect(alphaLocation.repoPath).not.toBe(betaLocation.repoPath);
    await expect(readEventSessionIds(graphRoot, alphaLocation.repoPath, alphaWriterId))
      .resolves.toEqual(new Set([alphaSession.sessionId]));
    await expect(readEventSessionIds(graphRoot, betaLocation.repoPath, betaWriterId))
      .resolves.toEqual(new Set([betaSession.sessionId]));
  });

  it("keeps two agents in linked worktrees on isolated opened views and graph stores", async () => {
    const { primary, secondary } = createDivergedWorktrees();
    const harness = await createInProcessDaemonHarness();
    cleanups.push(() => harness.close());
    const primarySession = harness.createSession();
    const secondarySession = harness.createSession();
    const sourceRefsBefore = git(primary, "for-each-ref --format='%(refname) %(objectname)' refs/warp");
    const sourceObjectsBefore = git(primary, "count-objects -v");

    const primaryFind = await primarySession.callToolJson<{
      matches: { name: string; path: string }[];
    }>("code_find", {
      cwd: primary,
      query: "primaryOnly",
    });
    const secondaryFind = await secondarySession.callToolJson<{
      matches: { name: string; path: string }[];
    }>("code_find", {
      cwd: secondary,
      query: "secondaryOnly",
    });

    expect(primaryFind.matches).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "primaryOnly", path: "primary-only.ts" }),
    ]));
    expect(secondaryFind.matches).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "secondaryOnly", path: "secondary-only.ts" }),
    ]));

    const primaryOpened = await primarySession.callToolJson<{
      activeWorktreeId: string | null;
      workspaces: { worktreeRoot: string }[];
    }>("workspace_list_opened", {});
    const secondaryOpened = await secondarySession.callToolJson<{
      activeWorktreeId: string | null;
      workspaces: { worktreeRoot: string }[];
    }>("workspace_list_opened", {});
    expect(primaryOpened).toEqual(expect.objectContaining({
      activeWorktreeId: null,
      workspaces: [expect.objectContaining({ worktreeRoot: primary })],
    }));
    expect(secondaryOpened).toEqual(expect.objectContaining({
      activeWorktreeId: null,
      workspaces: [expect.objectContaining({ worktreeRoot: secondary })],
    }));

    const primaryWorkspace = await resolvedWorkspace(primary);
    const secondaryWorkspace = await resolvedWorkspace(secondary);
    expect(primaryWorkspace.repoId).toBe(secondaryWorkspace.repoId);
    expect(primaryWorkspace.worktreeId).not.toBe(secondaryWorkspace.worktreeId);

    const graphRoot = path.join(harness.rootDir, "graphs");
    const primaryLocation = resolveWarpSidecarLocation(graphRoot, {
      ...primaryWorkspace,
      writerId: buildSessionWarpWriterId(primarySession.sessionId),
    });
    const secondaryLocation = resolveWarpSidecarLocation(graphRoot, {
      ...secondaryWorkspace,
      writerId: buildSessionWarpWriterId(secondarySession.sessionId),
    });
    expect(primaryLocation.repoPath).not.toBe(secondaryLocation.repoPath);
    expect(git(primaryLocation.repoPath, "rev-parse --is-bare-repository")).toBe("true");
    expect(git(secondaryLocation.repoPath, "rev-parse --is-bare-repository")).toBe("true");
    expect(git(primaryLocation.repoPath, "for-each-ref refs/warp")).not.toBe("");
    expect(git(secondaryLocation.repoPath, "for-each-ref refs/warp")).not.toBe("");

    expect(git(primary, "for-each-ref --format='%(refname) %(objectname)' refs/warp"))
      .toBe(sourceRefsBefore);
    expect(git(primary, "count-objects -v")).toBe(sourceObjectsBefore);
  });
});
