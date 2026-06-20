import { afterEach, describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  deriveWorkspaceId,
  loadOrCreateInstallationId,
  observeGitWorkspace,
  registryPaths,
  sanitizeRemoteUrl,
} from "../../../src/mcp/workspace-registry.js";
import type { GitClient, GitRunRequest } from "../../../src/ports/git.js";
import {
  ECHO_NATIVE_HISTORY_PROVIDER,
  GIT_WARP_FALLBACK_HISTORY_PROVIDER,
  GIT_WARP_IMPORTED_HISTORY_PROVIDER,
} from "../../../src/ports/structural-history.js";
import { createCommittedTestRepo, git, testGitClient } from "../../helpers/git.js";
import { createIsolatedServer, parse } from "../../helpers/mcp.js";

const INSTALLATION_A = "00112233445566778899aabbccddeeff";
const INSTALLATION_B = "ffeeddccbbaa99887766554433221100";

function fixedBytes(hex: string): () => Buffer {
  return () => Buffer.from(hex, "hex");
}

function writeMinimalGitCommonDir(gitCommonDir: string, config = "[core]\n\trepositoryformatversion = 0\n"): void {
  fs.mkdirSync(path.join(gitCommonDir, "objects"), { recursive: true });
  fs.mkdirSync(path.join(gitCommonDir, "refs"), { recursive: true });
  fs.writeFileSync(path.join(gitCommonDir, "config"), config);
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

describe("workspace registry identity", () => {
  it("derives installation-local workspace IDs without remote URL input", () => {
    const input = {
      installationId: INSTALLATION_A,
      platformNamespace: "test-platform",
      volumeNamespace: "test-volume",
      workspaceKind: "git" as const,
      canonicalIdentityComponents: [
        "/work/repo",
        "/work/repo/.git",
      ],
    };

    const first = deriveWorkspaceId(input);
    const second = deriveWorkspaceId(input);
    const otherInstallation = deriveWorkspaceId({
      ...input,
      installationId: INSTALLATION_B,
    });

    expect(first).toBe(second);
    expect(first).toMatch(/^ws_[a-z2-7]{26}$/);
    expect(otherInstallation).not.toBe(first);
  });

  it("sanitizes remote metadata without feeding workspace identity", () => {
    const workspaceId = deriveWorkspaceId({
      installationId: INSTALLATION_A,
      platformNamespace: "test-platform",
      volumeNamespace: "test-volume",
      workspaceKind: "git",
      canonicalIdentityComponents: [
        "/work/repo",
        "/work/repo/.git",
      ],
    });

    expect(sanitizeRemoteUrl("https://token@example.com/org/repo.git?secret=1#frag"))
      .toBe("https://example.com/org/repo.git");
    expect(sanitizeRemoteUrl("https://token@example.com:bad/repo.git?secret=1#frag"))
      .toBe("https://example.com:bad/repo.git");
    expect(sanitizeRemoteUrl("token@github.com:org/repo.git?secret=1#frag"))
      .toBe("github.com:org/repo.git");
    expect(sanitizeRemoteUrl("git@github.com:flyingrobots/graft.git"))
      .toBe("github.com:flyingrobots/graft.git");
    expect(deriveWorkspaceId({
      installationId: INSTALLATION_A,
      platformNamespace: "test-platform",
      volumeNamespace: "test-volume",
      workspaceKind: "git",
      canonicalIdentityComponents: [
        "/work/repo",
        "/work/repo/.git",
      ],
    })).toBe(workspaceId);
  });
});

describe("workspace registry observation", () => {
  const cleanup: string[] = [];

  afterEach(() => {
    for (const dir of cleanup.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("writes ID-only metadata and incarnation-partitioned cache roots", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "graft-registry-"));
    cleanup.push(root);
    const graftDir = path.join(root, "graft-home");
    const repoRoot = path.join(root, "same-name");
    const gitCommonDir = path.join(repoRoot, ".git");
    fs.mkdirSync(gitCommonDir, { recursive: true });
    writeMinimalGitCommonDir(gitCommonDir);

    const observed = await observeGitWorkspace({
      graftDir,
      canonicalRoot: repoRoot,
      gitCommonDir,
      remotes: [
        "https://token@example.com/org/repo.git?secret=1#frag",
        "git@github.com:flyingrobots/graft.git",
      ],
      now: () => "2026-06-19T00:00:00.000Z",
      randomBytes: fixedBytes("11111111111111111111111111111111"),
      repositoryFingerprint: "repo-a",
      installationId: INSTALLATION_A,
      platformNamespace: "test-platform",
      volumeNamespace: "test-volume",
    });

    const paths = registryPaths(graftDir, observed.workspaceId, observed.incarnationId);
    const metadata = JSON.parse(fs.readFileSync(paths.metadataPath, "utf8")) as Record<string, unknown>;
    const incarnationMetadata = JSON.parse(
      fs.readFileSync(paths.incarnationMetadataPath, "utf8"),
    ) as Record<string, unknown>;

    expect(path.basename(paths.workspaceDir)).toBe(observed.workspaceId);
    expect(paths.workspaceDir).not.toContain(path.basename(repoRoot));
    expect(metadata).toMatchObject({
      schemaVersion: 1,
      workspaceId: observed.workspaceId,
      displayName: "same-name",
      canonicalRoot: repoRoot,
      gitCommonDir,
      sanitizedRemotes: [
        "https://example.com/org/repo.git",
        "github.com:flyingrobots/graft.git",
      ],
      incarnationId: observed.incarnationId,
      historyBindingIds: [],
      storage: {
        registry: "graft-managed",
        cache: "graft-managed",
      },
      createdAt: "2026-06-19T00:00:00.000Z",
      lastObservedAt: "2026-06-19T00:00:00.000Z",
    });
    expect(metadata).not.toHaveProperty("recordState");
    expect(metadata).not.toHaveProperty("exclusionPolicy");
    expect(metadata).not.toHaveProperty("historyStoreId");
    expect(metadata).not.toHaveProperty("history");
    expect(metadata).not.toHaveProperty("trackingAuthorization");
    expect(incarnationMetadata).toMatchObject({
      schemaVersion: 1,
      workspaceId: observed.workspaceId,
      incarnationId: observed.incarnationId,
      incarnationStatus: "confirmed",
    });
    expect(incarnationMetadata).not.toHaveProperty("status");
    expect(fs.existsSync(path.join(paths.incarnationCacheDir, "outlines"))).toBe(true);
    expect(fs.existsSync(path.join(paths.workspaceDir, "history"))).toBe(false);
    expect(fs.existsSync(path.join(paths.workspaceDir, "warp.git"))).toBe(false);
    if (process.platform !== "win32") {
      expect(fs.statSync(paths.workspaceDir).mode & 0o077).toBe(0);
      expect(fs.statSync(paths.metadataPath).mode & 0o077).toBe(0);
    }
  });

  it("serializes first-time installation ID creation", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "graft-registry-installation-"));
    cleanup.push(root);
    const graftDir = path.join(root, "graft-home");
    let generated = 0;

    const ids = await Promise.all(Array.from({ length: 12 }, () => loadOrCreateInstallationId({
      graftDir,
      now: () => "2026-06-19T00:00:00.000Z",
      randomBytes: () => {
        generated += 1;
        return Buffer.alloc(16, generated);
      },
    })));

    expect(new Set(ids).size).toBe(1);
    const installation = JSON.parse(
      fs.readFileSync(path.join(graftDir, "installation.json"), "utf8"),
    ) as Record<string, unknown>;
    expect(installation["installationId"]).toBe(ids[0]);
  });

  it("recovers stale first-time installation locks", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "graft-registry-stale-lock-"));
    cleanup.push(root);
    const graftDir = path.join(root, "graft-home");
    const lockDir = path.join(graftDir, "installation.lock");
    fs.mkdirSync(lockDir, { recursive: true, mode: 0o700 });
    const stale = new Date(Date.now() - 10 * 60 * 1000);
    fs.utimesSync(lockDir, stale, stale);

    const installationId = await loadOrCreateInstallationId({
      graftDir,
      now: () => "2026-06-19T00:00:00.000Z",
      randomBytes: fixedBytes("99999999999999999999999999999999"),
    });

    expect(installationId).toBe("99999999999999999999999999999999");
    expect(fs.existsSync(lockDir)).toBe(false);
    expect(fs.existsSync(path.join(graftDir, "installation.json"))).toBe(true);
  });

  it("quarantines malformed installation IDs", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "graft-registry-bad-installation-"));
    cleanup.push(root);
    const graftDir = path.join(root, "graft-home");
    fs.mkdirSync(graftDir, { recursive: true });
    fs.writeFileSync(
      path.join(graftDir, "installation.json"),
      `${JSON.stringify({ schemaVersion: 1, installationId: "short", createdAt: "2026-06-19T00:00:00.000Z" })}\n`,
    );

    await expect(loadOrCreateInstallationId({
      graftDir,
      now: () => "2026-06-19T01:00:00.000Z",
      randomBytes: fixedBytes("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"),
    })).rejects.toThrow(/Unsupported installation record/iu);

    expect(fs.existsSync(path.join(graftDir, "installation.json"))).toBe(false);
    expect(fs.readdirSync(graftDir).some((name) => name.startsWith("installation.json.quarantine.")))
      .toBe(true);
  });

  it("preserves incarnation and createdAt on repeated observation", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "graft-registry-repeat-"));
    cleanup.push(root);
    const graftDir = path.join(root, "graft-home");
    const repoRoot = path.join(root, "repo");
    const gitCommonDir = path.join(repoRoot, ".git");
    fs.mkdirSync(gitCommonDir, { recursive: true });
    writeMinimalGitCommonDir(gitCommonDir);

    const first = await observeGitWorkspace({
      graftDir,
      canonicalRoot: repoRoot,
      gitCommonDir,
      now: () => "2026-06-19T00:00:00.000Z",
      randomBytes: fixedBytes("22222222222222222222222222222222"),
      repositoryFingerprint: "repo-a",
      installationId: INSTALLATION_A,
      platformNamespace: "test-platform",
      volumeNamespace: "test-volume",
    });
    const second = await observeGitWorkspace({
      graftDir,
      canonicalRoot: repoRoot,
      gitCommonDir,
      now: () => "2026-06-19T01:00:00.000Z",
      randomBytes: fixedBytes("33333333333333333333333333333333"),
      repositoryFingerprint: "repo-a",
      installationId: INSTALLATION_A,
      platformNamespace: "test-platform",
      volumeNamespace: "test-volume",
    });

    const metadata = JSON.parse(
      fs.readFileSync(registryPaths(graftDir, first.workspaceId, first.incarnationId).metadataPath, "utf8"),
    ) as Record<string, unknown>;
    expect(second.workspaceId).toBe(first.workspaceId);
    expect(second.incarnationId).toBe(first.incarnationId);
    expect(metadata["createdAt"]).toBe("2026-06-19T00:00:00.000Z");
    expect(metadata["lastObservedAt"]).toBe("2026-06-19T01:00:00.000Z");
    expect(metadata["historyBindingIds"]).toEqual([]);
  });

  it("preserves incarnation across normal Git directory writes", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "graft-registry-git-write-"));
    cleanup.push(root);
    const graftDir = path.join(root, "graft-home");
    const repoRoot = path.join(root, "repo");
    const gitCommonDir = path.join(repoRoot, ".git");
    fs.mkdirSync(gitCommonDir, { recursive: true });
    writeMinimalGitCommonDir(gitCommonDir);

    const first = await observeGitWorkspace({
      graftDir,
      canonicalRoot: repoRoot,
      gitCommonDir,
      now: () => "2026-06-19T00:00:00.000Z",
      randomBytes: fixedBytes("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"),
      repositoryFingerprint: "repo-a",
      installationId: INSTALLATION_A,
      platformNamespace: "test-platform",
      volumeNamespace: "test-volume",
    });
    const oldMetadata = JSON.parse(fs.readFileSync(first.paths.metadataPath, "utf8")) as Record<string, unknown>;
    fs.writeFileSync(path.join(first.paths.incarnationCacheDir, "outlines", "artifact.json"), "{}\n");
    fs.writeFileSync(
      first.paths.metadataPath,
      `${JSON.stringify({ ...oldMetadata, historyBindingIds: ["hb_old"] }, null, 2)}\n`,
    );

    await sleep(5);
    fs.writeFileSync(path.join(gitCommonDir, "index.lock"), "normal git write\n");
    fs.rmSync(path.join(gitCommonDir, "index.lock"));

    const second = await observeGitWorkspace({
      graftDir,
      canonicalRoot: repoRoot,
      gitCommonDir,
      now: () => "2026-06-19T01:00:00.000Z",
      randomBytes: fixedBytes("bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"),
      repositoryFingerprint: "repo-a",
      installationId: INSTALLATION_A,
      platformNamespace: "test-platform",
      volumeNamespace: "test-volume",
    });

    expect(second.incarnationId).toBe(first.incarnationId);
    expect(second.metadata.historyBindingIds).toEqual(["hb_old"]);
  });

  it("does not reuse an incarnation without explicit repository evidence", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "graft-registry-gitdir-only-"));
    cleanup.push(root);
    const graftDir = path.join(root, "graft-home");
    const repoRoot = path.join(root, "repo");
    const gitCommonDir = path.join(repoRoot, ".git");
    fs.mkdirSync(gitCommonDir, { recursive: true });
    writeMinimalGitCommonDir(gitCommonDir);

    const first = await observeGitWorkspace({
      graftDir,
      canonicalRoot: repoRoot,
      gitCommonDir,
      now: () => "2026-06-19T00:00:00.000Z",
      randomBytes: fixedBytes("cccccccccccccccccccccccccccccccc"),
      installationId: INSTALLATION_A,
      platformNamespace: "test-platform",
      volumeNamespace: "test-volume",
    });
    const firstIncarnationMetadata = JSON.parse(
      fs.readFileSync(first.paths.incarnationMetadataPath, "utf8"),
    ) as Record<string, unknown>;
    const oldMetadata = JSON.parse(fs.readFileSync(first.paths.metadataPath, "utf8")) as Record<string, unknown>;
    fs.writeFileSync(path.join(first.paths.incarnationCacheDir, "outlines", "artifact.json"), "{}\n");
    fs.writeFileSync(
      first.paths.metadataPath,
      `${JSON.stringify({ ...oldMetadata, historyBindingIds: ["hb_old"] }, null, 2)}\n`,
    );

    const second = await observeGitWorkspace({
      graftDir,
      canonicalRoot: repoRoot,
      gitCommonDir,
      now: () => "2026-06-19T01:00:00.000Z",
      randomBytes: fixedBytes("dddddddddddddddddddddddddddddddd"),
      installationId: INSTALLATION_A,
      platformNamespace: "test-platform",
      volumeNamespace: "test-volume",
    });

    expect(second.incarnationId).not.toBe(first.incarnationId);
    expect(second.metadata.historyBindingIds).toEqual([]);
    expect(firstIncarnationMetadata["incarnationStatus"]).toBe("unknown");
    const secondIncarnationMetadata = JSON.parse(
      fs.readFileSync(second.paths.incarnationMetadataPath, "utf8"),
    ) as Record<string, unknown>;
    expect(secondIncarnationMetadata["incarnationStatus"]).toBe("suspect");
  });

  it("quarantines unsupported workspace metadata before reuse", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "graft-registry-quarantine-"));
    cleanup.push(root);
    const graftDir = path.join(root, "graft-home");
    const repoRoot = path.join(root, "repo");
    const gitCommonDir = path.join(repoRoot, ".git");
    fs.mkdirSync(gitCommonDir, { recursive: true });

    const observed = await observeGitWorkspace({
      graftDir,
      canonicalRoot: repoRoot,
      gitCommonDir,
      now: () => "2026-06-19T00:00:00.000Z",
      randomBytes: fixedBytes("44444444444444444444444444444444"),
      repositoryFingerprint: "repo-a",
      installationId: INSTALLATION_A,
      platformNamespace: "test-platform",
      volumeNamespace: "test-volume",
    });
    fs.writeFileSync(
      observed.paths.metadataPath,
      `${JSON.stringify({ schemaVersion: 2, workspaceId: observed.workspaceId })}\n`,
    );

    await expect(observeGitWorkspace({
      graftDir,
      canonicalRoot: repoRoot,
      gitCommonDir,
      now: () => "2026-06-19T01:00:00.000Z",
      randomBytes: fixedBytes("55555555555555555555555555555555"),
      repositoryFingerprint: "repo-a",
      installationId: INSTALLATION_A,
      platformNamespace: "test-platform",
      volumeNamespace: "test-volume",
    })).rejects.toThrow(/Unsupported workspace metadata/iu);

    expect(fs.existsSync(observed.paths.metadataPath)).toBe(false);
    expect(fs.readdirSync(observed.paths.workspaceDir).some((name) => name.startsWith("metadata.json.quarantine.")))
      .toBe(true);
  });

  it("creates a new incarnation when repository evidence changes at the same path", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "graft-registry-replacement-"));
    cleanup.push(root);
    const graftDir = path.join(root, "graft-home");
    const repoRoot = path.join(root, "repo");
    const gitCommonDir = path.join(repoRoot, ".git");
    fs.mkdirSync(gitCommonDir, { recursive: true });

    const first = await observeGitWorkspace({
      graftDir,
      canonicalRoot: repoRoot,
      gitCommonDir,
      now: () => "2026-06-19T00:00:00.000Z",
      randomBytes: fixedBytes("66666666666666666666666666666666"),
      repositoryFingerprint: "repo-a",
      installationId: INSTALLATION_A,
      platformNamespace: "test-platform",
      volumeNamespace: "test-volume",
    });
    const oldMetadata = JSON.parse(fs.readFileSync(first.paths.metadataPath, "utf8")) as Record<string, unknown>;
    fs.writeFileSync(path.join(first.paths.incarnationCacheDir, "outlines", "artifact.json"), "{}\n");
    fs.writeFileSync(
      first.paths.metadataPath,
      `${JSON.stringify({ ...oldMetadata, historyBindingIds: ["hb_old"] }, null, 2)}\n`,
    );

    const second = await observeGitWorkspace({
      graftDir,
      canonicalRoot: repoRoot,
      gitCommonDir,
      now: () => "2026-06-19T01:00:00.000Z",
      randomBytes: fixedBytes("77777777777777777777777777777777"),
      repositoryFingerprint: "repo-b",
      installationId: INSTALLATION_A,
      platformNamespace: "test-platform",
      volumeNamespace: "test-volume",
    });
    const incarnationMetadata = JSON.parse(
      fs.readFileSync(second.paths.incarnationMetadataPath, "utf8"),
    ) as Record<string, unknown>;

    expect(second.workspaceId).toBe(first.workspaceId);
    expect(second.incarnationId).not.toBe(first.incarnationId);
    expect(second.metadata.historyBindingIds).toEqual([]);
    expect(incarnationMetadata["incarnationStatus"]).toBe("replaced");
    expect(fs.existsSync(first.paths.incarnationDir)).toBe(false);
    const quarantineDir = fs.readdirSync(first.paths.incarnationsDir)
      .find((name) => name.startsWith(`${first.incarnationId}.quarantine.`));
    expect(quarantineDir).toBeDefined();
    expect(fs.existsSync(path.join(first.paths.incarnationsDir, quarantineDir ?? "", "cache", "outlines", "artifact.json")))
      .toBe(true);
  });

  it("serializes concurrent first workspace observation", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "graft-registry-concurrent-observe-"));
    cleanup.push(root);
    const graftDir = path.join(root, "graft-home");
    const repoRoot = path.join(root, "repo");
    const gitCommonDir = path.join(repoRoot, ".git");
    fs.mkdirSync(gitCommonDir, { recursive: true });
    const byteValues = [
      "11111111111111111111111111111111",
      "22222222222222222222222222222222",
    ];
    let nextByteValue = 0;
    const randomBytes = () => {
      const value = byteValues[nextByteValue] ?? "33333333333333333333333333333333";
      nextByteValue += 1;
      return Buffer.from(value, "hex");
    };

    const observations = await Promise.all([
      observeGitWorkspace({
        graftDir,
        canonicalRoot: repoRoot,
        gitCommonDir,
        now: () => "2026-06-19T00:00:00.000Z",
        randomBytes,
        repositoryFingerprint: "repo-a",
        installationId: INSTALLATION_A,
        platformNamespace: "test-platform",
        volumeNamespace: "test-volume",
      }),
      observeGitWorkspace({
        graftDir,
        canonicalRoot: repoRoot,
        gitCommonDir,
        now: () => "2026-06-19T00:00:00.000Z",
        randomBytes,
        repositoryFingerprint: "repo-a",
        installationId: INSTALLATION_A,
        platformNamespace: "test-platform",
        volumeNamespace: "test-volume",
      }),
    ]);

    expect(new Set(observations.map((observation) => observation.incarnationId)).size).toBe(1);
    const paths = registryPaths(graftDir, observations[0].workspaceId, observations[0].incarnationId);
    const incarnationDirs = fs.readdirSync(paths.incarnationsDir)
      .filter((name) => name.startsWith("wi_"));
    expect(incarnationDirs).toEqual([observations[0].incarnationId]);
  });

  it("rejects symlinked managed storage components before writing workspace state", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "graft-registry-symlink-"));
    cleanup.push(root);
    const graftDir = path.join(root, "graft-home");
    const outside = path.join(root, "outside");
    const repoRoot = path.join(root, "repo");
    const gitCommonDir = path.join(repoRoot, ".git");
    fs.mkdirSync(gitCommonDir, { recursive: true });
    fs.mkdirSync(graftDir, { recursive: true });
    fs.mkdirSync(outside, { recursive: true });
    try {
      fs.symlinkSync(outside, path.join(graftDir, "workspaces"), "dir");
    } catch (error: unknown) {
      if (error instanceof Error && "code" in error && (error.code === "EPERM" || error.code === "EINVAL")) {
        return;
      }
      throw error;
    }

    await expect(observeGitWorkspace({
      graftDir,
      canonicalRoot: repoRoot,
      gitCommonDir,
      now: () => "2026-06-19T00:00:00.000Z",
      randomBytes: fixedBytes("88888888888888888888888888888888"),
      repositoryFingerprint: "repo-a",
      installationId: INSTALLATION_A,
      platformNamespace: "test-platform",
      volumeNamespace: "test-volume",
    })).rejects.toThrow(/symlinked Graft storage directory/iu);

    expect(fs.readdirSync(outside)).toEqual([]);
  });

  it("daemon authorization observes registry state without target-repo mutation", async () => {
    const repoDir = createCommittedTestRepo("graft-registry-daemon-");
    cleanup.push(repoDir);
    git(repoDir, "remote add origin https://token@example.com/org/repo.git");
    const isolated = createIsolatedServer({ mode: "daemon" });
    cleanup.push(isolated.graftDir);
    cleanup.push(isolated.projectRoot);

    const authorization = parse(await isolated.server.callTool("workspace_authorize", { cwd: repoDir }));
    expect(authorization["ok"]).toBe(true);
    expect(authorization["registryObservation"]).toEqual({ ok: true });

    const workspacesDir = path.join(isolated.graftDir, "workspaces");
    const [workspaceId] = fs.readdirSync(workspacesDir);
    expect(workspaceId).toMatch(/^ws_[a-z2-7]{26}$/);
    if (workspaceId === undefined) {
      throw new Error("workspace authorization did not create a registry entry");
    }
    const workspaceDir = path.join(workspacesDir, workspaceId);
    const metadata = JSON.parse(fs.readFileSync(path.join(workspaceDir, "metadata.json"), "utf8")) as Record<string, unknown>;

    expect(metadata["canonicalRoot"]).toBe(fs.realpathSync(repoDir));
    expect(metadata["sanitizedRemotes"]).toEqual(["https://example.com/org/repo.git"]);
    expect(fs.existsSync(path.join(repoDir, ".graft"))).toBe(false);
    expect(fs.existsSync(path.join(workspaceDir, "history"))).toBe(false);

    const incarnationsDir = path.join(workspaceDir, "incarnations");
    const firstIncarnations = fs.readdirSync(incarnationsDir);
    const repeatedAuthorization = parse(await isolated.server.callTool("workspace_authorize", { cwd: repoDir }));
    expect(repeatedAuthorization["ok"]).toBe(true);
    expect(repeatedAuthorization["registryObservation"]).toEqual({ ok: true });
    expect(fs.readdirSync(incarnationsDir)).toEqual(firstIncarnations);
  });

  it("bounds remote listing during daemon authorization observation", async () => {
    const repoDir = createCommittedTestRepo("graft-registry-daemon-remotes-");
    cleanup.push(repoDir);
    git(repoDir, "remote add origin https://token@example.com/org/repo.git");
    const calls: GitRunRequest[] = [];
    const recordingGit: GitClient = {
      async run(request) {
        calls.push(request);
        return testGitClient.run(request);
      },
    };
    const isolated = createIsolatedServer({ mode: "daemon", git: recordingGit });
    cleanup.push(isolated.graftDir);
    cleanup.push(isolated.projectRoot);

    const authorization = parse(await isolated.server.callTool("workspace_authorize", { cwd: repoDir }));
    expect(authorization["ok"]).toBe(true);

    const remoteCalls = calls.filter((call) => call.args.join(" ") === "remote -v");
    expect(remoteCalls.length).toBeGreaterThan(0);
    expect(remoteCalls.every((call) => typeof call.maxBufferBytes === "number" && call.maxBufferBytes > 0))
      .toBe(true);
    expect(remoteCalls.every((call) => call.maxBufferBytes !== undefined && call.maxBufferBytes <= 64 * 1024))
      .toBe(true);
  });

  it("preserves spaces in daemon remote URL metadata", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "graft-registry-daemon-space-remote-"));
    cleanup.push(root);
    const repoDir = createCommittedTestRepo("graft-registry-daemon-space-repo-");
    cleanup.push(repoDir);
    const spacedRemote = path.join(root, "space repo.git");
    git(repoDir, `remote add spaced ${JSON.stringify(spacedRemote)}`);
    const isolated = createIsolatedServer({ mode: "daemon" });
    cleanup.push(isolated.graftDir);
    cleanup.push(isolated.projectRoot);

    const authorization = parse(await isolated.server.callTool("workspace_authorize", { cwd: repoDir }));
    expect(authorization["ok"]).toBe(true);

    const workspacesDir = path.join(isolated.graftDir, "workspaces");
    const [workspaceId] = fs.readdirSync(workspacesDir);
    if (workspaceId === undefined) {
      throw new Error("workspace authorization did not create a registry entry");
    }
    const metadata = JSON.parse(
      fs.readFileSync(path.join(workspacesDir, workspaceId, "metadata.json"), "utf8"),
    ) as Record<string, unknown>;
    expect(metadata["sanitizedRemotes"]).toEqual([spacedRemote]);
  });

  it("keeps daemon authorization usable when managed registry observation is unavailable", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "graft-registry-unavailable-"));
    cleanup.push(root);
    const repoDir = createCommittedTestRepo("graft-registry-unavailable-repo-");
    cleanup.push(repoDir);
    const graftDir = path.join(root, "graft-home");
    fs.mkdirSync(graftDir, { recursive: true });
    fs.writeFileSync(path.join(graftDir, "workspaces"), "not a directory");
    const isolated = createIsolatedServer({ mode: "daemon", graftDir });
    cleanup.push(isolated.projectRoot);

    const authorization = parse(await isolated.server.callTool("workspace_authorize", { cwd: repoDir }));
    expect(authorization["ok"]).toBe(true);
    expect(authorization["registryObservation"]).toMatchObject({
      ok: false,
      code: "REGISTRY_OBSERVATION_UNAVAILABLE",
    });

    const binding = parse(await isolated.server.callTool("workspace_bind", { cwd: repoDir }));
    expect(binding["ok"]).toBe(true);
    expect(fs.existsSync(path.join(repoDir, ".graft"))).toBe(false);
  });
});

describe("structural history provider boundary", () => {
  it("keeps Echo primary and git-warp compatibility explicit", () => {
    expect(ECHO_NATIVE_HISTORY_PROVIDER).toMatchObject({
      adapter: "echo",
      evidenceLabel: "echo-native",
      generatedEvidenceKind: "ECHO_NATIVE",
      substrate: "echo",
    });
    expect(GIT_WARP_IMPORTED_HISTORY_PROVIDER).toMatchObject({
      adapter: "git-warp-import",
      evidenceLabel: "git-warp-imported",
      generatedEvidenceKind: "GIT_WARP_IMPORTED",
      substrate: "git-warp",
    });
    expect(GIT_WARP_FALLBACK_HISTORY_PROVIDER).toMatchObject({
      adapter: "git-warp-fallback",
      evidenceLabel: "fallback-translated",
      generatedEvidenceKind: "FALLBACK_TRANSLATED",
      substrate: "git-warp",
    });
  });
});
