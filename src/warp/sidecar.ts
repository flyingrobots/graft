import * as crypto from "node:crypto";
import * as fsSync from "node:fs";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import type WarpApp from "@git-stunts/git-warp";
import GitPlumbing from "@git-stunts/plumbing";
import { openWarp } from "./open.js";

const PRIVATE_DIRECTORY_MODE = 0o700;
const DISPLAY_SLUG_MAX_LENGTH = 48;
const IDENTITY_SUFFIX_LENGTH = 12;
const SIDECAR_GIT_USER_NAME = "Graft WARP";
const SIDECAR_GIT_USER_EMAIL = "graft-warp@localhost";
const SIDECAR_INIT_PREFIX = ".warp-init-";
const inFlightSidecarOpens = new Map<string, Promise<WarpApp>>();

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

function canonicalizeProspectivePath(input: string): string {
  let current = path.resolve(input);
  const missingSegments: string[] = [];

  while (true) {
    try {
      const canonicalPrefix = fsSync.realpathSync.native(current);
      return path.join(canonicalPrefix, ...missingSegments.reverse());
    } catch (error: unknown) {
      if (!hasErrorCode(error, "ENOENT") && !hasErrorCode(error, "ENOTDIR")) {
        throw error;
      }
      const parent = path.dirname(current);
      if (parent === current) throw error;
      missingSegments.push(path.basename(current));
      current = parent;
    }
  }
}

function resolveRequiredStoragePath(input: string, label: string): string {
  if (input.trim().length === 0) {
    throw new Error(`Graft WARP requires a non-empty ${label}`);
  }
  return path.resolve(input);
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

function isWithin(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative === ""
    || (
      !path.isAbsolute(relative)
      && relative !== ".."
      && !relative.startsWith(`..${path.sep}`)
    );
}

function assertContained(root: string, target: string): void {
  if (isWithin(root, target)) return;
  throw new Error(`Refusing to use WARP sidecar outside Graft graph storage: ${target}`);
}

function assertGraphStorageDisjoint(
  graphRoot: string,
  identity: WarpSidecarWorkspaceIdentity,
): void {
  const canonicalGraphRoot = canonicalizeProspectivePath(graphRoot);
  const worktreeRoot = canonicalizeProspectivePath(
    resolveRequiredStoragePath(identity.worktreeRoot, "source worktree root"),
  );
  if (
    isWithin(worktreeRoot, canonicalGraphRoot)
    || isWithin(canonicalGraphRoot, worktreeRoot)
  ) {
    throw new Error(
      `Refusing Graft WARP graph root that overlaps source worktree: ${graphRoot}`,
    );
  }

  const gitCommonDir = canonicalizeProspectivePath(
    resolveRequiredStoragePath(identity.gitCommonDir, "common Git directory"),
  );
  if (
    isWithin(gitCommonDir, canonicalGraphRoot)
    || isWithin(canonicalGraphRoot, gitCommonDir)
  ) {
    throw new Error(
      `Refusing Graft WARP graph root that overlaps common Git directory: ${graphRoot}`,
    );
  }

  if (canonicalGraphRoot !== graphRoot) {
    throw new Error(`Refusing symlinked Graft graph storage path: ${graphRoot}`);
  }
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

async function configureBareRepository(repoPath: string): Promise<void> {
  const plumbing = GitPlumbing.createDefault({ cwd: repoPath });
  await plumbing.execute({
    args: ["config", "--local", "user.name", SIDECAR_GIT_USER_NAME],
    env: sidecarGitEnvironment(),
  });
  await plumbing.execute({
    args: ["config", "--local", "user.email", SIDECAR_GIT_USER_EMAIL],
    env: sidecarGitEnvironment(),
  });
}

async function initializeBareRepository(parent: string, repoPath: string): Promise<void> {
  const candidate = await fs.mkdtemp(path.join(parent, SIDECAR_INIT_PREFIX));
  let moved = false;
  try {
    await assertPrivateDirectory(candidate);
    const plumbing = GitPlumbing.createDefault({ cwd: candidate });
    await plumbing.execute({
      args: ["init", "--bare", "--quiet"],
      env: sidecarGitEnvironment(),
    });
    await configureBareRepository(candidate);

    try {
      await fs.rename(candidate, repoPath);
      moved = true;
    } catch (error: unknown) {
      // A concurrent process may have installed its complete candidate first.
      // The atomic rename keeps incomplete repositories out of the final path.
      if (!await isBareRepository(repoPath)) throw error;
    }
  } finally {
    if (!moved) {
      await fs.rm(candidate, { recursive: true, force: true });
    }
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
    await initializeBareRepository(parent, resolvedRepo);
  }

  await assertPrivateDirectory(resolvedRepo);
  if (!await isBareRepository(resolvedRepo)) {
    throw new Error(`Refusing WARP sidecar that is not a bare Git repository: ${resolvedRepo}`);
  }
}

export function defaultWarpGraphRoot(homeDirectory = os.homedir()): string {
  return path.join(homeDirectory, ".graft", "graphs");
}

export function resolveWarpGraphRoot(configuredRoot?: string | undefined): string {
  return resolveRequiredStoragePath(
    configuredRoot ?? defaultWarpGraphRoot(),
    "graph root",
  );
}

function sidecarGitEnvironment(): Record<string, string> {
  return {
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_AUTHOR_NAME: SIDECAR_GIT_USER_NAME,
    GIT_AUTHOR_EMAIL: SIDECAR_GIT_USER_EMAIL,
    GIT_COMMITTER_NAME: SIDECAR_GIT_USER_NAME,
    GIT_COMMITTER_EMAIL: SIDECAR_GIT_USER_EMAIL,
  };
}

function sidecarOpenKey(
  graphRoot: string,
  sidecarRepo: string,
  options: WarpSidecarOpenOptions,
): string {
  return JSON.stringify([
    graphRoot,
    sidecarRepo,
    options.writerId,
    options.checkpointEvery ?? null,
  ]);
}

export function resolveWarpSidecarLocation(
  graphRoot: string,
  identity: WarpSidecarIdentity,
): WarpSidecarLocation {
  const resolvedRoot = resolveWarpGraphRoot(graphRoot);
  assertGraphStorageDisjoint(resolvedRoot, identity);
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

export function openWarpSidecar(options: WarpSidecarOpenOptions): Promise<WarpApp> {
  let sidecarRepo: string;
  let graphRoot: string;
  try {
    sidecarRepo = resolveRequiredStoragePath(
      options.sidecarRepo,
      "sidecar repository path",
    );
    graphRoot = options.graphRoot === undefined
      ? path.resolve(sidecarRepo, "../../../..")
      : resolveWarpGraphRoot(options.graphRoot);
  } catch (error: unknown) {
    return Promise.reject(error);
  }
  const key = sidecarOpenKey(graphRoot, sidecarRepo, options);
  const inFlight = inFlightSidecarOpens.get(key);
  if (inFlight !== undefined) return inFlight;

  const opened = (async () => {
    await ensureBareRepository(graphRoot, sidecarRepo);
    return openWarp({
      cwd: sidecarRepo,
      writerId: options.writerId,
      gitEnv: sidecarGitEnvironment(),
      ...(options.checkpointEvery !== undefined ? { checkpointEvery: options.checkpointEvery } : {}),
    });
  })();
  inFlightSidecarOpens.set(key, opened);

  const clear = (): void => {
    if (inFlightSidecarOpens.get(key) === opened) {
      inFlightSidecarOpens.delete(key);
    }
  };
  void opened.then(clear, clear);
  return opened;
}
