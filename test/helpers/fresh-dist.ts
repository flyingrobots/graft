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

function oldestOutput(root: string): Extreme | undefined {
  let oldest: Extreme | undefined;
  visit(path.join(root, "dist"), false, (entry, mtimeMs) => {
    if (oldest === undefined || mtimeMs < oldest.mtimeMs) oldest = { path: entry, mtimeMs };
  });
  return oldest;
}

/** dist/ is fresh when it holds a file and its oldest file is strictly newer than the newest input. */
export function distStaleness(root: string): Staleness {
  const oldest = oldestOutput(root);
  if (oldest === undefined) return { fresh: false, reason: "dist/ is missing or empty" };
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

function lockOwner(lock: string): number | undefined {
  try {
    const pid = Number.parseInt(fs.readFileSync(path.join(lock, "pid"), "utf8"), 10);
    return Number.isSafeInteger(pid) && pid > 0 ? pid : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Creates the lock directory with its pid already inside, by renaming a private staging directory
 * into place, so a lock never exists without an owner. Returns false when another lock is present.
 */
function tryCreateLock(lock: string): boolean {
  const staging = `${lock}.${String(process.pid)}.${crypto.randomUUID()}`;
  fs.mkdirSync(staging, { recursive: true });
  fs.writeFileSync(path.join(staging, "pid"), String(process.pid));
  try {
    fs.renameSync(staging, lock);
    return true;
  } catch (error: unknown) {
    fs.rmSync(staging, { recursive: true, force: true });
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "EEXIST" || code === "ENOTEMPTY") return false;
    throw error;
  }
}

/** Moves a dead owner's lock aside atomically, so only one waiter removes it. */
function removeDeadLock(lock: string): void {
  const tombstone = `${lock}.dead.${String(process.pid)}.${crypto.randomUUID()}`;
  try {
    fs.renameSync(lock, tombstone);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }
  fs.rmSync(tombstone, { recursive: true, force: true });
}

async function acquireLock(lock: string, pollMs: number, timeoutMs: number): Promise<void> {
  fs.mkdirSync(path.dirname(lock), { recursive: true });
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if (tryCreateLock(lock)) return;
    const owner = lockOwner(lock);
    if (owner !== undefined && owner !== process.pid && !processIsAlive(owner)) {
      removeDeadLock(lock);
      continue;
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

  const lock = path.join(root, "node_modules", ".cache", "graft", "dist-build.lock");
  await acquireLock(lock, options.lockPollMs ?? DEFAULT_LOCK_POLL_MS, options.lockTimeoutMs ?? DEFAULT_LOCK_TIMEOUT_MS);
  try {
    if (distStaleness(root).fresh) return "fresh";

    const dist = path.join(root, "dist");
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
      throw new Error(`Building dist/ for the test run failed with exit ${String(result.status)}:\n${result.output}`);
    }

    const after = distStaleness(root);
    if (!after.fresh) {
      throw new Error(`dist/ is still stale after rebuilding it: ${after.reason}.`);
    }
    return "built";
  } finally {
    fs.rmSync(lock, { recursive: true, force: true });
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
