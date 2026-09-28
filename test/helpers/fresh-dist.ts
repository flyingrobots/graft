import { spawn } from "node:child_process";
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

// Keeps dist/ current for the tests that execute it. Design: docs/design/CLEAN_tests-fresh-dist.md.

export interface DistBuildResult {
  readonly status: number;
  readonly output: string;
}

export interface FreshDistOptions {
  /** Package root holding src/, dist/ and the build config files. */
  readonly root: string;
  /** Compiles src/ into dist/. `tscBuild` in real runs; tests inject a stand-in. */
  readonly build: (root: string) => Promise<DistBuildResult>;
  readonly warn?: (message: string) => void;
  /** How often a process waiting on another's build re-checks the lock. */
  readonly lockPollMs?: number;
  /** How long to wait for another live process's build before giving up. */
  readonly lockTimeoutMs?: number;
  /** Test seam: runs after a dead lock owner is seen and before this process acts on it. */
  readonly beforeDeadLockTakeover?: () => void;
}

export type FreshDistOutcome = "fresh" | "built";

/** Build-config files whose change can change the emitted output. */
export const DIST_CONFIG_INPUTS = ["tsconfig.json", "tsconfig.build.json", "package.json", "pnpm-lock.yaml"] as const;

/** tsc's ExitStatus.DiagnosticsPresent_OutputsGenerated: errors were reported, every file was emitted. */
const TSC_DIAGNOSTICS_WITH_OUTPUT = 2;
const DEFAULT_LOCK_POLL_MS = 100;
const DEFAULT_LOCK_TIMEOUT_MS = 5 * 60_000;

interface Extreme {
  readonly path: string;
  readonly mtimeMs: number;
}

type Staleness = { readonly fresh: true } | { readonly fresh: false; readonly reason: string };

function visit(entry: string, includeDirectories: boolean, onEntry: (entry: string, mtimeMs: number) => void): void {
  let stat: fs.Stats;
  try {
    stat = fs.lstatSync(entry);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }
  if (stat.isDirectory()) {
    if (includeDirectories) onEntry(entry, stat.mtimeMs);
    for (const name of fs.readdirSync(entry)) visit(path.join(entry, name), includeDirectories, onEntry);
    return;
  }
  onEntry(entry, stat.mtimeMs);
}

function newestInput(root: string): Extreme | undefined {
  let newest: Extreme | undefined;
  const consider = (entry: string, mtimeMs: number): void => {
    if (newest === undefined || mtimeMs > newest.mtimeMs) newest = { path: entry, mtimeMs };
  };
  visit(path.join(root, "src"), true, consider);
  for (const file of DIST_CONFIG_INPUTS) visit(path.join(root, file), false, consider);
  return newest;
}

/** The dist/ file each src/ module compiles to; declaration-only sources emit nothing. */
function firstMissingOutput(root: string): { readonly source: string; readonly output: string } | undefined {
  let missing: { readonly source: string; readonly output: string } | undefined;
  const src = path.join(root, "src");
  visit(src, false, (entry) => {
    if (missing !== undefined || !entry.endsWith(".ts") || entry.endsWith(".d.ts")) return;
    const output = path.join(root, "dist", path.relative(src, entry).replace(/\.ts$/u, ".js"));
    if (!fs.existsSync(output)) missing = { source: entry, output };
  });
  return missing;
}

function buildCacheDir(root: string): string {
  return path.join(root, "node_modules", ".cache", "graft");
}

/**
 * Present from just before dist/ is removed until a build has finished. Kept outside dist/ so it never
 * ships. If it survives, the process that wrote it ended mid-build and dist/ may be partial.
 */
function pendingBuildMarker(root: string): string {
  return path.join(buildCacheDir(root), "dist-build.pending");
}

function oldestOutput(root: string): Extreme | undefined {
  let oldest: Extreme | undefined;
  visit(path.join(root, "dist"), false, (entry, mtimeMs) => {
    if (oldest === undefined || mtimeMs < oldest.mtimeMs) oldest = { path: entry, mtimeMs };
  });
  return oldest;
}

