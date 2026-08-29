import * as crypto from "node:crypto";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import type WarpApp from "@git-stunts/git-warp";
import GitPlumbing from "@git-stunts/plumbing";
import { openWarp } from "./open.js";

const PRIVATE_DIRECTORY_MODE = 0o700;
const DISPLAY_SLUG_MAX_LENGTH = 48;
const IDENTITY_SUFFIX_LENGTH = 12;

export interface WarpSidecarWorkspaceIdentity {
  readonly repoId: string;
  readonly worktreeId: string;
  readonly worktreeRoot: string;
  readonly gitCommonDir: string;
}

export interface WarpSidecarIdentity extends WarpSidecarWorkspaceIdentity {
  readonly writerId: string;
}

export interface WarpSidecarLocation {
  readonly graphRoot: string;
  readonly projectDir: string;
  readonly worktreeDir: string;
  readonly actorDir: string;
  readonly repoPath: string;
}

export interface WarpSidecarOpenOptions {
  readonly sidecarRepo: string;
  readonly writerId: string;
  readonly graphRoot?: string | undefined;
  readonly checkpointEvery?: number | undefined;
}

function hasErrorCode(error: unknown, code: string): boolean {
  return error instanceof Error && "code" in error && error.code === code;
}

function identitySuffix(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex").slice(0, IDENTITY_SUFFIX_LENGTH);
}

function displaySlug(input: string, fallback: string): string {
  const normalized = input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/gu, "-")
    .replace(/^[._-]+|[._-]+$/gu, "")
    .slice(0, DISPLAY_SLUG_MAX_LENGTH)
    .replace(/[._-]+$/gu, "");
  return normalized.length > 0 ? normalized : fallback;
}

function actorKind(writerId: string): string {
  const match = /^graft_([a-z0-9]+)(?:_|$)/u.exec(writerId.toLowerCase());
  return displaySlug(match?.[1] ?? "actor", "actor");
}

function keyedDirectory(displayName: string, fallback: string, authority: string): string {
  return `${displaySlug(displayName, fallback)}--${identitySuffix(authority)}`;
}

function projectDisplayName(identity: WarpSidecarWorkspaceIdentity): string {
  return path.basename(identity.gitCommonDir) === ".git"
    ? path.basename(path.dirname(identity.gitCommonDir))
    : path.basename(identity.worktreeRoot);
}

function assertContained(root: string, target: string): void {
  const relative = path.relative(root, target);
  if (relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))) {
    return;
  }
  throw new Error(`Refusing to use WARP sidecar outside Graft graph storage: ${target}`);
}

async function assertPrivateDirectory(directory: string): Promise<void> {
  const before = await fs.lstat(directory);
  if (before.isSymbolicLink()) {
    throw new Error(`Refusing to use symlinked Graft graph storage directory: ${directory}`);
  }
  if (!before.isDirectory()) {
    throw new Error(`Refusing to use non-directory Graft graph storage path: ${directory}`);
  }
  if (process.platform !== "win32") {
    await fs.chmod(directory, PRIVATE_DIRECTORY_MODE);
  }
  const after = await fs.lstat(directory);
  if (after.isSymbolicLink() || !after.isDirectory()) {
    throw new Error(`Refusing to use unsafe Graft graph storage directory: ${directory}`);
  }
  if (process.platform !== "win32" && (after.mode & 0o077) !== 0) {
    throw new Error(`Refusing to use non-private Graft graph storage directory: ${directory}`);
  }
}

async function ensureManagedDirectory(graphRoot: string, targetDirectory: string): Promise<void> {
  const root = path.resolve(graphRoot);
  const target = path.resolve(targetDirectory);
  assertContained(root, target);
  await fs.mkdir(root, { recursive: true, mode: PRIVATE_DIRECTORY_MODE });
  await assertPrivateDirectory(root);

  const relative = path.relative(root, target);
  if (relative.length === 0) return;

  let current = root;
  for (const segment of relative.split(path.sep)) {
    if (segment.length === 0 || segment === "." || segment === "..") {
      throw new Error(`Refusing to create unsafe Graft graph storage path: ${targetDirectory}`);
    }
    current = path.join(current, segment);
    try {
      await fs.mkdir(current, { mode: PRIVATE_DIRECTORY_MODE });
    } catch (error: unknown) {
      if (!hasErrorCode(error, "EEXIST")) throw error;
    }
    await assertPrivateDirectory(current);
  }
}

