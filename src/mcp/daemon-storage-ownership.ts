import * as crypto from "node:crypto";
import { execFile } from "node:child_process";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { performance } from "node:perf_hooks";
import { resolveSocketPath, socketHasActiveListener } from "./daemon-bootstrap.js";

const ROOT_OWNER_FILE = "daemon-owner.json";
const ROOT_OWNER_CLAIM_SUFFIX = ".claim";
const ROOT_OWNER_CLAIM_RECORD_FILE = "claim.json";
const SESSION_OWNER_FILE = ".graft-session-owner.json";
const PRIVATE_DIRECTORY_MODE = 0o700;
const PRIVATE_FILE_MODE = 0o600;
const ROOT_OWNER_CLAIM_RETRY_MS = 5;
const ROOT_OWNER_CLAIM_TIMEOUT_MS = 5_000;
const GENERATED_UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const GENERIC_UNIX_PROCESS_WITNESS_PREFIX = "graft-daemon:";
const GENERIC_UNIX_PROCESS_WITNESS_PATTERN = /^graft-daemon:[0-9a-f]{32}$/u;

export interface DaemonRootOwnerRecord {
  readonly schemaVersion: 2;
  readonly instanceId: string;
  readonly pid: number;
  readonly processStartIdentity: string;
  readonly socketPath: string;
}

export interface DaemonRootOwnerLiveness {
  socketHasActiveListener(socketPath: string): Promise<boolean>;
  readProcessStartIdentity(pid: number): Promise<string | null>;
}

interface SessionOwnerRecord {
  readonly schemaVersion: 1;
  readonly daemonInstanceId: string;
  readonly sessionId: string;
}

interface DaemonRootOwnerClaimRecord {
  readonly schemaVersion: 1;
  readonly claimId: string;
  readonly pid: number;
  readonly processStartIdentity: string;
}

interface DaemonRootOwnerClaim {
  release(): Promise<void>;
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
  | "LEGACY_SESSION_UNMARKED"
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

export type LegacyUnmarkedSessionPolicy = "remove" | "preserve";

export interface DaemonSessionDirectoryIdentity {
  readonly device: number;
  readonly inode: number;
}

export interface DaemonSessionStorage {
  captureSessionDirectoryIdentity(
    sessionDir: string,
  ): Promise<DaemonSessionDirectoryIdentity>;
  writeSessionOwnershipMarker(
    sessionDir: string,
    daemonInstanceId: string,
    sessionId: string,
  ): Promise<void>;
  removeSessionDirectory(
    sessionDir: string,
    expectedIdentity: DaemonSessionDirectoryIdentity,
  ): Promise<boolean>;
  removeSessionOrphanDirectories(
    sessionsRoot: string,
    liveSessionIds: ReadonlySet<string>,
    legacyUnmarkedPolicy: LegacyUnmarkedSessionPolicy,
  ): Promise<SessionOrphanRemovalResult>;
}

export class DaemonRootOwnershipError extends Error {
  readonly code = "DAEMON_ROOT_ALREADY_OWNED";

  constructor(instanceId: string) {
    super(`Graft daemon root is already owned by ${instanceId}`);
    this.name = "DaemonRootOwnershipError";
  }
}

export class DaemonLegacyEndpointActiveError extends Error {
  readonly code = "DAEMON_LEGACY_ENDPOINT_ACTIVE";

  constructor(socketPath: string) {
    super(`A pre-ownership Graft daemon is already listening on ${socketPath}`);
    this.name = "DaemonLegacyEndpointActiveError";
  }
}

export class UnsafeDaemonSessionsRootError extends Error {
  readonly code = "UNSAFE_DAEMON_SESSIONS_ROOT";

  constructor(sessionsRoot: string) {
    super(`Refusing unsafe daemon sessions root: ${sessionsRoot}`);
    this.name = "UnsafeDaemonSessionsRootError";
  }
}

export class UnsafeDaemonSessionDirectoryError extends Error {
  readonly code = "UNSAFE_DAEMON_SESSION_DIRECTORY";

  constructor(sessionDir: string) {
    super(`Refusing unsafe daemon session directory: ${sessionDir}`);
    this.name = "UnsafeDaemonSessionDirectoryError";
  }
}

export class DaemonRootOwnerClaimTimeoutError extends Error {
  readonly code = "DAEMON_ROOT_OWNER_CLAIM_TIMEOUT";

  constructor(ownerPath: string) {
    super(`Timed out waiting to claim daemon root owner path: ${ownerPath}`);
    this.name = "DaemonRootOwnerClaimTimeoutError";
  }
}

function errorCode(error: unknown): string | undefined {
  return error instanceof Error && "code" in error
    ? (error as NodeJS.ErrnoException).code
    : undefined;
}

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error), { cause: error });
}

