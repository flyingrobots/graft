import * as crypto from "node:crypto";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { socketHasActiveListener } from "./daemon-bootstrap.js";

const ROOT_OWNER_FILE = "daemon-owner.json";
const SESSION_OWNER_FILE = ".graft-session-owner.json";
const PRIVATE_DIRECTORY_MODE = 0o700;
const PRIVATE_FILE_MODE = 0o600;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;

interface DaemonRootOwnerRecord {
  readonly schemaVersion: 1;
  readonly instanceId: string;
  readonly pid: number;
  readonly socketPath: string;
}

interface SessionOwnerRecord {
  readonly schemaVersion: 1;
  readonly daemonInstanceId: string;
  readonly sessionId: string;
}

export interface DaemonRootOwnership {
  readonly instanceId: string;
  release(): Promise<void>;
}

export interface SessionOrphanRemovalFailure {
  readonly sessionId: string;
  readonly path: string;
  readonly error: unknown;
}

export type SessionOrphanPreservationReason =
  | "UNKNOWN_ENTRY_NAME"
  | "NOT_DIRECTORY"
  | "SYMBOLIC_LINK"
  | "UNSAFE_OWNERSHIP_MARKER"
  | "UNREADABLE_OWNERSHIP_MARKER"
  | "MALFORMED_OWNERSHIP_MARKER";

export interface SessionOrphanPreservedEntry {
  readonly entryName: string;
  readonly path: string;
  readonly reason: SessionOrphanPreservationReason;
}

export interface SessionOrphanRemovalResult {
  readonly removed: number;
  readonly failures: readonly SessionOrphanRemovalFailure[];
  readonly preservedEntries: readonly SessionOrphanPreservedEntry[];
}

export interface DaemonSessionStorage {
  writeSessionOwnershipMarker(
    sessionDir: string,
    daemonInstanceId: string,
    sessionId: string,
  ): Promise<void>;
  removeSessionDirectory(sessionDir: string): Promise<boolean>;
  removeSessionOrphanDirectories(
    sessionsRoot: string,
    liveSessionIds: ReadonlySet<string>,
  ): Promise<SessionOrphanRemovalResult>;
}

export class DaemonRootOwnershipError extends Error {
  readonly code = "DAEMON_ROOT_ALREADY_OWNED";

  constructor(instanceId: string) {
    super(`Graft daemon root is already owned by ${instanceId}`);
    this.name = "DaemonRootOwnershipError";
  }
}

export class UnsafeDaemonSessionsRootError extends Error {
  readonly code = "UNSAFE_DAEMON_SESSIONS_ROOT";

  constructor(sessionsRoot: string) {
    super(`Refusing unsafe daemon sessions root: ${sessionsRoot}`);
    this.name = "UnsafeDaemonSessionsRootError";
  }
}

function errorCode(error: unknown): string | undefined {
  return error instanceof Error && "code" in error
    ? (error as NodeJS.ErrnoException).code
    : undefined;
}

export async function ensureDaemonSessionsRoot(sessionsRoot: string): Promise<void> {
  try {
    await fs.mkdir(sessionsRoot, { mode: PRIVATE_DIRECTORY_MODE });
  } catch (error: unknown) {
    if (errorCode(error) !== "EEXIST") throw error;
  }

  const stat = await fs.lstat(sessionsRoot);
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new UnsafeDaemonSessionsRootError(sessionsRoot);
  }
  if (process.platform !== "win32") {
    await fs.chmod(sessionsRoot, PRIVATE_DIRECTORY_MODE);
  }
}

function isDaemonRootOwnerRecord(value: unknown): value is DaemonRootOwnerRecord {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<DaemonRootOwnerRecord>;
  return candidate.schemaVersion === 1
    && typeof candidate.instanceId === "string"
    && UUID_PATTERN.test(candidate.instanceId)
    && Number.isSafeInteger(candidate.pid)
    && (candidate.pid ?? 0) > 0
    && typeof candidate.socketPath === "string"
    && candidate.socketPath.length > 0;
}

