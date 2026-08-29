import { afterEach, describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { CanonicalJsonCodec } from "../../../src/adapters/canonical-json.js";
import { nodeFs } from "../../../src/adapters/node-fs.js";
import { nodeGit } from "../../../src/adapters/node-git.js";
import { DaemonControlPlane } from "../../../src/mcp/daemon-control-plane.js";
import type { ResolvedWorkspace } from "../../../src/mcp/workspace-router.js";
import type { FileSystem } from "../../../src/ports/filesystem.js";
import { cleanupTestRepo, createCommittedTestRepo, git } from "../../helpers/git.js";

const cleanups: (() => void)[] = [];

afterEach(() => {
  while (cleanups.length > 0) {
    cleanups.pop()!();
  }
});

function tempDir(prefix: string): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  cleanups.push(() => {
    fs.rmSync(directory, { recursive: true, force: true });
  });
  return fs.realpathSync(directory);
}

function committedRepo(prefix: string): string {
  const directory = fs.realpathSync(createCommittedTestRepo(prefix));
  cleanups.push(() => {
    cleanupTestRepo(directory);
  });
  return directory;
}

class OverlapDetectingFileSystem implements FileSystem {
  activeAuthorizationWrites = 0;
  maxAuthorizationWrites = 0;

  readFile(filePath: string, encoding: "utf-8"): Promise<string>;
  readFile(filePath: string): Promise<Buffer>;
  readFile(filePath: string, encoding?: "utf-8"): Promise<string | Buffer> {
    return encoding === undefined
      ? nodeFs.readFile(filePath)
      : nodeFs.readFile(filePath, encoding);
  }

  readdir(filePath: string): Promise<string[]> {
    return nodeFs.readdir(filePath);
  }

  async writeFile(filePath: string, data: string, encoding: "utf-8"): Promise<void> {
    if (path.basename(filePath) !== "authorized-workspaces.json") {
      await nodeFs.writeFile(filePath, data, encoding);
      return;
    }
    this.activeAuthorizationWrites += 1;
    this.maxAuthorizationWrites = Math.max(
      this.maxAuthorizationWrites,
      this.activeAuthorizationWrites,
    );
    try {
      await new Promise((resolve) => setTimeout(resolve, 50));
      await nodeFs.writeFile(filePath, data, encoding);
    } finally {
      this.activeAuthorizationWrites -= 1;
    }
  }

  appendFile(filePath: string, data: string, encoding: "utf-8"): Promise<void> {
    return nodeFs.appendFile(filePath, data, encoding);
  }

  mkdir(filePath: string, options: { recursive: true }): Promise<void> {
    return nodeFs.mkdir(filePath, options);
  }

  stat(filePath: string): Promise<{ size: number }> {
    return nodeFs.stat(filePath);
  }

  readFileSync(filePath: string, encoding: "utf-8"): string {
    return nodeFs.readFileSync(filePath, encoding);
  }
}

function resolvedWorkspace(label: string): ResolvedWorkspace {
  return {
    repoId: `repo:${label}`,
    worktreeId: `worktree:${label}`,
    worktreeRoot: `/workspace/${label}`,
    gitCommonDir: `/workspace/${label}/.git`,
  };
}

describe("mcp: daemon control plane", () => {
  it("serializes concurrent first-time auto-admission persistence", async () => {
    const graftDir = tempDir("graft-control-plane-concurrency-");
    const observedFs = new OverlapDetectingFileSystem();
    const controlPlane = new DaemonControlPlane({
      fs: observedFs,
      codec: new CanonicalJsonCodec(),
      git: nodeGit,
      graftDir,
    });

    await Promise.all([
      controlPlane.ensureCapabilityProfile(resolvedWorkspace("a")),
      controlPlane.ensureCapabilityProfile(resolvedWorkspace("b")),
    ]);

    expect(observedFs.maxAuthorizationWrites).toBe(1);
    await expect(controlPlane.listAuthorizedWorkspaceRecords()).resolves.toHaveLength(2);
  });

  it("does not transfer stale authorization when a path becomes another repository", async () => {
    const graftDir = tempDir("graft-control-plane-replacement-");
    const original = committedRepo("graft-control-plane-original-");
    const replacementSource = committedRepo("graft-control-plane-replacement-source-");
    const controlPlane = new DaemonControlPlane({
      fs: nodeFs,
      codec: new CanonicalJsonCodec(),
      git: nodeGit,
      graftDir,
    });

    const authorization = await controlPlane.authorizeWorkspace({ cwd: original });
    expect(authorization).toMatchObject({
      ok: true,
    });
    const originalRepoId = authorization.authorization?.repoId;
    expect(originalRepoId).toBeDefined();
    fs.rmSync(original, { recursive: true, force: true });
    git(replacementSource, `worktree add -b replacement ${original}`);

    await expect(controlPlane.getAuthorizedWorkspace({ cwd: original })).resolves.toBeNull();
    await expect(controlPlane.getAuthorizedWorkspaceForRepo(originalRepoId!, original))
      .resolves.toBeNull();
    await expect(controlPlane.revokeWorkspace({ cwd: original })).resolves.toMatchObject({
      ok: false,
      revoked: false,
      errorCode: "WORKSPACE_NOT_AUTHORIZED",
    });
  });
});