/**
 * src/ and every config input must exist. A missing one would otherwise drop out of the comparison and
 * leave an old dist/ looking fresh although the checkout can no longer produce it.
 */
function assertRequiredInputs(root: string): void {
  for (const input of ["src", ...DIST_CONFIG_INPUTS]) {
    if (!fs.existsSync(path.join(root, input))) {
      throw new Error(`Cannot decide whether dist/ is current: required build input ${input} is missing.`);
    }
  }
}

/**
 * dist/ is fresh when no build was left unfinished, every src/ module has its emitted .js, and the
 * oldest dist/ file is strictly newer than the newest input.
 */
export function distStaleness(root: string): Staleness {
  assertRequiredInputs(root);
  if (fs.existsSync(pendingBuildMarker(root))) {
    return { fresh: false, reason: "an earlier dist/ build did not finish" };
  }
  const oldest = oldestOutput(root);
  if (oldest === undefined) return { fresh: false, reason: "dist/ is missing or empty" };
  const missing = firstMissingOutput(root);
  if (missing !== undefined) {
    return {
      fresh: false,
      reason: `${path.relative(root, missing.output)} is missing for ${path.relative(root, missing.source)}`,
    };
  }
  const newest = newestInput(root);
  if (newest === undefined || newest.mtimeMs < oldest.mtimeMs) return { fresh: true };
  return {
    fresh: false,
    reason: `${path.relative(root, newest.path)} is not older than ${path.relative(root, oldest.path)}`,
  };
}

function processIsAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error: unknown) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

/** One lock instance: the owning pid and a token no other instance ever carries. */
interface LockRecord {
  readonly pid: number;
  readonly token: string;
}

