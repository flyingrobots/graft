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
  /**
   * Compiles src/ into `outDir`, a private directory beside dist/ that no other build writes.
   * `tscBuild` in real runs; tests inject a stand-in.
   */
  readonly build: (root: string, outDir: string) => Promise<DistBuildResult>;
  readonly warn?: (message: string) => void;
}

export type FreshDistOutcome = "fresh" | "built";

/** Build-config files whose change can change the emitted output. */
const DIST_CONFIG_INPUTS = ["tsconfig.json", "tsconfig.build.json", "package.json", "pnpm-lock.yaml"] as const;

/** tsc's ExitStatus.DiagnosticsPresent_OutputsGenerated: errors were reported, every file was emitted. */
const TSC_DIAGNOSTICS_WITH_OUTPUT = 2;
/** Builds in one call before giving up on inputs that change under every build. */
const MAX_BUILD_ATTEMPTS = 3;

/**
 * A build's private output directory, or a dist/ moved aside to be deleted, named for the process
 * that created it. Both sit beside dist/ at the same depth, so source-map paths are what `pnpm build`
 * writes, and on the same filesystem, so publishing is a rename.
 */
const BUILD_DIRECTORY = /^dist\.(?:staging|retired)\.(\d+)\.[0-9a-f-]{36}$/u;

interface Extreme {
  readonly path: string;
  readonly mtimeMs: number;
}

type Staleness = { readonly fresh: true } | { readonly fresh: false; readonly reason: string };

function isMissing(error: unknown): boolean {
  return (error as NodeJS.ErrnoException).code === "ENOENT";
}

/**
 * Visits `entry` and everything under it. An entry removed while the walk runs (another process
 * moving dist/ aside to publish its own build) is skipped as absent, at the lstat or at the readdir;
 * the caller then sees a missing output and treats dist/ as stale.
 */
