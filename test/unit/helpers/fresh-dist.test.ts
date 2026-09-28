import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { describe, expect, it, vi, type TestContext } from "vitest";
import {
  buildLockHolder,
  buildLockPath,
  ensureFreshDist,
  keepDistFresh,
  writeBuildLock,
  type DistBuildResult,
} from "../../helpers/fresh-dist.js";

// Oracle: docs/design/CLEAN_tests-fresh-dist.md. dist/ is fresh only when it holds at least one
// file and its oldest file is newer than the newest build input (every file and directory under
// src/, plus tsconfig.json, tsconfig.build.json, package.json, pnpm-lock.yaml). A stale dist/ is
// removed and rebuilt; tsc's exit 2 (diagnostics, output emitted) warns; any other failure throws
// and leaves no dist/. src/ and each config file are required; a missing one fails setup unbuilt.
// A dist/ lacking any src module's .js, or left by a build that did not finish, is stale.
// Size: medium (TESTING_STANDARDS.md Rule 9). Owner: @flyingrobots. Resources: files only under a
// private mkdtemp root per case, removed by that case (onTestFinished); at most one child process at a time (the
// dead-lock-owner cases spawn `node -e ""` to obtain a pid that has exited); no network. Time:
// mtimes are set with utimes; no case waits on a test timer. The helper's own lock poll is real
// time, set to LOCK_POLL_MS. Ceiling: CASE_TIMEOUT_MS per case, enforced by the describe timeout.
// Measured on a macOS host, Node 26: 4 to 141 ms per case, under 1 s for the file.

const INPUT_TIME = new Date("2026-01-01T00:00:00Z");
const BUILD_TIME = new Date("2026-02-01T00:00:00Z");
const EDIT_TIME = new Date("2026-03-01T00:00:00Z");
const CONFIG_FILES = ["tsconfig.json", "tsconfig.build.json", "package.json", "pnpm-lock.yaml"] as const;
const CASE_TIMEOUT_MS = 2_000;
const LOCK_POLL_MS = 5;

/**
 * Runs just before `fs.readdirSync(directory)` for a directory registered here, once. Stands in for
 * another process changing the tree between the helper's lstat of a directory and its readdir; the
 * `node:fs` mock below passes every call through to the real module.
 */
const beforeReaddir = vi.hoisted(() => new Map<string, () => void>());

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  const readdirSync = (...args: Parameters<typeof actual.readdirSync>): ReturnType<typeof actual.readdirSync> => {
    const directory = String(args[0]);
    const hook = beforeReaddir.get(directory);
    beforeReaddir.delete(directory);
    hook?.();
    return actual.readdirSync(...args);
  };
  return { ...actual, readdirSync: readdirSync as typeof actual.readdirSync };
});

function setTime(target: string, time: Date): void {
  fs.utimesSync(target, time, time);
}

function walk(directory: string): string[] {
  const entries: string[] = [];
  for (const name of fs.readdirSync(directory).sort()) {
    const absolute = path.join(directory, name);
    entries.push(absolute);
    if (fs.lstatSync(absolute).isDirectory()) entries.push(...walk(absolute));
  }
  return entries;
}

/** A fake package root whose inputs all carry INPUT_TIME, removed when the calling case finishes. */
function packageRoot(onTestFinished: TestContext["onTestFinished"]): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "graft-fresh-dist-"));
  // The case's own hook from its context, so each case removes only its own root and cases may run
  // concurrently (the module-level onTestFinished cannot tell concurrent cases apart).
  onTestFinished(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });
  fs.mkdirSync(path.join(root, "src", "nested"), { recursive: true });
  fs.writeFileSync(path.join(root, "src", "a.ts"), "export const a = 1;\n");
  fs.writeFileSync(path.join(root, "src", "nested", "b.ts"), "export const b = 1;\n");
  for (const file of CONFIG_FILES) fs.writeFileSync(path.join(root, file), "{}\n");
  for (const entry of [...walk(path.join(root, "src")), path.join(root, "src")]) setTime(entry, INPUT_TIME);
  for (const file of CONFIG_FILES) setTime(path.join(root, file), INPUT_TIME);
  return root;
}

interface FakeBuild {
  readonly calls: number;
  readonly build: (root: string) => Promise<DistBuildResult>;
}

/**
 * Stands in for tsc: writes dist/<source>.js carrying the source text for each .ts module, and like
 * tsc emits nothing for a declaration file (.d.ts), then reports `result`.
 */