interface PinnedDaemonSessionsRoot {
  readonly path: string;
  readonly device: number;
  readonly inode: number;
  readonly handle: fs.FileHandle | null;
}

function daemonSessionsRootIdentityMatches(
  root: PinnedDaemonSessionsRoot,
  stat: Awaited<ReturnType<typeof fs.lstat>>,
): boolean {
  return stat.isDirectory()
    && !stat.isSymbolicLink()
    && stat.dev === root.device
    && stat.ino === root.inode;
}

function daemonSessionDirectoryIdentityMatches(
  expected: DaemonSessionDirectoryIdentity,
  stat: Awaited<ReturnType<typeof fs.lstat>>,
): boolean {
  return stat.isDirectory()
    && !stat.isSymbolicLink()
    && stat.dev === expected.device
    && stat.ino === expected.inode;
}

async function assertPinnedDaemonSessionsRoot(root: PinnedDaemonSessionsRoot): Promise<void> {
  const current = await fs.lstat(root.path).catch((error: unknown) => {
    if (errorCode(error) === "ENOENT") return null;
    throw error;
  });
  if (current === null || !daemonSessionsRootIdentityMatches(root, current)) {
    throw new UnsafeDaemonSessionsRootError(root.path);
  }
}

async function pinDaemonSessionsRoot(sessionsRoot: string): Promise<PinnedDaemonSessionsRoot> {
  const initial = await fs.lstat(sessionsRoot).catch((error: unknown) => {
    if (errorCode(error) === "ENOENT") return null;
    throw error;
  });
  if (initial === null || !initial.isDirectory() || initial.isSymbolicLink()) {
    throw new UnsafeDaemonSessionsRootError(sessionsRoot);
  }

  let handle: fs.FileHandle | null = null;
  try {
    if (process.platform !== "win32") {
      try {
        handle = await fs.open(sessionsRoot, "r");
      } catch (error: unknown) {
        if (["ELOOP", "ENOENT", "ENOTDIR"].includes(errorCode(error) ?? "")) {
          throw new UnsafeDaemonSessionsRootError(sessionsRoot);
        }
        throw error;
      }
    }
    const anchored = handle === null ? initial : await handle.stat();
    const root: PinnedDaemonSessionsRoot = {
      path: sessionsRoot,
      device: anchored.dev,
      inode: anchored.ino,
      handle,
    };
    if (
      anchored.dev !== initial.dev
      || anchored.ino !== initial.ino
      || !anchored.isDirectory()
    ) {
      throw new UnsafeDaemonSessionsRootError(sessionsRoot);
    }
    if (handle !== null) {
      await handle.chmod(PRIVATE_DIRECTORY_MODE);
    }
    await assertPinnedDaemonSessionsRoot(root);
    return root;
  } catch (error) {
    await handle?.close().catch(() => undefined);
    throw error;
  }
}

export async function ensureDaemonSessionsRoot(sessionsRoot: string): Promise<void> {
  try {
    await fs.mkdir(sessionsRoot, { mode: PRIVATE_DIRECTORY_MODE });
  } catch (error: unknown) {
    if (errorCode(error) !== "EEXIST") throw error;
  }
  const root = await pinDaemonSessionsRoot(sessionsRoot);
  try {
    await assertPinnedDaemonSessionsRoot(root);
  } finally {
    await root.handle?.close();
  }
}

function isDaemonRootOwnerRecord(value: unknown): value is DaemonRootOwnerRecord {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<DaemonRootOwnerRecord>;
  return candidate.schemaVersion === 2
    && typeof candidate.instanceId === "string"
    && GENERATED_UUID_PATTERN.test(candidate.instanceId)
    && Number.isSafeInteger(candidate.pid)
    && (candidate.pid ?? 0) > 0
    && typeof candidate.processStartIdentity === "string"
    && candidate.processStartIdentity.length > 0
    && typeof candidate.socketPath === "string"
    && candidate.socketPath.length > 0;
}

function isDaemonRootOwnerClaimRecord(value: unknown): value is DaemonRootOwnerClaimRecord {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<DaemonRootOwnerClaimRecord>;
  return candidate.schemaVersion === 1
    && typeof candidate.claimId === "string"
    && GENERATED_UUID_PATTERN.test(candidate.claimId)
    && Number.isSafeInteger(candidate.pid)
    && (candidate.pid ?? 0) > 0
    && typeof candidate.processStartIdentity === "string"
    && candidate.processStartIdentity.length > 0;
}

