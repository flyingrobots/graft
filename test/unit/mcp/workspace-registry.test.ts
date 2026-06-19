import { afterEach, describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  deriveWorkspaceId,
  observeGitWorkspace,
  registryPaths,
  sanitizeRemoteUrl,
} from "../../../src/mcp/workspace-registry.js";
import {
  ECHO_NATIVE_HISTORY_PROVIDER,
  GIT_WARP_FALLBACK_HISTORY_PROVIDER,
  GIT_WARP_IMPORTED_HISTORY_PROVIDER,
} from "../../../src/ports/structural-history.js";
import { createCommittedTestRepo, git } from "../../helpers/git.js";
import { createIsolatedServer, parse } from "../../helpers/mcp.js";

const INSTALLATION_A = "00112233445566778899aabbccddeeff";
const INSTALLATION_B = "ffeeddccbbaa99887766554433221100";

function fixedBytes(hex: string): () => Buffer {
  return () => Buffer.from(hex, "hex");
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
    expect(sanitizeRemoteUrl("git@github.com:flyingrobots/graft.git"))
      .toBe("git@github.com:flyingrobots/graft.git");
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
        "git@github.com:flyingrobots/graft.git",
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
  });

  it("preserves incarnation and createdAt on repeated observation", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "graft-registry-repeat-"));
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
      randomBytes: fixedBytes("22222222222222222222222222222222"),
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

  it("daemon authorization observes registry state without target-repo mutation", async () => {
    const repoDir = createCommittedTestRepo("graft-registry-daemon-");
    cleanup.push(repoDir);
    git(repoDir, "remote add origin https://token@example.com/org/repo.git");
    const isolated = createIsolatedServer({ mode: "daemon" });
    cleanup.push(isolated.graftDir);
    cleanup.push(isolated.projectRoot);

    const authorization = parse(await isolated.server.callTool("workspace_authorize", { cwd: repoDir }));
    expect(authorization["ok"]).toBe(true);

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
