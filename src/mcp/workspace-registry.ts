import * as crypto from "node:crypto";
import * as fsp from "node:fs/promises";
import * as path from "node:path";
import { encodeCanonicalCbor, type CborValue } from "../echo/canonical-cbor.js";

const WORKSPACE_ID_SCHEMA_VERSION = 1;
const INSTALLATION_FILE = "installation.json";
const WORKSPACES_DIR = "workspaces";
const METADATA_FILE = "metadata.json";
const BASE32_ALPHABET = "abcdefghijklmnopqrstuvwxyz234567";
const ID_DIGEST_BYTES = 16;
const PRIVATE_DIR_MODE = 0o700;
const PRIVATE_FILE_MODE = 0o600;
const INSTALLATION_LOCK_DIR = "installation.lock";
const INSTALLATION_LOCK_STALE_MS = 5 * 60 * 1000;

export type WorkspaceRegistryKind = "git" | "directory";
export type IncarnationStatus = "confirmed" | "suspect" | "replaced" | "unknown";

export interface WorkspaceIdentityInput {
  readonly installationId: string;
  readonly platformNamespace: string;
  readonly volumeNamespace: string;
  readonly workspaceKind: WorkspaceRegistryKind;
  readonly canonicalIdentityComponents: readonly string[];
}

export interface WorkspaceRegistryPaths {
  readonly graftDir: string;
  readonly workspaceDir: string;
  readonly metadataPath: string;
  readonly incarnationsDir: string;
  readonly incarnationDir: string;
  readonly incarnationMetadataPath: string;
  readonly incarnationCacheDir: string;
}

export interface WorkspaceRegistryRetention {
  readonly cachePolicy: "derived-content";
  readonly workspaceBudgetBytes: number;
  readonly ttlDays: number;
}

export interface WorkspaceRegistryStorage {
  readonly registry: "graft-managed";
  readonly cache: "graft-managed";
}

export interface WorkspaceMetadataRecord {
  readonly schemaVersion: 1;
  readonly workspaceId: string;
  readonly displayName: string;
  readonly canonicalRoot: string;
  readonly gitCommonDir: string;
  readonly sanitizedRemotes: readonly string[];
  readonly incarnationId: string;
  readonly historyBindingIds: readonly string[];
  readonly storage: WorkspaceRegistryStorage;
  readonly createdAt: string;
  readonly lastObservedAt: string;
  readonly retention: WorkspaceRegistryRetention;
}

export interface IncarnationMetadataRecord {
  readonly schemaVersion: 1;
  readonly workspaceId: string;
  readonly incarnationId: string;
  readonly incarnationStatus: IncarnationStatus;
  readonly createdAt: string;
  readonly lastObservedAt: string;
  readonly evidence: {
    readonly kind: "git";
    readonly canonicalRoot: string;
    readonly gitCommonDir: string;
    readonly repositoryFingerprint?: string | undefined;
  };
}

export interface ObserveGitWorkspaceInput {
  readonly graftDir: string;
  readonly canonicalRoot: string;
  readonly gitCommonDir: string;
  readonly remotes?: readonly string[] | undefined;
  readonly installationId?: string | undefined;
  readonly platformNamespace?: string | undefined;
  readonly volumeNamespace?: string | undefined;
  readonly now?: (() => string) | undefined;
  readonly randomBytes?: ((size: number) => Buffer) | undefined;
  readonly repositoryFingerprint?: string | undefined;
}

export interface ObservedWorkspaceRecord {
  readonly workspaceId: string;
  readonly incarnationId: string;
  readonly metadata: WorkspaceMetadataRecord;
  readonly paths: WorkspaceRegistryPaths;
}

interface InstallationRecord {
  readonly schemaVersion: 1;
  readonly installationId: string;
  readonly createdAt: string;
}

function sha256(bytes: Uint8Array): Buffer {
  return crypto.createHash("sha256").update(bytes).digest();
}