function isSessionOwnerRecord(value: unknown, sessionId: string): value is SessionOwnerRecord {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<SessionOwnerRecord>;
  return candidate.schemaVersion === 1
    && typeof candidate.daemonInstanceId === "string"
    && GENERATED_UUID_PATTERN.test(candidate.daemonInstanceId)
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

function execFileText(command: string, args: readonly string[]): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    execFile(command, args, {
      encoding: "utf-8",
      env: { ...process.env, COLUMNS: "4096", LANG: "C", LC_ALL: "C" },
      timeout: 1_000,
      windowsHide: true,
    }, (error, stdout) => {
      if (error) {
        reject(new Error(`Failed to execute ${command}`, { cause: error }));
        return;
      }
      resolve(stdout);
    });
  });
}

async function readLinuxProcessStartIdentity(pid: number): Promise<string> {
  const [statSource, bootIdSource] = await Promise.all([
    fs.readFile(`/proc/${String(pid)}/stat`, "utf-8"),
    fs.readFile("/proc/sys/kernel/random/boot_id", "utf-8"),
  ]);
  const commandEnd = statSource.lastIndexOf(")");
  if (commandEnd < 0) {
    throw new Error(`Malformed Linux process stat for pid ${String(pid)}`);
  }
  const fieldsAfterCommand = statSource.slice(commandEnd + 1).trim().split(/\s+/u);
  const startTicks = fieldsAfterCommand[19];
  const bootId = bootIdSource.trim();
  if (startTicks === undefined || !/^\d+$/u.test(startTicks) || bootId.length === 0) {
    throw new Error(`Incomplete Linux process identity for pid ${String(pid)}`);
  }
  return `linux:${bootId}:${startTicks}`;
}

function ensureGenericUnixProcessWitness(pid: number): void {
  if (
    pid !== process.pid
    || GENERIC_UNIX_PROCESS_WITNESS_PATTERN.test(process.title)
  ) {
    return;
  }
  process.title = `${GENERIC_UNIX_PROCESS_WITNESS_PREFIX}${crypto.randomBytes(16).toString("hex")}`;
  if (!GENERIC_UNIX_PROCESS_WITNESS_PATTERN.test(process.title)) {
    throw new Error("Unable to install generic-Unix process identity witness");
  }
}

async function readGenericUnixProcessStartIdentity(pid: number): Promise<string | null> {
  ensureGenericUnixProcessWitness(pid);
  const snapshot = (await execFileText("ps", [
    "-o",
    "lstart=",
    "-o",
    "command=",
    "-p",
    String(pid),
  ]));
  return deriveGenericUnixProcessStartIdentity(process.platform, snapshot);
}

export function deriveGenericUnixProcessStartIdentity(
  platform: string,
  snapshot: string,
): string | null {
  const normalizedSnapshot = snapshot.trim().replace(/\s+/gu, " ");
  if (normalizedSnapshot.length === 0) return null;
  const digest = crypto.createHash("sha256")
    .update(normalizedSnapshot, "utf-8")
    .digest("hex");
  return `${platform}:sha256:${digest}`;
}

export async function readProcessStartIdentity(pid: number): Promise<string | null> {
  if (!processIsAlive(pid)) return null;
  try {
    if (process.platform === "linux") {
      return await readLinuxProcessStartIdentity(pid);
    }
    if (process.platform === "win32") {
      const ticks = (await execFileText("powershell.exe", [
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        `(Get-Process -Id ${String(pid)} -ErrorAction Stop).StartTime.ToUniversalTime().Ticks`,
      ])).trim();
      if (!/^\d+$/u.test(ticks)) {
        throw new Error(`Incomplete Windows process identity for pid ${String(pid)}`);
      }
      return `win32:${ticks}`;
    }
    return await readGenericUnixProcessStartIdentity(pid);
  } catch (error) {
    if (!processIsAlive(pid)) return null;
    throw new Error(`Unable to read process start identity for pid ${String(pid)}`, { cause: error });
  }
}

const nodeDaemonRootOwnerLiveness: DaemonRootOwnerLiveness = {
  socketHasActiveListener,
  readProcessStartIdentity,
};