function readText(file: string): string | undefined {
  try {
    return fs.readFileSync(file, "utf8");
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

function parsePid(text: string | undefined): number | undefined {
  if (text === undefined) return undefined;
  const pid = Number.parseInt(text, 10);
  return Number.isSafeInteger(pid) && pid > 0 ? pid : undefined;
}

function readLock(lock: string): LockRecord | undefined {
  const text = readText(lock);
  if (text === undefined) return undefined;
  const [pidText, token] = text.split(" ");
  const pid = parsePid(pidText);
  return pid === undefined || token === undefined || token === "" ? undefined : { pid, token };
}

/**
 * Creates `target` holding `content` only if nothing is there, by hard-linking a private staging file
 * into place: the file never exists without its content, and exactly one of several racing callers wins.
 */
function createExclusive(target: string, content: string): boolean {
  const staging = `${target}.${String(process.pid)}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(staging, content);
  try {
    fs.linkSync(staging, target);
    return true;
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") return false;
    throw error;
  } finally {
    fs.rmSync(staging, { force: true });
  }
}

/** Creates a new lock instance owned by `pid`; undefined when a lock is present. */
function tryCreateLock(lock: string, pid: number = process.pid): string | undefined {
  const token = crypto.randomUUID();
  return createExclusive(lock, `${String(pid)} ${token}`) ? token : undefined;
}

/**
 * Removes the lock only while it is still the instance `token`, for its owner releasing it or for a
 * waiter taking over a dead owner's. Everyone retiring that instance must first create
 * `<lock>.retire.<token>.<n>` exclusively, so at most one live process is ever between reading the
 * lock and removing it; a claim whose holder died is superseded by claim n+1. A waiter acting on a
 * stale observation therefore either loses the claim or finds the lock is no longer that instance,
 * and never removes a lock created after the one it saw. Returns false while another live process
 * holds the claim.
 */
function retireLock(lock: string, token: string): boolean {
  for (let n = 1; ; n += 1) {
    const claim = `${lock}.retire.${token}.${String(n)}`;
    if (createExclusive(claim, String(process.pid))) {
      try {
        if (readLock(lock)?.token === token) fs.rmSync(lock, { force: true });
        return true;
      } finally {
        for (let k = 1; k <= n; k += 1) fs.rmSync(`${lock}.retire.${token}.${String(k)}`, { force: true });
      }
    }
    const holder = parsePid(readText(claim));
    // A claim is removed only after its instance is gone, so a vanished claim means it is retired.
    if (holder === undefined) return true;
    if (holder !== process.pid && processIsAlive(holder)) return false;
  }
}

/** The lock that serializes dist/ builds across processes sharing one checkout. */
export function buildLockPath(root: string): string {
  return path.join(buildCacheDir(root), "dist-build.lock");
}

/** Creates the build lock on behalf of `pid` (tests plant dead or foreign owners). False when held. */
export function writeBuildLock(root: string, pid: number): boolean {
  fs.mkdirSync(buildCacheDir(root), { recursive: true });
  return tryCreateLock(buildLockPath(root), pid) !== undefined;
}

/** The pid recorded in the build lock, or undefined when there is no lock. */
export function buildLockHolder(root: string): number | undefined {
  return readLock(buildLockPath(root))?.pid;
}

/** Waits for the lock and returns the token of the instance this process now owns. */
async function acquireLock(
  lock: string,
  pollMs: number,
  timeoutMs: number,
  beforeTakeover?: () => void,
): Promise<string> {
  fs.mkdirSync(path.dirname(lock), { recursive: true });
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const token = tryCreateLock(lock);
    if (token !== undefined) return token;
    const seen = readLock(lock);
    if (seen !== undefined && seen.pid !== process.pid && !processIsAlive(seen.pid)) {
      beforeTakeover?.();
      // Retire exactly the instance seen dead; a lock created since then is left alone.
      if (retireLock(lock, seen.token)) continue;
    }
    if (Date.now() >= deadline) {
      throw new Error(`Timed out after ${String(timeoutMs)} ms waiting for the dist/ build lock at ${lock}.`);
    }
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
}

/**
 * Ensures dist/ was compiled from the current inputs, rebuilding it from a clean directory when it is
 * missing or stale. Concurrent callers on one checkout are serialized by a lock under
 * node_modules/.cache, and a caller that waited re-checks freshness instead of rebuilding.
 */
export async function ensureFreshDist(options: FreshDistOptions): Promise<FreshDistOutcome> {
  const { root } = options;
  if (distStaleness(root).fresh) return "fresh";

  const lock = buildLockPath(root);
  const token = await acquireLock(
    lock,
    options.lockPollMs ?? DEFAULT_LOCK_POLL_MS,
    options.lockTimeoutMs ?? DEFAULT_LOCK_TIMEOUT_MS,
    options.beforeDeadLockTakeover,
  );
  try {
    if (distStaleness(root).fresh) return "fresh";

    const dist = path.join(root, "dist");
    const pending = pendingBuildMarker(root);
    // Written before dist/ is touched and removed only once the build has finished, so a process that
    // dies in between (or a build that throws) leaves a marker the next run reads as stale.
    fs.writeFileSync(pending, String(process.pid));
    fs.rmSync(dist, { recursive: true, force: true });
    const result = await options.build(root);
    if (result.status === TSC_DIAGNOSTICS_WITH_OUTPUT) {
      (options.warn ?? console.warn)(
        "[graft test setup] tsc reported diagnostics while rebuilding dist/. It still emitted every file, "
        + "so tests run against current source; run `pnpm typecheck` to see the errors.\n"
        + result.output,
      );
    } else if (result.status !== 0) {
      fs.rmSync(dist, { recursive: true, force: true });
      fs.rmSync(pending, { force: true });
      throw new Error(`Building dist/ for the test run failed with exit ${String(result.status)}:\n${result.output}`);
    }
    fs.rmSync(pending, { force: true });

    const after = distStaleness(root);
    if (!after.fresh) {
      throw new Error(`dist/ is still stale after rebuilding it: ${after.reason}.`);
    }
    return "built";
  } finally {
    retireLock(lock, token);
  }
}

/** The repository's own build (`pnpm build`), run without pnpm so it works offline and in Docker. */
export function tscBuild(root: string): Promise<DistBuildResult> {
  const tsc = path.join(root, "node_modules", "typescript", "bin", "tsc");
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [tsc, "-p", "tsconfig.build.json"], {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      output += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      output += chunk;
    });
    child.once("error", reject);
    child.once("close", (code, signal) => {
      resolve({ status: code ?? 1, output: signal === null ? output : `${output}\nterminated by ${signal}` });
    });
  });
}