function fakeBuild(
  result: DistBuildResult = { status: 0, output: "" },
  gate?: Promise<void>,
  onStart?: () => void,
): FakeBuild {
  let calls = 0;
  return {
    get calls() {
      return calls;
    },
    build: async (root: string): Promise<DistBuildResult> => {
      calls += 1;
      onStart?.();
      if (gate !== undefined) await gate;
      const src = path.join(root, "src");
      for (const entry of walk(src)) {
        if (!entry.endsWith(".ts") || entry.endsWith(".d.ts")) continue;
        const target = path.join(root, "dist", path.relative(src, entry).replace(/\.ts$/u, ".js"));
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, fs.readFileSync(entry, "utf8"));
      }
      return result;
    },
  };
}

/** Builds dist/ with the fake build and stamps every output with BUILD_TIME. */
async function builtRoot(onTestFinished: TestContext["onTestFinished"]): Promise<string> {
  const root = packageRoot(onTestFinished);
  await fakeBuild().build(root);
  for (const entry of walk(path.join(root, "dist"))) setTime(entry, BUILD_TIME);
  return root;
}

/** The pid of a node child that has already exited. */
function exitedPid(): number {
  const exited = spawnSync(process.execPath, ["-e", ""]);
  if (exited.status !== 0) throw new Error("could not obtain an exited pid");
  return exited.pid;
}

function distText(root: string, relative: string): string {
  return fs.readFileSync(path.join(root, "dist", relative), "utf8");
}