export async function daemonRootOwnerIsLive(
  owner: DaemonRootOwnerRecord,
  liveness: DaemonRootOwnerLiveness = nodeDaemonRootOwnerLiveness,
): Promise<boolean> {
  if (await liveness.socketHasActiveListener(owner.socketPath)) return true;
  return await liveness.readProcessStartIdentity(owner.pid) === owner.processStartIdentity;
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

function delay(milliseconds: number): Promise<void> {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function readRootOwnerClaim(claimPath: string): Promise<DaemonRootOwnerClaimRecord | null> {
  const claimStat = await fs.lstat(claimPath).catch((error: unknown) => {
    if (errorCode(error) === "ENOENT") return null;
    throw error;
  });
  if (claimStat === null) return null;
  if (!claimStat.isDirectory() || claimStat.isSymbolicLink()) {
    throw new Error(`Refusing unsafe daemon root owner claim path: ${claimPath}`);
  }

  const recordPath = path.join(claimPath, ROOT_OWNER_CLAIM_RECORD_FILE);
  const recordStat = await fs.lstat(recordPath).catch((error: unknown) => {
    if (errorCode(error) === "ENOENT") {
      throw new Error(`Refusing incomplete daemon root owner claim: ${claimPath}`);
    }
    throw error;
  });
  if (!recordStat.isFile() || recordStat.isSymbolicLink()) {
    throw new Error(`Refusing unsafe daemon root owner claim record: ${recordPath}`);
  }
  const parsed = JSON.parse(await fs.readFile(recordPath, "utf-8")) as unknown;
  if (!isDaemonRootOwnerClaimRecord(parsed)) {
    throw new Error(`Refusing malformed daemon root owner claim: ${recordPath}`);
  }
  return parsed;
}

function rootOwnerClaimRecordsEqual(
  left: DaemonRootOwnerClaimRecord,
  right: DaemonRootOwnerClaimRecord,
): boolean {
  return left.claimId === right.claimId
    && left.pid === right.pid
    && left.processStartIdentity === right.processStartIdentity;
}

async function publishDaemonRootOwnerClaim(
  claimPath: string,
  record: DaemonRootOwnerClaimRecord,
): Promise<boolean> {
  const candidatePath = `${claimPath}.candidate-${record.claimId}`;
  let candidateCreated = false;
  try {
    await fs.mkdir(candidatePath, { mode: PRIVATE_DIRECTORY_MODE });
    candidateCreated = true;
    const recordPath = path.join(candidatePath, ROOT_OWNER_CLAIM_RECORD_FILE);
    const candidate = await fs.open(recordPath, "wx", PRIVATE_FILE_MODE);
    try {
      await candidate.writeFile(`${JSON.stringify(record)}\n`, { encoding: "utf-8" });
      await candidate.sync();
    } finally {
      await candidate.close();
    }

    try {
      await fs.rename(candidatePath, claimPath);
    } catch (error: unknown) {
      const incumbent = await fs.lstat(claimPath).catch((statError: unknown) => {
        if (errorCode(statError) === "ENOENT") return null;
        throw statError;
      });
      if (incumbent !== null) return false;
      throw error;
    }
    candidateCreated = false;
    return true;
  } finally {
    if (candidateCreated) {
      await fs.rm(candidatePath, { recursive: true, force: true });
    }
  }
}

async function releaseDaemonRootOwnerClaim(
  claimPath: string,
  releasedPath: string,
  expected: DaemonRootOwnerClaimRecord,
): Promise<void> {
  const current = await readRootOwnerClaim(claimPath);
  if (current !== null) {
    if (!rootOwnerClaimRecordsEqual(current, expected)) {
      throw new Error(`Refusing to release daemon root owner claim held by ${current.claimId}`);
    }
    await fs.rename(claimPath, releasedPath);
  } else {
    const released = await readRootOwnerClaim(releasedPath);
    if (released === null) {
      throw new Error(`Daemon root owner claim disappeared before release: ${claimPath}`);
    }
    if (!rootOwnerClaimRecordsEqual(released, expected)) {
      throw new Error(`Refusing to clean released daemon root owner claim held by ${released.claimId}`);
    }
  }
  await fs.rm(releasedPath, { recursive: true, force: true });
}

async function acquireDaemonRootOwnerClaim(
  ownerPath: string,
  processStartIdentity: string,
  liveness: DaemonRootOwnerLiveness,
): Promise<DaemonRootOwnerClaim> {
  const claimPath = `${ownerPath}${ROOT_OWNER_CLAIM_SUFFIX}`;
  const record: DaemonRootOwnerClaimRecord = {
    schemaVersion: 1,
    claimId: crypto.randomUUID(),
    pid: process.pid,
    processStartIdentity,
  };
  const deadline = performance.now() + ROOT_OWNER_CLAIM_TIMEOUT_MS;
  let firstAttempt = true;

  for (;;) {
    if (!firstAttempt) {
      if (performance.now() >= deadline) {
        throw new DaemonRootOwnerClaimTimeoutError(ownerPath);
      }
      await delay(ROOT_OWNER_CLAIM_RETRY_MS);
    }
    firstAttempt = false;
    if (performance.now() >= deadline) {
      throw new DaemonRootOwnerClaimTimeoutError(ownerPath);
    }
    if (await publishDaemonRootOwnerClaim(claimPath, record)) {
      let released = false;
      let releasedPath: string | null = null;
      return {
        async release(): Promise<void> {
          if (released) return;
          releasedPath ??= `${claimPath}.released-${record.claimId}-${crypto.randomUUID()}`;
          await releaseDaemonRootOwnerClaim(claimPath, releasedPath, record);
          released = true;
        },
      };
    }

    const current = await readRootOwnerClaim(claimPath);
    if (current === null) continue;
    const currentProcessIdentity = await liveness.readProcessStartIdentity(current.pid);
    if (currentProcessIdentity === current.processStartIdentity) {
      continue;
    }

    const stalePath = `${claimPath}.stale-${current.claimId}`;
    try {
      await fs.rename(claimPath, stalePath);
    } catch (error: unknown) {
      if (errorCode(error) === "ENOENT") continue;
      const tombstone = await fs.lstat(stalePath).catch((statError: unknown) => {
        if (errorCode(statError) === "ENOENT") return null;
        throw statError;
      });
      if (tombstone !== null) continue;
      throw error;
    }
  }
}

async function withDaemonRootOwnerClaim<T>(
  ownerPath: string,
  processStartIdentity: string,
  liveness: DaemonRootOwnerLiveness,
  operation: () => Promise<T>,
  rollbackAfterReleaseFailure?: (result: T) => Promise<void>,
): Promise<T> {
  const claim = await acquireDaemonRootOwnerClaim(ownerPath, processStartIdentity, liveness);
  let operationResult: T | undefined;
  let operationError: Error | undefined;
  try {
    operationResult = await operation();
  } catch (error) {
    operationError = asError(error);
  }

  let releaseError: Error | undefined;
  try {
    await claim.release();
  } catch (error) {
    releaseError = asError(error);
  }

  if (
    operationError === undefined
    && releaseError !== undefined
    && rollbackAfterReleaseFailure !== undefined
  ) {
    const recoveryErrors: Error[] = [];
    try {
      await rollbackAfterReleaseFailure(operationResult as T);
    } catch (error) {
      recoveryErrors.push(asError(error));
    }
    try {
      await claim.release();
    } catch (error) {
      recoveryErrors.push(asError(error));
    }
    if (recoveryErrors.length > 0) {
      throw new AggregateError(
        [releaseError, ...recoveryErrors],
        "Daemon root owner claim release failed and operation rollback was incomplete",
        { cause: releaseError },
      );
    }
  }

  if (operationError !== undefined && releaseError !== undefined) {
    throw new AggregateError(
      [operationError, releaseError],
      "Daemon root owner operation and claim release both failed",
      { cause: operationError },
    );
  }
  if (operationError !== undefined) throw operationError;
  if (releaseError !== undefined) throw releaseError;
  return operationResult as T;
}

function rootOwnerRecordsEqual(
  left: DaemonRootOwnerRecord,
  right: DaemonRootOwnerRecord,
): boolean {
  return left.instanceId === right.instanceId
    && left.pid === right.pid
    && left.processStartIdentity === right.processStartIdentity
    && left.socketPath === right.socketPath;
}

async function restoreQuarantinedRootOwner(
  ownerPath: string,
  quarantinedPath: string,
): Promise<void> {
  await fs.link(quarantinedPath, ownerPath);
  await fs.unlink(quarantinedPath);
}

async function quarantineDaemonRootOwnerWhileClaimed(
  ownerPath: string,
  expected: DaemonRootOwnerRecord,
  disposition: "released" | "stale",
): Promise<string | null> {
  const quarantinedPath = `${ownerPath}.${disposition}-${crypto.randomUUID()}`;
  try {
    await fs.rename(ownerPath, quarantinedPath);
  } catch (error: unknown) {
    if (errorCode(error) === "ENOENT") return null;
    throw error;
  }

  let displaced: DaemonRootOwnerRecord;
  try {
    const inspected = await readRootOwner(quarantinedPath);
    if (inspected === null) {
      throw new Error(`Quarantined daemon root owner disappeared: ${quarantinedPath}`);
    }
    displaced = inspected;
  } catch (inspectionError) {
    try {
      await restoreQuarantinedRootOwner(ownerPath, quarantinedPath);
    } catch (restoreError) {
      throw new AggregateError(
        [inspectionError, restoreError],
        "Failed to inspect or restore a quarantined daemon root owner",
        { cause: restoreError },
      );
    }
    throw inspectionError;
  }

  if (!rootOwnerRecordsEqual(displaced, expected)) {
    const ownershipError = new DaemonRootOwnershipError(displaced.instanceId);
    try {
      await restoreQuarantinedRootOwner(ownerPath, quarantinedPath);
    } catch (restoreError) {
      throw new AggregateError(
        [ownershipError, restoreError],
        "A newer daemon root owner was displaced and could not be restored",
        { cause: restoreError },
      );
    }
    throw ownershipError;
  }

  return quarantinedPath;
}

export async function quarantineDaemonRootOwner(
  ownerPath: string,
  expected: DaemonRootOwnerRecord,
  disposition: "released" | "stale",
): Promise<string | null> {
  const processStartIdentity = await nodeDaemonRootOwnerLiveness.readProcessStartIdentity(process.pid);
  if (processStartIdentity === null) {
    throw new Error(`Unable to establish daemon process identity for pid ${String(process.pid)}`);
  }
  return withDaemonRootOwnerClaim(
    ownerPath,
    processStartIdentity,
    nodeDaemonRootOwnerLiveness,
    () => quarantineDaemonRootOwnerWhileClaimed(ownerPath, expected, disposition),
  );
}

async function publishDaemonRootOwnerWhileClaimed(
  ownerPath: string,
  record: DaemonRootOwnerRecord,
): Promise<boolean> {
  const candidatePath = `${ownerPath}.candidate-${record.instanceId}-${crypto.randomUUID()}`;
  let published = false;
  try {
    const candidate = await fs.open(candidatePath, "wx", PRIVATE_FILE_MODE);
    try {
      await candidate.writeFile(`${JSON.stringify(record)}\n`, { encoding: "utf-8" });
      await candidate.sync();
    } finally {
      await candidate.close();
    }

    try {
      await fs.link(candidatePath, ownerPath);
    } catch (error: unknown) {
      if (errorCode(error) !== "EEXIST") throw error;
      await fs.unlink(candidatePath);
      return false;
    }
    published = true;
    await fs.unlink(candidatePath);
    return true;
  } catch (error) {
    const rollbackErrors: unknown[] = [];
    if (published) {
      try {
        const releasedPath = await quarantineDaemonRootOwnerWhileClaimed(ownerPath, record, "released");
        if (releasedPath === null) {
          throw new Error("Published daemon root owner disappeared during rollback", { cause: error });
        }
        await fs.unlink(releasedPath);
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError);
      }
    }
    try {
      await fs.unlink(candidatePath);
    } catch (cleanupError: unknown) {
      if (errorCode(cleanupError) !== "ENOENT") rollbackErrors.push(cleanupError);
    }
    if (rollbackErrors.length > 0) {
      throw new AggregateError(
        [error, ...rollbackErrors],
        "Daemon root owner publication and rollback both failed",
        { cause: error },
      );
    }
    throw error;
  }
}

export async function publishDaemonRootOwner(
  ownerPath: string,
  record: DaemonRootOwnerRecord,
): Promise<boolean> {
  const processStartIdentity = await nodeDaemonRootOwnerLiveness.readProcessStartIdentity(process.pid);
  if (processStartIdentity === null) {
    throw new Error(`Unable to establish daemon process identity for pid ${String(process.pid)}`);
  }
  return withDaemonRootOwnerClaim(
    ownerPath,
    processStartIdentity,
    nodeDaemonRootOwnerLiveness,
    () => publishDaemonRootOwnerWhileClaimed(ownerPath, record),
  );
}

export async function acquireDaemonRootOwnership(input: {
  readonly graftDir: string;
  readonly socketPath: string;
}, liveness: DaemonRootOwnerLiveness = nodeDaemonRootOwnerLiveness): Promise<DaemonRootOwnership> {
  const graftDir = path.resolve(input.graftDir);
  const socketPath = resolveSocketPath(input.socketPath, graftDir);
  const legacySocketPath = resolveSocketPath(undefined, graftDir);
  if (socketPath !== legacySocketPath && await liveness.socketHasActiveListener(legacySocketPath)) {
    throw new DaemonLegacyEndpointActiveError(legacySocketPath);
  }

  const ownerPath = path.join(graftDir, ROOT_OWNER_FILE);
  const instanceId = crypto.randomUUID();
  const processStartIdentity = await liveness.readProcessStartIdentity(process.pid);
  if (processStartIdentity === null) {
    throw new Error(`Unable to establish daemon process identity for pid ${String(process.pid)}`);
  }
  const record: DaemonRootOwnerRecord = {
    schemaVersion: 2,
    instanceId,
    pid: process.pid,
    processStartIdentity,
    socketPath,
  };

  await withDaemonRootOwnerClaim(
    ownerPath,
    processStartIdentity,
    liveness,
    async () => {
      for (;;) {
        if (await publishDaemonRootOwnerWhileClaimed(ownerPath, record)) break;

        const current = await readRootOwner(ownerPath);
        if (current === null) continue;
        if (await daemonRootOwnerIsLive(current, liveness)) {
          throw new DaemonRootOwnershipError(current.instanceId);
        }

        const stalePath = await quarantineDaemonRootOwnerWhileClaimed(ownerPath, current, "stale");
        if (stalePath === null) continue;
        await fs.unlink(stalePath);
      }
    },
    async () => {
      const releasedPath = await quarantineDaemonRootOwnerWhileClaimed(
        ownerPath,
        record,
        "released",
      );
      if (releasedPath !== null) {
        await fs.unlink(releasedPath);
      }
    },
  );

  let released = false;
  return {
    instanceId,
    async release(): Promise<void> {
      if (released) return;
      await withDaemonRootOwnerClaim(ownerPath, processStartIdentity, liveness, async () => {
        const current = await readRootOwner(ownerPath);
        if (current === null) {
          released = true;
          return;
        }
        if (current.instanceId !== instanceId) {
          throw new Error(`Refusing to release daemon root owned by ${current.instanceId}`);
        }
        const releasedPath = await quarantineDaemonRootOwnerWhileClaimed(ownerPath, current, "released");
        if (releasedPath === null) {
          released = true;
          return;
        }
        await fs.unlink(releasedPath);
      });
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

export async function captureSessionDirectoryIdentity(
  sessionDir: string,
): Promise<DaemonSessionDirectoryIdentity> {
  const stat = await fs.lstat(sessionDir).catch((error: unknown) => {
    if (errorCode(error) === "ENOENT") return null;
    throw error;
  });
  if (stat === null || !stat.isDirectory() || stat.isSymbolicLink()) {
    throw new UnsafeDaemonSessionDirectoryError(sessionDir);
  }
  return { device: stat.dev, inode: stat.ino };
}

async function restoreQuarantinedSessionDirectory(
  quarantinePath: string,
  sessionDir: string,
  error: unknown,
): Promise<never> {
  try {
    await fs.rename(quarantinePath, sessionDir);
  } catch (restoreError) {
    throw new AggregateError(
      [error, restoreError],
      `Failed to restore refused daemon session directory: ${sessionDir}`,
      { cause: restoreError },
    );
  }
  throw error;
}

export async function removeSessionDirectory(
  sessionDir: string,
  expectedIdentity: DaemonSessionDirectoryIdentity,
): Promise<boolean> {
  const resolvedSessionDir = path.resolve(sessionDir);
  const sessionId = path.basename(resolvedSessionDir);
  const sessionsRoot = path.dirname(resolvedSessionDir);
  if (
    !GENERATED_UUID_PATTERN.test(sessionId)
    || path.join(sessionsRoot, sessionId) !== resolvedSessionDir
  ) {
    throw new UnsafeDaemonSessionDirectoryError(sessionDir);
  }
  const root = await pinDaemonSessionsRoot(sessionsRoot);
  let sessionHandle: fs.FileHandle | null = null;
  try {
    await assertPinnedDaemonSessionsRoot(root);
    const stat = await fs.lstat(resolvedSessionDir).catch((error: unknown) => {
      if (errorCode(error) === "ENOENT") return null;
      throw error;
    });
    await assertPinnedDaemonSessionsRoot(root);
    if (stat === null) return false;
    if (!daemonSessionDirectoryIdentityMatches(expectedIdentity, stat)) {
      throw new UnsafeDaemonSessionDirectoryError(sessionDir);
    }
    if (process.platform !== "win32") {
      try {
        sessionHandle = await fs.open(resolvedSessionDir, "r");
      } catch (error: unknown) {
        if (["ELOOP", "ENOENT", "ENOTDIR"].includes(errorCode(error) ?? "")) {
          throw new UnsafeDaemonSessionDirectoryError(sessionDir);
        }
        throw error;
      }
      const anchored = await sessionHandle.stat();
      if (!daemonSessionDirectoryIdentityMatches(expectedIdentity, anchored)) {
        throw new UnsafeDaemonSessionDirectoryError(sessionDir);
      }
    }
    await assertPinnedDaemonSessionsRoot(root);
    const current = await fs.lstat(resolvedSessionDir).catch((error: unknown) => {
      if (errorCode(error) === "ENOENT") return null;
      throw error;
    });
    if (
      current === null
      || !daemonSessionDirectoryIdentityMatches(expectedIdentity, current)
    ) {
      throw new UnsafeDaemonSessionDirectoryError(sessionDir);
    }

    const quarantinePath = path.join(
      sessionsRoot,
      `.graft-removing-${sessionId}-${crypto.randomUUID()}`,
    );
    try {
      await fs.rename(resolvedSessionDir, quarantinePath);
    } catch (error: unknown) {
      if (errorCode(error) === "ENOENT") return false;
      throw error;
    }
    await assertPinnedDaemonSessionsRoot(root);
    const quarantined = await fs.lstat(quarantinePath).catch((error: unknown) => {
      if (errorCode(error) === "ENOENT") return null;
      throw error;
    });
    const anchored = sessionHandle === null ? stat : await sessionHandle.stat();
    if (
      quarantined === null
      || !daemonSessionDirectoryIdentityMatches(expectedIdentity, anchored)
      || !daemonSessionDirectoryIdentityMatches(expectedIdentity, quarantined)
    ) {
      await restoreQuarantinedSessionDirectory(
        quarantinePath,
        resolvedSessionDir,
        new UnsafeDaemonSessionDirectoryError(sessionDir),
      );
    }
    try {
      await fs.rm(quarantinePath, { recursive: true, force: false });
    } catch (error) {
      await restoreQuarantinedSessionDirectory(quarantinePath, resolvedSessionDir, error);
    }
    return true;
  } finally {
    await sessionHandle?.close();
    await root.handle?.close();
  }
}

type SessionDirectoryInspection =
  | {
    readonly status: "eligible";
    readonly identity: { readonly device: number; readonly inode: number };
  }
  | { readonly status: "missing" }
  | { readonly status: "preserved"; readonly reason: SessionOrphanPreservationReason };

async function inspectSessionDirectory(
  sessionsRoot: string,
  sessionId: string,
  legacyUnmarkedPolicy: LegacyUnmarkedSessionPolicy,
): Promise<SessionDirectoryInspection> {
  const sessionDir = path.join(sessionsRoot, sessionId);
  const stat = await fs.lstat(sessionDir).catch((error: unknown) => {
    if (errorCode(error) === "ENOENT") return null;
    throw error;
  });
  if (stat === null) return { status: "missing" };
  if (stat.isSymbolicLink()) return { status: "preserved", reason: "SYMBOLIC_LINK" };
  if (!stat.isDirectory()) return { status: "preserved", reason: "NOT_DIRECTORY" };
  const identity = { device: stat.dev, inode: stat.ino };

  const markerPath = path.join(sessionDir, SESSION_OWNER_FILE);
  const markerStat = await fs.lstat(markerPath).catch((error: unknown) => {
    if (errorCode(error) === "ENOENT") return null;
    throw error;
  });
  if (markerStat === null) {
    return legacyUnmarkedPolicy === "remove"
      ? { status: "eligible", identity }
      : { status: "preserved", reason: "LEGACY_SESSION_UNMARKED" };
  }
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
      ? { status: "eligible", identity }
      : { status: "preserved", reason: "MALFORMED_OWNERSHIP_MARKER" };
  } catch {
    return { status: "preserved", reason: "MALFORMED_OWNERSHIP_MARKER" };
  }
}

export async function removeSessionOrphanDirectories(
  sessionsRoot: string,
  liveSessionIds: ReadonlySet<string>,
  legacyUnmarkedPolicy: LegacyUnmarkedSessionPolicy,
): Promise<SessionOrphanRemovalResult> {
  const root = await pinDaemonSessionsRoot(sessionsRoot);
  try {
    const entries = await fs.readdir(sessionsRoot, { withFileTypes: true });
    await assertPinnedDaemonSessionsRoot(root);
    let removed = 0;
    const failures: SessionOrphanRemovalFailure[] = [];
    const preservedEntries: SessionOrphanPreservedEntry[] = [];
    for (const entry of entries) {
      const sessionId = entry.name;
      const sessionPath = path.join(sessionsRoot, sessionId);
      if (!GENERATED_UUID_PATTERN.test(sessionId)) {
        preservedEntries.push({
          entryName: sessionId,
          path: sessionPath,
          reason: "UNKNOWN_ENTRY_NAME",
        });
        continue;
      }
      if (liveSessionIds.has(sessionId)) continue;
      await assertPinnedDaemonSessionsRoot(root);
      const inspection = await inspectSessionDirectory(
        sessionsRoot,
        sessionId,
        legacyUnmarkedPolicy,
      );
      await assertPinnedDaemonSessionsRoot(root);
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
        const quarantinePath = path.join(
          sessionsRoot,
          `.graft-removing-${sessionId}-${crypto.randomUUID()}`,
        );
        try {
          await fs.rename(sessionPath, quarantinePath);
        } catch (error: unknown) {
          if (errorCode(error) === "ENOENT") continue;
          throw error;
        }
        await assertPinnedDaemonSessionsRoot(root);
        const quarantined = await fs.lstat(quarantinePath).catch((error: unknown) => {
          if (errorCode(error) === "ENOENT") return null;
          throw error;
        });
        if (
          quarantined === null
          || !daemonSessionDirectoryIdentityMatches(inspection.identity, quarantined)
        ) {
          await restoreQuarantinedSessionDirectory(
            quarantinePath,
            sessionPath,
            new UnsafeDaemonSessionDirectoryError(sessionPath),
          );
        }
        try {
          await fs.rm(quarantinePath, { recursive: true, force: false });
        } catch (error) {
          await restoreQuarantinedSessionDirectory(quarantinePath, sessionPath, error);
        }
        removed++;
      } catch (error) {
        failures.push({ sessionId, path: sessionPath, error });
      }
    }
    return { removed, failures, preservedEntries };
  } finally {
    await root.handle?.close();
  }
}

export const nodeDaemonSessionStorage: DaemonSessionStorage = Object.freeze({
  captureSessionDirectoryIdentity,
  writeSessionOwnershipMarker,
  removeSessionDirectory,
  removeSessionOrphanDirectories,
});