function isSessionOwnerRecord(value: unknown, sessionId: string): value is SessionOwnerRecord {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<SessionOwnerRecord>;
  return candidate.schemaVersion === 1
    && typeof candidate.daemonInstanceId === "string"
    && UUID_PATTERN.test(candidate.daemonInstanceId)
    && candidate.sessionId === sessionId;
}

function processIsAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error: unknown) {
    return errorCode(error) !== "ESRCH";
  }
}

async function readRootOwner(ownerPath: string): Promise<DaemonRootOwnerRecord | null> {
  const stat = await fs.lstat(ownerPath).catch((error: unknown) => {
    if (errorCode(error) === "ENOENT") return null;
    throw error;
  });
  if (stat === null) return null;
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new Error(`Refusing unsafe daemon root owner path: ${ownerPath}`);
  }
  const parsed = JSON.parse(await fs.readFile(ownerPath, "utf-8")) as unknown;
  if (!isDaemonRootOwnerRecord(parsed)) {
    throw new Error(`Refusing malformed daemon root owner record: ${ownerPath}`);
  }
  return parsed;
}

export async function acquireDaemonRootOwnership(input: {
  readonly graftDir: string;
  readonly socketPath: string;
}): Promise<DaemonRootOwnership> {
  const ownerPath = path.join(path.resolve(input.graftDir), ROOT_OWNER_FILE);
  const instanceId = crypto.randomUUID();
  const record: DaemonRootOwnerRecord = {
    schemaVersion: 1,
    instanceId,
    pid: process.pid,
    socketPath: input.socketPath,
  };

  for (;;) {
    try {
      await fs.writeFile(ownerPath, `${JSON.stringify(record)}\n`, {
        encoding: "utf-8",
        flag: "wx",
        mode: PRIVATE_FILE_MODE,
      });
      break;
    } catch (error: unknown) {
      if (errorCode(error) !== "EEXIST") throw error;
    }

    const current = await readRootOwner(ownerPath);
    if (current === null) continue;
    if (processIsAlive(current.pid) || await socketHasActiveListener(current.socketPath)) {
      throw new DaemonRootOwnershipError(current.instanceId);
    }

    const stalePath = `${ownerPath}.stale-${crypto.randomUUID()}`;
    try {
      await fs.rename(ownerPath, stalePath);
    } catch (error: unknown) {
      if (errorCode(error) === "ENOENT") continue;
      throw error;
    }
    await fs.unlink(stalePath);
  }

  let released = false;
  return {
    instanceId,
    async release(): Promise<void> {
      if (released) return;
      const current = await readRootOwner(ownerPath);
      if (current === null) {
        released = true;
        return;
      }
      if (current.instanceId !== instanceId) {
        throw new Error(`Refusing to release daemon root owned by ${current.instanceId}`);
      }
      const releasedPath = `${ownerPath}.released-${instanceId}`;
      await fs.rename(ownerPath, releasedPath);
      await fs.unlink(releasedPath);
      released = true;
    },
  };
}

export async function writeSessionOwnershipMarker(
  sessionDir: string,
  daemonInstanceId: string,
  sessionId: string,
): Promise<void> {
  const markerPath = path.join(sessionDir, SESSION_OWNER_FILE);
  const temporaryPath = `${markerPath}.${crypto.randomUUID()}.tmp`;
  const record: SessionOwnerRecord = {
    schemaVersion: 1,
    daemonInstanceId,
    sessionId,
  };
  try {
    await fs.writeFile(temporaryPath, `${JSON.stringify(record)}\n`, {
      encoding: "utf-8",
      flag: "wx",
      mode: PRIVATE_FILE_MODE,
    });
    await fs.rename(temporaryPath, markerPath);
  } catch (error) {
    await fs.unlink(temporaryPath).catch(() => undefined);
    throw error;
  }
}