async function isBareRepository(repoPath: string): Promise<boolean> {
  try {
    const plumbing = GitPlumbing.createDefault({ cwd: repoPath });
    return (await plumbing.execute({ args: ["rev-parse", "--is-bare-repository"] })).trim() === "true";
  } catch {
    return false;
  }
}

async function ensureBareRepository(graphRoot: string, repoPath: string): Promise<void> {
  const resolvedRoot = path.resolve(graphRoot);
  const resolvedRepo = path.resolve(repoPath);
  assertContained(resolvedRoot, resolvedRepo);
  const parent = path.dirname(resolvedRepo);
  await ensureManagedDirectory(resolvedRoot, parent);

  let existing: Awaited<ReturnType<typeof fs.lstat>> | null;
  try {
    existing = await fs.lstat(resolvedRepo);
  } catch (error: unknown) {
    if (!hasErrorCode(error, "ENOENT")) throw error;
    existing = null;
  }

  if (existing?.isSymbolicLink() === true) {
    throw new Error(`Refusing to use symlinked Graft graph storage directory: ${resolvedRepo}`);
  }
  if (existing !== null && !existing.isDirectory()) {
    throw new Error(`Refusing to use non-directory Graft graph storage path: ${resolvedRepo}`);
  }

  if (existing === null) {
    await ensureManagedDirectory(resolvedRoot, resolvedRepo);
    const plumbing = GitPlumbing.createDefault({ cwd: resolvedRepo });
    await plumbing.execute({
      args: ["init", "--bare", "--quiet"],
      env: sidecarGitEnvironment(),
    });
  }

  await assertPrivateDirectory(resolvedRepo);
  if (!await isBareRepository(resolvedRepo)) {
    throw new Error(`Refusing WARP sidecar that is not a bare Git repository: ${resolvedRepo}`);
  }
}

export function defaultWarpGraphRoot(homeDirectory = os.homedir()): string {
  return path.join(homeDirectory, ".graft", "graphs");
}

function sidecarGitEnvironment(): Record<string, string> {
  return {
    GIT_CONFIG_NOSYSTEM: "1",
  };
}

export function resolveWarpSidecarLocation(
  graphRoot: string,
  identity: WarpSidecarIdentity,
): WarpSidecarLocation {
  const resolvedRoot = path.resolve(graphRoot);
  const projectDir = path.join(
    resolvedRoot,
    keyedDirectory(projectDisplayName(identity), "project", identity.repoId),
  );
  const worktreeDir = path.join(
    projectDir,
    keyedDirectory(path.basename(identity.worktreeRoot), "worktree", identity.worktreeId),
  );
  const actorDir = path.join(
    worktreeDir,
    keyedDirectory(actorKind(identity.writerId), "actor", identity.writerId),
  );
  const repoPath = path.join(actorDir, "warp.git");
  assertContained(resolvedRoot, repoPath);
  return {
    graphRoot: resolvedRoot,
    projectDir,
    worktreeDir,
    actorDir,
    repoPath,
  };
}

export async function openWarpSidecar(options: WarpSidecarOpenOptions): Promise<WarpApp> {
  const sidecarRepo = path.resolve(options.sidecarRepo);
  const graphRoot = options.graphRoot === undefined
    ? path.resolve(sidecarRepo, "../../../..")
    : path.resolve(options.graphRoot);
  await ensureBareRepository(graphRoot, sidecarRepo);
  return openWarp({
    cwd: sidecarRepo,
    writerId: options.writerId,
    gitEnv: sidecarGitEnvironment(),
    ...(options.checkpointEvery !== undefined ? { checkpointEvery: options.checkpointEvery } : {}),
  });
}
