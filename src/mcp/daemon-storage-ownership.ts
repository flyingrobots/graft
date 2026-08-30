import * as crypto from "node:crypto";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { socketHasActiveListener } from "./daemon-bootstrap.js";

const ROOT_OWNER_FILE = "daemon-owner.json";
const SESSION_OWNER_FILE = ".graft-session-owner.json";
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

export class DaemonRootOwnershipError extends Error {
  readonly code = "DAEMON_ROOT_ALREADY_OWNED";

  constructor(instanceId: string) {
    super(`Graft daemon root is already owned by ${instanceId}`);
    this.name = "DaemonRootOwnershipError";
  }
}

function errorCode(error: unknown): string | undefined {
  return error instanceof Error && "code" in error
    ? (error as NodeJS.ErrnoException).code
    : undefined;
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

async function isEligibleSessionDirectory(sessionsRoot: string, sessionId: string): Promise<boolean> {
  const sessionDir = path.join(sessionsRoot, sessionId);
  const stat = await fs.lstat(sessionDir).catch((error: unknown) => {
    if (errorCode(error) === "ENOENT") return null;
    throw error;
  });
  if (stat === null || !stat.isDirectory() || stat.isSymbolicLink()) return false;

  const markerPath = path.join(sessionDir, SESSION_OWNER_FILE);
  const markerStat = await fs.lstat(markerPath).catch((error: unknown) => {
    if (errorCode(error) === "ENOENT") return null;
    throw error;
  });
  if (markerStat === null) return true;
  if (!markerStat.isFile() || markerStat.isSymbolicLink()) return false;

  try {
    const parsed = JSON.parse(await fs.readFile(markerPath, "utf-8")) as unknown;
    return isSessionOwnerRecord(parsed, sessionId);
  } catch {
    return false;
  }
}

export async function removeSessionOrphanDirectories(
  sessionsRoot: string,
  liveSessionIds: ReadonlySet<string>,
): Promise<number> {
  const entries = await fs.readdir(sessionsRoot, { withFileTypes: true });
  let removed = 0;
  for (const entry of entries) {
    const sessionId = entry.name;
    if (!UUID_PATTERN.test(sessionId) || liveSessionIds.has(sessionId)) continue;
    if (!await isEligibleSessionDirectory(sessionsRoot, sessionId)) continue;
    await fs.rm(path.join(sessionsRoot, sessionId), { recursive: true, force: false });
    removed++;
  }
  return removed;
}