function visit(entry: string, includeDirectories: boolean, onEntry: (entry: string, mtimeMs: number) => void): void {
  let stat: fs.Stats;
  try {
    stat = fs.lstatSync(entry);
  } catch (error: unknown) {
    if (isMissing(error)) return;
    throw error;
  }
  if (stat.isDirectory()) {
    let names: string[];
    try {
      names = fs.readdirSync(entry);
    } catch (error: unknown) {
      if (isMissing(error)) return;
      throw error;
    }
    if (includeDirectories) onEntry(entry, stat.mtimeMs);
    for (const name of names) visit(path.join(entry, name), includeDirectories, onEntry);
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

/** The output file each src/ module compiles to; declaration-only sources emit nothing. */
function firstMissingOutput(root: string, out: string): { readonly source: string; readonly output: string } | undefined {
  let missing: { readonly source: string; readonly output: string } | undefined;
  const src = path.join(root, "src");
  visit(src, false, (entry) => {
    if (missing !== undefined || !entry.endsWith(".ts") || entry.endsWith(".d.ts")) return;
    const output = path.join(out, path.relative(src, entry).replace(/\.ts$/u, ".js"));
    if (!fs.existsSync(output)) missing = { source: entry, output };
  });
  return missing;
}

function oldestOutput(out: string): Extreme | undefined {
  let oldest: Extreme | undefined;
  visit(out, false, (entry, mtimeMs) => {
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
 * A build output directory (dist/, or a build's staging directory before it is published) is fresh
 * when every src/ module has its emitted .js and its oldest file is strictly newer than the newest
 * input.
 */
function staleness(root: string, out: string): Staleness {
  assertRequiredInputs(root);
  const oldest = oldestOutput(out);
  if (oldest === undefined) return { fresh: false, reason: `${path.relative(root, out)}/ is missing or empty` };
  const missing = firstMissingOutput(root, out);
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

/**
 * No build can produce outputs newer than an input dated in the future (clock skew between a host and
 * a VM or container, an extracted archive, `touch -d`), so building would only fail the same way on
 * every run until the clock passes that time. Fail first, naming the file.
 */
function assertNotInFuture(root: string, newest: Extreme | undefined): void {
  const now = Date.now();
  // File times carry fractions of a millisecond and Date.now() does not: compare whole milliseconds.
  if (newest === undefined || Math.floor(newest.mtimeMs) <= now) return;
  throw new Error(
    `Cannot rebuild dist/: ${path.relative(root, newest.path)} has a modification time in the future `
    + `(${new Date(newest.mtimeMs).toISOString()}; now ${new Date(now).toISOString()}), so no build could `
    + "be newer than it. Fix the clock or reset the file's time (for example `touch` it), then rerun.",
  );
}

function processIsAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error: unknown) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

function buildDirectoryPath(root: string, kind: "staging" | "retired"): string {
  return path.join(root, `dist.${kind}.${String(process.pid)}.${crypto.randomUUID()}`);
}

/**
 * Deletes build directories beside dist/ whose creating process has exited (killed mid-build or
 * mid-publish). A live process's are left alone, including one whose pid was reused after its creator
 * died; that leftover is only disk space, since nothing reads a build directory except its creator.
 */
function removeAbandonedBuildDirectories(root: string): void {
  for (const name of fs.readdirSync(root)) {
    const pid = Number(BUILD_DIRECTORY.exec(name)?.[1]);
    if (!Number.isSafeInteger(pid) || pid <= 0 || pid === process.pid || processIsAlive(pid)) continue;
    fs.rmSync(path.join(root, name), { recursive: true, force: true });
  }
}

/**
 * Replaces dist/ with `staging` by renaming: the current dist/ is moved aside, then `staging` is
 * renamed to dist/. A reader therefore finds dist/ absent or one build's complete output, never a
 * mixture. Returns false, leaving `staging` in place, when another process published its own build
 * between the two renames: a rename onto a non-empty directory fails, so that build is kept. Any
 * other failure of the second rename puts the previous dist/ back before rethrowing, and, if that also fails,
 * leaves it at its retired name for a later run to remove.
 */
function publish(root: string, staging: string): boolean {
  const dist = path.join(root, "dist");
  const retired = buildDirectoryPath(root, "retired");
  try {
    fs.renameSync(dist, retired);
  } catch (error: unknown) {
    if (!isMissing(error)) throw error;
  }
  try {
    fs.renameSync(staging, dist);
  } catch (error: unknown) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOTEMPTY" || code === "EEXIST") {
      fs.rmSync(retired, { recursive: true, force: true });
      return false;
    }
    try {
      fs.renameSync(retired, dist);
    } catch (restoreError: unknown) {
      if (isMissing(restoreError)) throw error;
      const message = `Publishing the dist/ build failed and the previous dist/ is left at ${retired}.`;
      throw new AggregateError([error, restoreError], message, { cause: restoreError });
    }
    throw error;
  }
  fs.rmSync(retired, { recursive: true, force: true });
  return true;
}

/**
 * Ensures dist/ was compiled from the current inputs. When it is missing or stale, builds into a
 * private staging directory and, once that output is complete and was built from inputs that did not
 * change under the build, publishes it by rename. Nothing but a publish ever writes dist/, so
 * concurrent callers need no lock: each builds privately, and whichever publishes last leaves a
 * complete build that the freshness rule judges on its own mtimes.
 */
export async function ensureFreshDist(options: FreshDistOptions): Promise<FreshDistOutcome> {
  const { root } = options;
  const dist = path.join(root, "dist");
  if (staleness(root, dist).fresh) return "fresh";
  removeAbandonedBuildDirectories(root);

  for (let attempt = 1; ; attempt += 1) {
    // The newest input as the build is about to read it. tsc reads every input before it writes
    // anything, so an input saved during the build can carry an mtime older than every output and
    // pass the time rule later; comparing against this snapshot is what catches it.
    const newest = newestInput(root);
    assertNotInFuture(root, newest);
    const readFrom = newest?.mtimeMs ?? Number.NEGATIVE_INFINITY;
    const staging = buildDirectoryPath(root, "staging");
    try {
      const result = await options.build(root, staging);
      if (result.status === TSC_DIAGNOSTICS_WITH_OUTPUT) {
        (options.warn ?? console.warn)(
          "[graft test setup] tsc reported diagnostics while rebuilding dist/. It still emitted every file, "
          + "so tests run against current source; run `pnpm typecheck` to see the errors.\n"
          + result.output,
        );
      } else if (result.status !== 0) {
        throw new Error(`Building dist/ for the test run failed with exit ${String(result.status)}:\n${result.output}`);
      }
      const changed = newestInput(root);
      if (changed === undefined || changed.mtimeMs <= readFrom) {
        const built = staleness(root, staging);
        if (built.fresh) {
          // Published, or another process published a build between our renames and it is current.
          if (publish(root, staging) || staleness(root, dist).fresh) return "built";
        } else {
          // An input saved after the recheck above also makes the output look stale: build again.
          // With inputs unchanged since the build read them, stale output is a build defect.
          const later = newestInput(root);
          if (later === undefined || later.mtimeMs <= readFrom) {
            throw new Error(`The dist/ build finished but its output is not current: ${built.reason}.`);
          }
        }
      }
      if (attempt >= MAX_BUILD_ATTEMPTS) {
        const latest = newestInput(root);
        const cause = latest !== undefined && latest.mtimeMs > readFrom
          ? `${path.relative(root, latest.path)} changed during attempt ${String(attempt)}`
          : "another process kept replacing dist/";
        throw new Error(
          `dist/ could not be built from unchanging inputs in ${String(attempt)} attempts (${cause}); dist/ is `
          + "left as it was. Rerun once edits have stopped.",
        );
      }
    } finally {
      fs.rmSync(staging, { recursive: true, force: true });
    }
  }
}

/** The part of Vitest's `TestProject` the global setup needs. */
export interface TestRerunSource {
  onTestsRerun(handler: () => Promise<void> | void): void;
}

/**
 * Global-setup entry: ensures dist/ is fresh now and again before every watch-mode rerun. Vitest runs
 * a global setup once per project lifetime, not per rerun, so without the rerun hook a watcher would
 * keep executing the dist/ it built at start-up after src/ changes.
 */
export async function keepDistFresh(project: TestRerunSource, options: FreshDistOptions): Promise<void> {
  await ensureFreshDist(options);
  project.onTestsRerun(async () => {
    await ensureFreshDist(options);
  });
}

/**
 * The repository's own build (`pnpm build`, which is `tsc -p tsconfig.build.json`) with only the output
 * directory changed, run without pnpm so it works offline and in Docker.
 */
export function tscBuild(root: string, outDir: string): Promise<DistBuildResult> {
  const tsc = path.join(root, "node_modules", "typescript", "bin", "tsc");
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [tsc, "-p", "tsconfig.build.json", "--outDir", outDir], {
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