describe("test support: ensureFreshDist", { timeout: CASE_TIMEOUT_MS }, () => {
  it("builds dist when it is missing", async ({ onTestFinished }) => {
    const root = packageRoot(onTestFinished);
    const build = fakeBuild();

    await expect(ensureFreshDist({ root, build: build.build })).resolves.toBe("built");

    expect(build.calls).toBe(1);
    expect(distText(root, "a.js")).toBe("export const a = 1;\n");
  });

  it("does not build when every output is newer than every input", async ({ onTestFinished }) => {
    const root = await builtRoot(onTestFinished);
    const build = fakeBuild();

    await expect(ensureFreshDist({ root, build: build.build })).resolves.toBe("fresh");

    expect(build.calls).toBe(0);
  });

  it("rebuilds when a source file is newer than the build", async ({ onTestFinished }) => {
    const root = await builtRoot(onTestFinished);
    fs.writeFileSync(path.join(root, "src", "a.ts"), "export const a = 2;\n");
    setTime(path.join(root, "src", "a.ts"), EDIT_TIME);
    const build = fakeBuild();

    await expect(ensureFreshDist({ root, build: build.build })).resolves.toBe("built");

    expect(build.calls).toBe(1);
    expect(distText(root, "a.js")).toBe("export const a = 2;\n");
  });

  it.for(CONFIG_FILES)("rebuilds when %s is newer than the build", async (file, { onTestFinished }) => {
    const root = await builtRoot(onTestFinished);
    setTime(path.join(root, file), EDIT_TIME);
    const build = fakeBuild();

    await expect(ensureFreshDist({ root, build: build.build })).resolves.toBe("built");

    expect(build.calls).toBe(1);
  });

  it.for(["src", ...CONFIG_FILES])("fails without building when the required input %s is missing", async (input, { onTestFinished }) => {
    const root = await builtRoot(onTestFinished);
    fs.rmSync(path.join(root, input), { recursive: true });
    const build = fakeBuild();

    await expect(ensureFreshDist({ root, build: build.build })).rejects.toThrow(
      `required build input ${input} is missing`,
    );

    expect(build.calls).toBe(0);
  });

  it("rebuilds when a source is saved after the build read it but before the build wrote any output", async ({ onTestFinished }) => {
    const root = packageRoot(onTestFinished);
    const source = path.join(root, "src", "a.ts");
    let calls = 0;
    // Like tsc: reads every input first, then emits. The first build sees the edit land in between,
    // with an mtime older than anything it is about to write.
    const build = async (target: string): Promise<DistBuildResult> => {
      calls += 1;
      const read = fs.readFileSync(source, "utf8");
      if (calls === 1) {
        fs.writeFileSync(source, "export const a = 2;\n");
        setTime(source, EDIT_TIME);
      }
      await fakeBuild().build(target);
      fs.writeFileSync(path.join(target, "dist", "a.js"), read);
      return { status: 0, output: "" };
    };

    await expect(ensureFreshDist({ root, build })).resolves.toBe("built");

    expect(distText(root, "a.js")).toBe("export const a = 2;\n");
    expect(calls).toBe(2);
  });

  it("gives up, leaving dist marked stale, when a source changes during every build", async ({ onTestFinished }) => {
    const root = packageRoot(onTestFinished);
    const source = path.join(root, "src", "a.ts");
    let edits = 0;
    const churning = async (target: string): Promise<DistBuildResult> => {
      edits += 1;
      fs.writeFileSync(source, `export const a = ${String(edits + 1)};\n`);
      setTime(source, new Date(EDIT_TIME.getTime() + edits * 1_000));
      return fakeBuild().build(target);
    };

    await expect(ensureFreshDist({ root, build: churning })).rejects.toThrow(/kept changing while dist\/ was being built/u);
    expect(edits).toBe(3);
    const build = fakeBuild();

    await expect(ensureFreshDist({ root, build: build.build })).resolves.toBe("built");

    expect(build.calls).toBe(1);
  });

  it("treats dist as stale, and rebuilds, when another process deletes part of it during the check", async ({ onTestFinished }) => {
    const root = await builtRoot(onTestFinished);
    const nested = path.join(root, "dist", "nested");
    // The check has already lstat'ed dist/nested as a directory when it disappears.
    beforeReaddir.set(nested, () => {
      fs.rmSync(nested, { recursive: true, force: true });
    });
    const build = fakeBuild();

    await expect(ensureFreshDist({ root, build: build.build })).resolves.toBe("built");

    expect(beforeReaddir.has(nested)).toBe(false);
    expect(build.calls).toBe(1);
    expect(distText(root, "nested/b.js")).toBe("export const b = 1;\n");
  });

  it("rebuilds from a clean dist when a source file was deleted, dropping its orphaned output", async ({ onTestFinished }) => {
    const root = await builtRoot(onTestFinished);
    fs.rmSync(path.join(root, "src", "nested", "b.ts"));
    setTime(path.join(root, "src", "nested"), EDIT_TIME);
    const build = fakeBuild();

    await expect(ensureFreshDist({ root, build: build.build })).resolves.toBe("built");

    expect(build.calls).toBe(1);
    expect(fs.existsSync(path.join(root, "dist", "nested", "b.js"))).toBe(false);
    expect(fs.existsSync(path.join(root, "dist", "a.js"))).toBe(true);
  });

  it("rebuilds when one output predates an input even though the rest are newer", async ({ onTestFinished }) => {
    const root = await builtRoot(onTestFinished);
    for (const entry of walk(path.join(root, "dist"))) setTime(entry, EDIT_TIME);
    const leftover = path.join(root, "dist", "leftover.js");
    fs.writeFileSync(leftover, "export const stale = true;\n");
    setTime(leftover, BUILD_TIME);
    setTime(path.join(root, "src", "a.ts"), new Date("2026-02-15T00:00:00Z"));
    const build = fakeBuild();

    await expect(ensureFreshDist({ root, build: build.build })).resolves.toBe("built");

    expect(build.calls).toBe(1);
    expect(fs.existsSync(leftover)).toBe(false);
  });

  it("rebuilds when a source file has no emitted output, even though every output is newer", async ({ onTestFinished }) => {
    const root = await builtRoot(onTestFinished);
    fs.rmSync(path.join(root, "dist", "nested", "b.js"));
    const build = fakeBuild();

    await expect(ensureFreshDist({ root, build: build.build })).resolves.toBe("built");

    expect(build.calls).toBe(1);
    expect(distText(root, "nested/b.js")).toBe("export const b = 1;\n");
  });

  it("fails without building or removing dist, naming the file, when an input's mtime is in the future", async ({ onTestFinished }) => {
    const root = await builtRoot(onTestFinished);
    const future = new Date("2099-01-01T00:00:00Z");
    setTime(path.join(root, "src", "a.ts"), future);
    const build = fakeBuild();

    await expect(ensureFreshDist({ root, build: build.build })).rejects.toThrow(
      /src\/a\.ts has a modification time in the future/u,
    );
    await expect(ensureFreshDist({ root, build: build.build })).rejects.toThrow(/in the future/u);

    expect(build.calls).toBe(0);
    expect(distText(root, "a.js")).toBe("export const a = 1;\n");
  });

  it("does not require an emitted .js for a declaration file under src", async ({ onTestFinished }) => {
    const root = packageRoot(onTestFinished);
    const declaration = path.join(root, "src", "nested", "types.d.ts");
    fs.writeFileSync(declaration, "export type T = number;\n");
    for (const entry of [declaration, path.join(root, "src", "nested")]) setTime(entry, INPUT_TIME);
    const first = fakeBuild();
    await expect(ensureFreshDist({ root, build: first.build })).resolves.toBe("built");
    expect(fs.existsSync(path.join(root, "dist", "nested", "types.d.js"))).toBe(false);
    const build = fakeBuild();

    await expect(ensureFreshDist({ root, build: build.build })).resolves.toBe("fresh");

    expect(build.calls).toBe(0);
  });

  it("rebuilds after an earlier build ended before finishing, even though it had emitted every file", async ({ onTestFinished }) => {
    const root = packageRoot(onTestFinished);
    const interrupted = fakeBuild();
    const dies = async (target: string): Promise<DistBuildResult> => {
      await interrupted.build(target);
      throw new Error("build process died after emitting");
    };

    await expect(ensureFreshDist({ root, build: dies })).rejects.toThrow("build process died after emitting");
    expect(distText(root, "a.js")).toBe("export const a = 1;\n");
    const build = fakeBuild();

    await expect(ensureFreshDist({ root, build: build.build })).resolves.toBe("built");

    expect(build.calls).toBe(1);
  });

  it("keeps the emitted output and warns when tsc reports diagnostics with exit 2", async ({ onTestFinished }) => {
    const root = packageRoot(onTestFinished);
    const build = fakeBuild({ status: 2, output: "src/a.ts(1,1): error TS2322: example" });
    const warnings: string[] = [];

    await expect(ensureFreshDist({ root, build: build.build, warn: (message) => warnings.push(message) }))
      .resolves.toBe("built");

    expect(distText(root, "a.js")).toBe("export const a = 1;\n");
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("error TS2322: example");
  });

  it("fails and leaves no dist when the build fails without emitting", async ({ onTestFinished }) => {
    const root = packageRoot(onTestFinished);
    const build = fakeBuild({ status: 1, output: "error TS5083: Cannot read file" });

    await expect(ensureFreshDist({ root, build: build.build })).rejects.toThrow(/error TS5083/u);

    expect(fs.existsSync(path.join(root, "dist"))).toBe(false);
  });

  it("builds once when two calls race on the same stale checkout", async ({ onTestFinished }) => {
    const root = packageRoot(onTestFinished);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let started!: () => void;
    const buildStarted = new Promise<void>((resolve) => {
      started = resolve;
    });
    const build = fakeBuild({ status: 0, output: "" }, gate, started);

    // The first call holds the lock from before its build starts until after it returns. Starting
    // the second call only once that build has started means the second call's synchronous part
    // (the staleness check and its first lock attempt) runs while the lock is held.
    const first = ensureFreshDist({ root, build: build.build, lockPollMs: LOCK_POLL_MS });
    await buildStarted;
    const second = ensureFreshDist({ root, build: build.build, lockPollMs: LOCK_POLL_MS });
    release();

    expect((await Promise.all([first, second])).sort()).toEqual(["built", "fresh"]);
    expect(build.calls).toBe(1);
  });

  it("takes over a build lock whose owning process has exited", async ({ onTestFinished }) => {
    const root = packageRoot(onTestFinished);
    expect(writeBuildLock(root, exitedPid())).toBe(true);
    const build = fakeBuild();

    await expect(ensureFreshDist({ root, build: build.build, lockPollMs: LOCK_POLL_MS })).resolves.toBe("built");

    expect(build.calls).toBe(1);
    expect(buildLockHolder(root)).toBeUndefined();
  });

  it("takes over a dead owner's lock even when an earlier taker died while retiring it", async ({ onTestFinished }) => {
    const root = packageRoot(onTestFinished);
    expect(writeBuildLock(root, exitedPid())).toBe(true);
    const lock = buildLockPath(root);
    const [, token] = fs.readFileSync(lock, "utf8").split(" ");
    // The first retirement claim on this instance, left by a process that died holding it.
    fs.writeFileSync(`${lock}.retire.${String(token)}.1`, String(exitedPid()));
    const build = fakeBuild();

    await expect(ensureFreshDist({ root, build: build.build, lockPollMs: LOCK_POLL_MS })).resolves.toBe("built");

    expect(build.calls).toBe(1);
    expect(buildLockHolder(root)).toBeUndefined();
    expect(fs.readdirSync(path.dirname(lock)).filter((name) => name.includes(".retire."))).toEqual([]);
  });

  it("leaves alone a live lock that replaced the dead one it saw, instead of taking it over", async ({ onTestFinished }) => {
    const root = packageRoot(onTestFinished);
    expect(writeBuildLock(root, exitedPid())).toBe(true);
    // A live process other than this one: the Vitest parent outlives this case.
    const livePeer = process.ppid;
    let sawDeadOwner = 0;
    const build = fakeBuild();

    const attempt = ensureFreshDist({
      root,
      build: build.build,
      lockPollMs: LOCK_POLL_MS,
      lockTimeoutMs: 0,
      beforeDeadLockTakeover: () => {
        sawDeadOwner += 1;
        // Between this process seeing the dead owner and acting on it, another process takes the
        // dead lock over and now holds a live one of its own.
        fs.rmSync(buildLockPath(root), { recursive: true, force: true });
        expect(writeBuildLock(root, livePeer)).toBe(true);
      },
    });

    await expect(attempt).rejects.toThrow(/Timed out/u);
    expect(sawDeadOwner).toBe(1);
    expect(build.calls).toBe(0);
    expect(buildLockHolder(root)).toBe(livePeer);
  });

  it("takes over a lock older than the maximum lock age even though its pid names a live process", async ({ onTestFinished }) => {
    const root = packageRoot(onTestFinished);
    // A crashed owner whose pid now belongs to an unrelated live process (the Vitest parent).
    expect(writeBuildLock(root, process.ppid, Date.now() - 60 * 60_000)).toBe(true);
    const build = fakeBuild();

    await expect(ensureFreshDist({ root, build: build.build, lockPollMs: LOCK_POLL_MS, lockTimeoutMs: 200 }))
      .resolves.toBe("built");

    expect(build.calls).toBe(1);
    expect(buildLockHolder(root)).toBeUndefined();
  });

  it("takes over a lock directory left by the earlier version of this setup when its owner has exited", async ({ onTestFinished }) => {
    const root = packageRoot(onTestFinished);
    const lock = buildLockPath(root);
    // The first version's lock: a directory holding the owner's pid in a file named `pid`.
    fs.mkdirSync(lock, { recursive: true });
    fs.writeFileSync(path.join(lock, "pid"), String(exitedPid()));
    const build = fakeBuild();

    await expect(ensureFreshDist({ root, build: build.build, lockPollMs: LOCK_POLL_MS, lockTimeoutMs: 200 }))
      .resolves.toBe("built");

    expect(build.calls).toBe(1);
    expect(fs.existsSync(lock)).toBe(false);
  });

  it("waits on, and leaves alone, a young lock directory from the earlier version whose owner is alive", async ({ onTestFinished }) => {
    const root = packageRoot(onTestFinished);
    const lock = buildLockPath(root);
    fs.mkdirSync(lock, { recursive: true });
    fs.writeFileSync(path.join(lock, "pid"), String(process.ppid));
    const build = fakeBuild();

    await expect(ensureFreshDist({ root, build: build.build, lockPollMs: LOCK_POLL_MS, lockTimeoutMs: 50 }))
      .rejects.toThrow(/Timed out/u);

    expect(build.calls).toBe(0);
    expect(fs.readFileSync(path.join(lock, "pid"), "utf8")).toBe(String(process.ppid));
  });

  it("fails, leaving dist marked stale, when its lock was taken over while it was building", async ({ onTestFinished }) => {
    const root = packageRoot(onTestFinished);
    const lock = buildLockPath(root);
    const inner = fakeBuild();
    const overtaken = async (target: string): Promise<DistBuildResult> => {
      // Another process judged this build's lock too old, took it over, and holds it now.
      fs.rmSync(lock, { force: true });
      expect(writeBuildLock(target, process.ppid)).toBe(true);
      return inner.build(target);
    };

    await expect(ensureFreshDist({ root, build: overtaken })).rejects.toThrow(/taken over/u);

    expect(buildLockHolder(root)).toBe(process.ppid);
    fs.rmSync(lock, { force: true });
    const build = fakeBuild();
    await expect(ensureFreshDist({ root, build: build.build })).resolves.toBe("built");
    expect(build.calls).toBe(1);
  });
});

describe("test support: keepDistFresh", { timeout: CASE_TIMEOUT_MS }, () => {
  it("rechecks dist before each watch-mode rerun, rebuilding after a source edit", async ({ onTestFinished }) => {
    const root = await builtRoot(onTestFinished);
    const reruns: (() => Promise<void> | void)[] = [];
    const project = { onTestsRerun: (handler: () => Promise<void> | void) => { reruns.push(handler); } };
    const build = fakeBuild();

    await keepDistFresh(project, { root, build: build.build });
    expect(build.calls).toBe(0);
    expect(reruns).toHaveLength(1);

    // What Vitest does on a watch rerun: fire the registered handlers, then run the tests.
    fs.writeFileSync(path.join(root, "src", "a.ts"), "export const a = 2;\n");
    setTime(path.join(root, "src", "a.ts"), EDIT_TIME);
    await reruns[0]?.();

    expect(build.calls).toBe(1);
    expect(distText(root, "a.js")).toBe("export const a = 2;\n");

    await reruns[0]?.();

    expect(build.calls).toBe(1);
  });
});