function base32Lower(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31] ?? "";
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31] ?? "";
  }
  return output;
}

function typedDigestId(prefix: string, value: CborValue): string {
  return `${prefix}${base32Lower(sha256(encodeCanonicalCbor(value)).subarray(0, ID_DIGEST_BYTES))}`;
}

function randomTypedId(prefix: string, randomBytes: (size: number) => Buffer): string {
  return `${prefix}${base32Lower(randomBytes(ID_DIGEST_BYTES))}`;
}

function defaultPlatformNamespace(): string {
  return `${process.platform}:${process.arch}`;
}

function defaultVolumeNamespace(root: string): string {
  return path.parse(root).root;
}

function defaultRetention(): WorkspaceRegistryRetention {
  return {
    cachePolicy: "derived-content",
    workspaceBudgetBytes: 100 * 1024 * 1024,
    ttlDays: 30,
  };
}

function nowIso(now: (() => string) | undefined): string {
  return now?.() ?? new Date().toISOString();
}

function hasErrorCode(error: unknown, code: string): boolean {
  return error instanceof Error && "code" in error && error.code === code;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isTypedId(value: unknown, prefix: string): value is string {
  return typeof value === "string" && new RegExp(`^${prefix}[a-z2-7]{26}$`, "u").test(value);
}

function isRetention(value: unknown): value is WorkspaceRegistryRetention {
  return isRecord(value)
    && value["cachePolicy"] === "derived-content"
    && typeof value["workspaceBudgetBytes"] === "number"
    && Number.isFinite(value["workspaceBudgetBytes"])
    && typeof value["ttlDays"] === "number"
    && Number.isFinite(value["ttlDays"]);
}

function isStorage(value: unknown): value is WorkspaceRegistryStorage {
  return isRecord(value)
    && value["registry"] === "graft-managed"
    && value["cache"] === "graft-managed";
}

function isInstallationRecord(value: unknown): value is InstallationRecord {
  return isRecord(value)
    && value["schemaVersion"] === 1
    && typeof value["installationId"] === "string"
    && typeof value["createdAt"] === "string";
}

function isWorkspaceMetadataRecord(value: unknown): value is WorkspaceMetadataRecord {
  return isRecord(value)
    && value["schemaVersion"] === 1
    && typeof value["workspaceId"] === "string"
    && isTypedId(value["workspaceId"], "ws_")
    && typeof value["displayName"] === "string"
    && typeof value["canonicalRoot"] === "string"
    && typeof value["gitCommonDir"] === "string"
    && isStringArray(value["sanitizedRemotes"])
    && isTypedId(value["incarnationId"], "wi_")
    && isStringArray(value["historyBindingIds"])
    && isStorage(value["storage"])
    && typeof value["createdAt"] === "string"
    && typeof value["lastObservedAt"] === "string"
    && isRetention(value["retention"]);
}

function isIncarnationStatus(value: unknown): value is IncarnationStatus {
  return value === "confirmed" || value === "suspect" || value === "replaced" || value === "unknown";
}

function isIncarnationMetadataRecord(value: unknown): value is IncarnationMetadataRecord {
  if (!isRecord(value) || !isRecord(value["evidence"])) {
    return false;
  }
  const evidence = value["evidence"];
  return value["schemaVersion"] === 1
    && isTypedId(value["workspaceId"], "ws_")
    && isTypedId(value["incarnationId"], "wi_")
    && isIncarnationStatus(value["incarnationStatus"])
    && typeof value["createdAt"] === "string"
    && typeof value["lastObservedAt"] === "string"
    && evidence["kind"] === "git"
    && typeof evidence["canonicalRoot"] === "string"
    && typeof evidence["gitCommonDir"] === "string"
    && (evidence["repositoryFingerprint"] === undefined || typeof evidence["repositoryFingerprint"] === "string");
}

function assertInsideGraftDir(graftDir: string, targetPath: string): void {
  const root = path.resolve(graftDir);
  const target = path.resolve(targetPath);
  const relative = path.relative(root, target);
  if (relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))) {
    return;
  }
  throw new Error(`Refusing to use storage path outside Graft home: ${targetPath}`);
}