export async function removeSessionDirectory(sessionDir: string): Promise<boolean> {
  const stat = await fs.lstat(sessionDir).catch((error: unknown) => {
    if (errorCode(error) === "ENOENT") return null;
    throw error;
  });
  if (stat === null) return false;
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new Error(`Refusing unsafe daemon session directory: ${sessionDir}`);
  }
  await fs.rm(sessionDir, { recursive: true, force: false });
  return true;
}

type SessionDirectoryInspection =
  | { readonly status: "eligible" }
  | { readonly status: "missing" }
  | { readonly status: "preserved"; readonly reason: SessionOrphanPreservationReason };

async function inspectSessionDirectory(
  sessionsRoot: string,
  sessionId: string,
): Promise<SessionDirectoryInspection> {
  const sessionDir = path.join(sessionsRoot, sessionId);
  const stat = await fs.lstat(sessionDir).catch((error: unknown) => {
    if (errorCode(error) === "ENOENT") return null;
    throw error;
  });
  if (stat === null) return { status: "missing" };
  if (stat.isSymbolicLink()) return { status: "preserved", reason: "SYMBOLIC_LINK" };
  if (!stat.isDirectory()) return { status: "preserved", reason: "NOT_DIRECTORY" };

  const markerPath = path.join(sessionDir, SESSION_OWNER_FILE);
  const markerStat = await fs.lstat(markerPath).catch((error: unknown) => {
    if (errorCode(error) === "ENOENT") return null;
    throw error;
  });
  if (markerStat === null) return { status: "eligible" };
  if (!markerStat.isFile() || markerStat.isSymbolicLink()) {
    return { status: "preserved", reason: "UNSAFE_OWNERSHIP_MARKER" };
  }

  let markerSource: string;
  try {
    markerSource = await fs.readFile(markerPath, "utf-8");
  } catch {
    return { status: "preserved", reason: "UNREADABLE_OWNERSHIP_MARKER" };
  }
  try {
    const parsed = JSON.parse(markerSource) as unknown;
    return isSessionOwnerRecord(parsed, sessionId)
      ? { status: "eligible" }
      : { status: "preserved", reason: "MALFORMED_OWNERSHIP_MARKER" };
  } catch {
    return { status: "preserved", reason: "MALFORMED_OWNERSHIP_MARKER" };
  }
}

export async function removeSessionOrphanDirectories(
  sessionsRoot: string,
  liveSessionIds: ReadonlySet<string>,
): Promise<SessionOrphanRemovalResult> {
  const entries = await fs.readdir(sessionsRoot, { withFileTypes: true });
  let removed = 0;
  const failures: SessionOrphanRemovalFailure[] = [];
  const preservedEntries: SessionOrphanPreservedEntry[] = [];
  for (const entry of entries) {
    const sessionId = entry.name;
    const sessionPath = path.join(sessionsRoot, sessionId);
    if (!UUID_PATTERN.test(sessionId)) {
      preservedEntries.push({
        entryName: sessionId,
        path: sessionPath,
        reason: "UNKNOWN_ENTRY_NAME",
      });
      continue;
    }
    if (liveSessionIds.has(sessionId)) continue;
    const inspection = await inspectSessionDirectory(sessionsRoot, sessionId);
    if (inspection.status === "missing") continue;
    if (inspection.status === "preserved") {
      preservedEntries.push({
        entryName: sessionId,
        path: sessionPath,
        reason: inspection.reason,
      });
      continue;
    }
    try {
      await fs.rm(sessionPath, { recursive: true, force: false });
      removed++;
    } catch (error) {
      failures.push({ sessionId, path: sessionPath, error });
    }
  }
  return { removed, failures, preservedEntries };
}

export const nodeDaemonSessionStorage: DaemonSessionStorage = Object.freeze({
  writeSessionOwnershipMarker,
  removeSessionDirectory,
  removeSessionOrphanDirectories,
});
