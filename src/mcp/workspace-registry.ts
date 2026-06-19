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

export type WorkspaceRegistryKind = "git" | "directory";

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
  readonly status: "confirmed";
  readonly createdAt: string;
  readonly lastObservedAt: string;
  readonly evidence: {
    readonly kind: "git";
    readonly canonicalRoot: string;
    readonly gitCommonDir: string;
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

async function exists(filePath: string): Promise<boolean> {
  try {
    await fsp.access(filePath);
    return true;
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    return JSON.parse(await fsp.readFile(filePath, "utf8")) as T;
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function ensurePrivateDirectory(dir: string): Promise<void> {
  await fsp.mkdir(dir, { recursive: true, mode: 0o700 });
  const stat = await fsp.lstat(dir);
  if (stat.isSymbolicLink()) {
    throw new Error(`Refusing to use symlinked Graft storage directory: ${dir}`);
  }
  await fsp.chmod(dir, 0o700).catch(() => undefined);
}

async function writeJsonAtomic(filePath: string, value: unknown): Promise<void> {
  await ensurePrivateDirectory(path.dirname(filePath));
  const tmp = path.join(
    path.dirname(filePath),
    `.${path.basename(filePath)}.${String(process.pid)}.${crypto.randomUUID()}.tmp`,
  );
  await fsp.writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  await fsp.chmod(tmp, 0o600).catch(() => undefined);
  await fsp.rename(tmp, filePath);
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
  const existing = await readJson<InstallationRecord>(installationPath);
  if (existing !== null) {
    return existing.installationId;
  }
  const randomBytes = input.randomBytes ?? crypto.randomBytes;
  const record: InstallationRecord = {
    schemaVersion: 1,
    installationId: randomBytes(ID_DIGEST_BYTES).toString("hex"),
    createdAt: nowIso(input.now),
  };
  await writeJsonAtomic(installationPath, record);
  return record.installationId;
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
  const existing = await readJson<WorkspaceMetadataRecord>(workspaceOnlyPaths.metadataPath);
  const timestamp = nowIso(input.now);
  const incarnationId = existing?.incarnationId
    ?? randomTypedId("wi_", input.randomBytes ?? crypto.randomBytes);
  const paths = registryPaths(graftDir, workspaceId, incarnationId);
  await ensurePrivateDirectory(paths.workspaceDir);
  await ensurePrivateDirectory(paths.incarnationDir);
  await ensurePrivateDirectory(path.join(paths.incarnationCacheDir, "outlines"));
  await ensurePrivateDirectory(path.join(paths.incarnationCacheDir, "documents"));
  await ensurePrivateDirectory(path.join(paths.incarnationCacheDir, "maps"));

  const metadata: WorkspaceMetadataRecord = {
    schemaVersion: 1,
    workspaceId,
    displayName: path.basename(canonicalRoot),
    canonicalRoot,
    gitCommonDir,
    sanitizedRemotes: [...new Set((input.remotes ?? []).map(sanitizeRemoteUrl).filter((remote) => remote.length > 0))],
    incarnationId,
    historyBindingIds: existing?.historyBindingIds ?? [],
    storage: {
      registry: "graft-managed",
      cache: "graft-managed",
    },
    createdAt: existing?.createdAt ?? timestamp,
    lastObservedAt: timestamp,
    retention: existing?.retention ?? defaultRetention(),
  };
  const incarnation: IncarnationMetadataRecord = {
    schemaVersion: 1,
    workspaceId,
    incarnationId,
    status: "confirmed",
    createdAt: await exists(paths.incarnationMetadataPath)
      ? (await readJson<IncarnationMetadataRecord>(paths.incarnationMetadataPath))?.createdAt ?? timestamp
      : timestamp,
    lastObservedAt: timestamp,
    evidence: {
      kind: "git",
      canonicalRoot,
      gitCommonDir,
    },
  };

  await writeJsonAtomic(paths.metadataPath, metadata);
  await writeJsonAtomic(paths.incarnationMetadataPath, incarnation);
  return { workspaceId, incarnationId, metadata, paths };
}