async function assertPrivateDirectory(dir: string): Promise<void> {
  const initial = await fsp.lstat(dir);
  if (initial.isSymbolicLink()) {
    throw new Error(`Refusing to use symlinked Graft storage directory: ${dir}`);
  }
  if (!initial.isDirectory()) {
    throw new Error(`Refusing to use non-directory Graft storage path: ${dir}`);
  }
  await fsp.chmod(dir, PRIVATE_DIR_MODE);
  const current = await fsp.lstat(dir);
  if (current.isSymbolicLink() || !current.isDirectory()) {
    throw new Error(`Refusing to use unsafe Graft storage directory: ${dir}`);
  }
  if (process.platform !== "win32" && (current.mode & 0o077) !== 0) {
    throw new Error(`Refusing to use non-private Graft storage directory: ${dir}`);
  }
}

async function ensurePrivateDirectory(dir: string): Promise<void> {
  await fsp.mkdir(dir, { recursive: true, mode: PRIVATE_DIR_MODE });
  await assertPrivateDirectory(dir);
}

async function ensureManagedDirectory(graftDir: string, targetDir: string): Promise<void> {
  const root = path.resolve(graftDir);
  const target = path.resolve(targetDir);
  assertInsideGraftDir(root, target);
  await ensurePrivateDirectory(root);
  const relative = path.relative(root, target);
  if (relative === "") {
    return;
  }

  let current = root;
  for (const part of relative.split(path.sep)) {
    if (part.length === 0 || part === "." || part === "..") {
      throw new Error(`Refusing to create unsafe Graft storage path: ${targetDir}`);
    }
    current = path.join(current, part);
    try {
      await fsp.mkdir(current, { mode: PRIVATE_DIR_MODE });
    } catch (error: unknown) {
      if (!hasErrorCode(error, "EEXIST")) {
        throw error;
      }
    }
    await assertPrivateDirectory(current);
  }
}

async function quarantineRegistryFile(graftDir: string, filePath: string, reason: string): Promise<never> {
  assertInsideGraftDir(graftDir, filePath);
  const quarantinePath = path.join(
    path.dirname(filePath),
    `${path.basename(filePath)}.quarantine.${String(Date.now())}.${crypto.randomUUID()}`,
  );
  try {
    await fsp.rename(filePath, quarantinePath);
  } catch (error: unknown) {
    if (!hasErrorCode(error, "ENOENT")) {
      throw error;
    }
  }
  throw new Error(`${reason}; quarantined ${filePath}`);
}

async function readRegistryJson<T>(
  graftDir: string,
  filePath: string,
  guard: (value: unknown) => value is T,
  label: string,
): Promise<T | null> {
  try {
    const stat = await fsp.lstat(filePath);
    if (stat.isSymbolicLink() || !stat.isFile()) {
      await quarantineRegistryFile(graftDir, filePath, `Unsupported ${label}: unsafe file type`);
    }
    const raw = await fsp.readFile(filePath, "utf8");
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      await quarantineRegistryFile(graftDir, filePath, `Unsupported ${label}: invalid JSON`);
    }
    if (!guard(parsed)) {
      await quarantineRegistryFile(graftDir, filePath, `Unsupported ${label}: schema mismatch`);
    }
    return parsed as T;
  } catch (error: unknown) {
    if (hasErrorCode(error, "ENOENT")) {
      return null;
    }
    throw error;
  }
}

async function writeJsonAtomic(graftDir: string, filePath: string, value: unknown): Promise<void> {
  await ensureManagedDirectory(graftDir, path.dirname(filePath));
  const tmp = path.join(
    path.dirname(filePath),
    `.${path.basename(filePath)}.${String(process.pid)}.${crypto.randomUUID()}.tmp`,
  );
  await fsp.writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: "utf8",
    mode: PRIVATE_FILE_MODE,
  });
  await fsp.chmod(tmp, PRIVATE_FILE_MODE);
  await fsp.rename(tmp, filePath);
}

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function withInstallationLock<T>(graftDir: string, work: () => Promise<T>): Promise<T> {
  const lockDir = path.join(path.resolve(graftDir), INSTALLATION_LOCK_DIR);
  await ensureManagedDirectory(graftDir, path.dirname(lockDir));
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      await fsp.mkdir(lockDir, { mode: PRIVATE_DIR_MODE });
    } catch (error: unknown) {
      if (hasErrorCode(error, "EEXIST")) {
        if (await removeStaleInstallationLock(lockDir)) {
          continue;
        }
        await delay(10);
        continue;
      }
      throw error;
    }
    await assertPrivateDirectory(lockDir);
    try {
      return await work();
    } finally {
      await fsp.rm(lockDir, { recursive: true, force: true });
    }
  }
  throw new Error(`Timed out waiting for Graft installation lock: ${lockDir}`);
}

async function removeStaleInstallationLock(lockDir: string): Promise<boolean> {
  let stat;
  try {
    stat = await fsp.lstat(lockDir);
  } catch (error: unknown) {
    if (hasErrorCode(error, "ENOENT")) {
      return true;
    }
    throw error;
  }
  if (stat.isSymbolicLink() || !stat.isDirectory()) {
    throw new Error(`Refusing to use unsafe Graft installation lock: ${lockDir}`);
  }
  if (Date.now() - stat.mtimeMs < INSTALLATION_LOCK_STALE_MS) {
    return false;
  }
  await fsp.rm(lockDir, { recursive: true, force: true });
  return true;
}

async function fingerprintGitCommonDir(gitCommonDir: string): Promise<string | null> {
  try {
    const stat = await fsp.stat(gitCommonDir);
    return `fs:${String(stat.dev)}:${String(stat.ino)}`;
  } catch {
    return null;
  }
}

function fingerprintMatches(
  existing: IncarnationMetadataRecord | null,
  currentFingerprint: string | null,
): boolean {
  const existingFingerprint = existing?.evidence.repositoryFingerprint;
  return existingFingerprint !== undefined
    && currentFingerprint !== null
    && existingFingerprint === currentFingerprint;
}

function canReuseIncarnation(
  existingWorkspace: WorkspaceMetadataRecord | null,
  existingIncarnation: IncarnationMetadataRecord | null,
  currentFingerprint: string | null,
): boolean {
  if (existingWorkspace === null || existingIncarnation === null) {
    return false;
  }
  return existingWorkspace.incarnationId === existingIncarnation.incarnationId
    && existingWorkspace.workspaceId === existingIncarnation.workspaceId
    && existingWorkspace.canonicalRoot === existingIncarnation.evidence.canonicalRoot
    && existingWorkspace.gitCommonDir === existingIncarnation.evidence.gitCommonDir
    && fingerprintMatches(existingIncarnation, currentFingerprint);
}

function observedIncarnationStatus(
  hadExistingWorkspace: boolean,
  existingIncarnation: IncarnationMetadataRecord | null,
  currentFingerprint: string | null,
  reuseExistingIncarnation: boolean,
): IncarnationStatus {
  if (reuseExistingIncarnation) {
    return existingIncarnation?.incarnationStatus ?? "confirmed";
  }
  const existingFingerprint = existingIncarnation?.evidence.repositoryFingerprint;
  if (existingFingerprint !== undefined && currentFingerprint !== null && existingFingerprint !== currentFingerprint) {
    return "replaced";
  }
  if (hadExistingWorkspace) {
    return "suspect";
  }
  return currentFingerprint === null ? "unknown" : "confirmed";
}

export function deriveWorkspaceId(input: WorkspaceIdentityInput): string {
  return typedDigestId("ws_", [
    "graft-workspace",
    WORKSPACE_ID_SCHEMA_VERSION,
    input.installationId,
    input.platformNamespace,
    input.volumeNamespace,
    input.workspaceKind,
    [...input.canonicalIdentityComponents],
  ]);
}

export function registryPaths(
  graftDir: string,
  workspaceId: string,
  incarnationId: string,
): WorkspaceRegistryPaths {
  const resolvedGraftDir = path.resolve(graftDir);
  const workspaceDir = path.join(resolvedGraftDir, WORKSPACES_DIR, workspaceId);
  const incarnationsDir = path.join(workspaceDir, "incarnations");
  const incarnationDir = path.join(incarnationsDir, incarnationId);
  return {
    graftDir: resolvedGraftDir,
    workspaceDir,
    metadataPath: path.join(workspaceDir, METADATA_FILE),
    incarnationsDir,
    incarnationDir,
    incarnationMetadataPath: path.join(incarnationDir, METADATA_FILE),
    incarnationCacheDir: path.join(incarnationDir, "cache"),
  };
}

export function sanitizeRemoteUrl(remote: string): string {
  const trimmed = remote.trim();
  if (trimmed.length === 0) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    parsed.username = "";
    parsed.password = "";
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return trimmed.replace(/[?#].*$/u, "");
  }
}

export async function loadOrCreateInstallationId(input: {
  readonly graftDir: string;
  readonly now?: (() => string) | undefined;
  readonly randomBytes?: ((size: number) => Buffer) | undefined;
}): Promise<string> {
  const graftDir = path.resolve(input.graftDir);
  await ensurePrivateDirectory(graftDir);
  const installationPath = path.join(graftDir, INSTALLATION_FILE);
  const existing = await readRegistryJson(graftDir, installationPath, isInstallationRecord, "installation record");
  if (existing !== null) {
    return existing.installationId;
  }
  return withInstallationLock(graftDir, async () => {
    const lockedExisting = await readRegistryJson(graftDir, installationPath, isInstallationRecord, "installation record");
    if (lockedExisting !== null) {
      return lockedExisting.installationId;
    }
    const randomBytes = input.randomBytes ?? crypto.randomBytes;
    const record: InstallationRecord = {
      schemaVersion: 1,
      installationId: randomBytes(ID_DIGEST_BYTES).toString("hex"),
      createdAt: nowIso(input.now),
    };
    await writeJsonAtomic(graftDir, installationPath, record);
    return record.installationId;
  });
}

export async function observeGitWorkspace(input: ObserveGitWorkspaceInput): Promise<ObservedWorkspaceRecord> {
  const graftDir = path.resolve(input.graftDir);
  const canonicalRoot = path.resolve(input.canonicalRoot);
  const gitCommonDir = path.resolve(input.gitCommonDir);
  const installationId = input.installationId ?? await loadOrCreateInstallationId({
    graftDir,
    now: input.now,
    randomBytes: input.randomBytes,
  });
  const workspaceId = deriveWorkspaceId({
    installationId,
    platformNamespace: input.platformNamespace ?? defaultPlatformNamespace(),
    volumeNamespace: input.volumeNamespace ?? defaultVolumeNamespace(canonicalRoot),
    workspaceKind: "git",
    canonicalIdentityComponents: [
      canonicalRoot,
      gitCommonDir,
    ],
  });
  const placeholderIncarnationId = "wi_placeholder";
  const workspaceOnlyPaths = registryPaths(graftDir, workspaceId, placeholderIncarnationId);
  await ensureManagedDirectory(graftDir, workspaceOnlyPaths.workspaceDir);
  const existing = await readRegistryJson(
    graftDir,
    workspaceOnlyPaths.metadataPath,
    isWorkspaceMetadataRecord,
    "workspace metadata",
  );
  if (existing !== null && existing.workspaceId !== workspaceId) {
    await quarantineRegistryFile(graftDir, workspaceOnlyPaths.metadataPath, "Unsupported workspace metadata: identity mismatch");
  }
  const timestamp = nowIso(input.now);
  const existingIncarnationPaths = existing === null
    ? null
    : registryPaths(graftDir, workspaceId, existing.incarnationId);
  if (existingIncarnationPaths !== null) {
    await ensureManagedDirectory(graftDir, existingIncarnationPaths.incarnationDir);
  }
  const existingIncarnation = existingIncarnationPaths === null
    ? null
    : await readRegistryJson(
      graftDir,
      existingIncarnationPaths.incarnationMetadataPath,
      isIncarnationMetadataRecord,
      "incarnation metadata",
    );
  if (
    existing !== null
    && existingIncarnation !== null
    && (existingIncarnation.workspaceId !== workspaceId || existingIncarnation.incarnationId !== existing.incarnationId)
  ) {
    await quarantineRegistryFile(
      graftDir,
      existingIncarnationPaths?.incarnationMetadataPath ?? workspaceOnlyPaths.metadataPath,
      "Unsupported incarnation metadata: identity mismatch",
    );
  }
  const repositoryFingerprint = input.repositoryFingerprint ?? await fingerprintGitCommonDir(gitCommonDir);
  const reuseExistingIncarnation = canReuseIncarnation(existing, existingIncarnation, repositoryFingerprint);
  const incarnationId = reuseExistingIncarnation && existing !== null
    ? existing.incarnationId
    : randomTypedId("wi_", input.randomBytes ?? crypto.randomBytes);
  const paths = registryPaths(graftDir, workspaceId, incarnationId);
  await ensureManagedDirectory(graftDir, paths.workspaceDir);
  await ensureManagedDirectory(graftDir, paths.incarnationDir);
  await ensureManagedDirectory(graftDir, path.join(paths.incarnationCacheDir, "outlines"));
  await ensureManagedDirectory(graftDir, path.join(paths.incarnationCacheDir, "documents"));
  await ensureManagedDirectory(graftDir, path.join(paths.incarnationCacheDir, "maps"));

  const metadata: WorkspaceMetadataRecord = {
    schemaVersion: 1,
    workspaceId,
    displayName: path.basename(canonicalRoot),
    canonicalRoot,
    gitCommonDir,
    sanitizedRemotes: [...new Set((input.remotes ?? []).map(sanitizeRemoteUrl).filter((remote) => remote.length > 0))],
    incarnationId,
    historyBindingIds: reuseExistingIncarnation && existing !== null ? existing.historyBindingIds : [],
    storage: {
      registry: "graft-managed",
      cache: "graft-managed",
    },
    createdAt: existing?.createdAt ?? timestamp,
    lastObservedAt: timestamp,
    retention: existing?.retention ?? defaultRetention(),
  };
  const existingIncarnationCreatedAt = reuseExistingIncarnation
    ? existingIncarnation?.createdAt
    : undefined;
  const incarnationStatus = observedIncarnationStatus(
    existing !== null,
    existingIncarnation,
    repositoryFingerprint,
    reuseExistingIncarnation,
  );
  const incarnation: IncarnationMetadataRecord = {
    schemaVersion: 1,
    workspaceId,
    incarnationId,
    incarnationStatus,
    createdAt: existingIncarnationCreatedAt ?? timestamp,
    lastObservedAt: timestamp,
    evidence: {
      kind: "git",
      canonicalRoot,
      gitCommonDir,
      ...(repositoryFingerprint === null ? {} : { repositoryFingerprint }),
    },
  };

  await writeJsonAtomic(graftDir, paths.metadataPath, metadata);
  await writeJsonAtomic(graftDir, paths.incarnationMetadataPath, incarnation);
  return { workspaceId, incarnationId, metadata, paths };
}
