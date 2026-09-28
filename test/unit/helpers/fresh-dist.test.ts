import { spawnSync } from "node:child_process";
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { describe, expect, it, vi, type TestContext } from "vitest";
import { ensureFreshDist, keepDistFresh, type DistBuildResult } from "../../helpers/fresh-dist.js";

// Oracle: docs/design/CLEAN_tests-fresh-dist.md. dist/ is fresh only when it holds at least one
// file, every src module other than a .d.ts has its .js, and its oldest file is newer than the newest
// build input (every file and directory under src/, plus tsconfig.json, tsconfig.build.json,
// package.json, pnpm-lock.yaml). A stale dist/ is rebuilt into a private staging directory beside
// it and published by rename, so dist/ is only ever absent or one build's complete output; a build
// whose inputs changed under it is rebuilt before publishing. tsc's exit 2 (diagnostics, output
// emitted) warns; any other failure throws and leaves dist/ as it was. src/ and each config file
// are required, and a future-dated input fails setup; both unbuilt. Build directories left by dead
// processes are removed. keepDistFresh rechecks before every watch-mode rerun.
// Size: medium (TESTING_STANDARDS.md Rule 9). Owner: @flyingrobots. Resources: files only under a
// private mkdtemp root per case, removed by that case (onTestFinished); at most one child process
// at a time (the abandoned-build-directory case spawns `node -e ""` to obtain a pid that has exited);
// no network. `node:fs` is mocked as a pass-through whose readdirSync and renameSync can run hooks
// registered by a case (another process deleting or publishing dist/ at that moment). Time: mtimes
// are set with utimes; no case waits on a timer; the helper's clock is injected through its `now`
// option where a case depends on it, and no case fakes or spies on the global Date. Ceiling:
// CASE_TIMEOUT_MS per case, enforced by the describe timeout; suite budget 2 s for the file. Isolation checked alone, shuffled and with --sequence.concurrent.
// CI stage: pre-merge. The CI workflow's `test` job (Node 22 leg, step "Tests") runs `pnpm test`,
// the Docker-isolated full Vitest run, on every pull request to main and every push to main.
// Deletion criterion (Rule 18): delete with test/helpers/fresh-dist.ts when no test executes dist/
// any more, or when dist/ freshness moves to a mechanism with its own tests that cover these claims
// (for example building before every run). Displaced risk if deleted without either: a test
// executing a stale or partial dist/ again, the failure this suite exists to prevent.

const INPUT_TIME = new Date("2026-01-01T00:00:00Z");
const BUILD_TIME = new Date("2026-02-01T00:00:00Z");
const EDIT_TIME = new Date("2026-03-01T00:00:00Z");
const CONFIG_FILES = ["tsconfig.json", "tsconfig.build.json", "package.json", "pnpm-lock.yaml"] as const;
const CASE_TIMEOUT_MS = 2_000;

/**
 * Runs just before `fs.readdirSync(directory)` for a directory registered here, once. Stands in for
 * another process changing the tree between the helper's lstat of a directory and its readdir; the
 * `node:fs` mock below passes every call through to the real module.
 */
const beforeReaddir = vi.hoisted(() => new Map<string, () => void>());

/**
 * Runs just before `fs.renameSync(from, to)` for a destination registered here, once. Stands in for
 * another process publishing its own build between this process's two publishing renames.
 */
const beforeRenameTo = vi.hoisted(() => new Map<string, () => void>());

/** Called before every `fs.renameSync` whose source or destination is under a registered root. */
const renameObservers = vi.hoisted(() => new Map<string, () => void>());

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  const readdirSync = (...args: Parameters<typeof actual.readdirSync>): ReturnType<typeof actual.readdirSync> => {
    const directory = String(args[0]);
    const hook = beforeReaddir.get(directory);
    beforeReaddir.delete(directory);
    hook?.();
    return actual.readdirSync(...args);
  };
  const renameSync = (from: fs.PathLike, to: fs.PathLike): void => {
    for (const [root, observe] of renameObservers) {
      if (String(to).startsWith(root) || String(from).startsWith(root)) observe();
    }
    const hook = beforeRenameTo.get(String(to));
    beforeRenameTo.delete(String(to));
    hook?.();
    actual.renameSync(from, to);
  };
  return { ...actual, readdirSync: readdirSync as typeof actual.readdirSync, renameSync };
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
  readonly build: (root: string, outDir?: string) => Promise<DistBuildResult>;
}

/**
 * Stands in for tsc: reads every module, then writes <outDir>/<source>.js carrying the source text
 * for each .ts module (like tsc, nothing for a declaration file), then reports `result`.
 */
function fakeBuild(
  result: DistBuildResult = { status: 0, output: "" },
  gate?: Promise<void>,
  onStart?: () => void,
  onFinish?: () => void,
): FakeBuild {
  let calls = 0;
  return {
    get calls() {
      return calls;
    },
    build: async (root: string, outDir: string = path.join(root, "dist")): Promise<DistBuildResult> => {
      calls += 1;
      const src = path.join(root, "src");
      const modules = walk(src)
        .filter((entry) => entry.endsWith(".ts") && !entry.endsWith(".d.ts"))
        .map((entry) => ({ entry, text: fs.readFileSync(entry, "utf8") }));
      onStart?.();
      if (gate !== undefined) await gate;
      for (const { entry, text } of modules) {
        const target = path.join(outDir, path.relative(src, entry).replace(/\.ts$/u, ".js"));
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, text);
      }
      onFinish?.();
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

/** Build directories beside dist/ (a build's private output, or a replaced dist/) still present. */
function buildDirectoriesBesideDist(root: string): string[] {
  return fs.readdirSync(root).filter((name) => name.startsWith("dist."));
}

describe("test support: ensureFreshDist publishes whole builds", { timeout: CASE_TIMEOUT_MS }, () => {
  it("never leaves in dist the output of a build that read a source edited before it finished", async ({ onTestFinished }) => {
    const root = packageRoot(onTestFinished);
    const source = path.join(root, "src", "a.ts");
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let started!: () => void;
    const slowStarted = new Promise<void>((resolve) => {
      started = resolve;
    });
    // The slow build reads a = 1, then waits; its output lands only after the fast one's.
    const slow = fakeBuild({ status: 0, output: "" }, gate, started);
    let slowCalls = 0;
    const slowOnce = (target: string, outDir?: string): Promise<DistBuildResult> => {
      slowCalls += 1;
      return slowCalls === 1 ? slow.build(target, outDir) : fakeBuild().build(target, outDir);
    };
    const first = ensureFreshDist({ root, build: slowOnce });
    await slowStarted;
    fs.writeFileSync(source, "export const a = 2;\n");
    setTime(source, EDIT_TIME);
    // The second call's clock reads three minutes on, past the age at which the earlier lock-based
    // design presumed a build dead and let a second build run beside it; kept so that design cannot
    // quietly come back. The clock is injected, so no other case running concurrently sees it.
    const threeMinutesOn = Date.now() + 3 * 60_000;
    await expect(ensureFreshDist({ root, build: fakeBuild().build, now: () => threeMinutesOn })).resolves.toBe("built");
    expect(distText(root, "a.js")).toBe("export const a = 2;\n");

    release();
    await expect(first).resolves.toBe("built");

    expect(distText(root, "a.js")).toBe("export const a = 2;\n");
    const build = fakeBuild();
    await expect(ensureFreshDist({ root, build: build.build })).resolves.toBe("fresh");
    expect(build.calls).toBe(0);
  });

  it("leaves the previous dist in place, and no build directory, when a build fails after emitting", async ({ onTestFinished }) => {
    const root = await builtRoot(onTestFinished);
    fs.writeFileSync(path.join(root, "src", "a.ts"), "export const a = 2;\n");
    setTime(path.join(root, "src", "a.ts"), EDIT_TIME);
    const emitted = fakeBuild();
    const dies = async (target: string, outDir?: string): Promise<DistBuildResult> => {
      await emitted.build(target, outDir);
      throw new Error("build process died after emitting");
    };

    await expect(ensureFreshDist({ root, build: dies })).rejects.toThrow("build process died after emitting");

    expect(distText(root, "a.js")).toBe("export const a = 1;\n");
    expect(distText(root, "nested/b.js")).toBe("export const b = 1;\n");
    expect(buildDirectoriesBesideDist(root)).toEqual([]);
    const build = fakeBuild();
    await expect(ensureFreshDist({ root, build: build.build })).resolves.toBe("built");
    expect(distText(root, "a.js")).toBe("export const a = 2;\n");
  });

  it("keeps another process's build when it publishes between this build's two renames", async ({ onTestFinished }) => {
    const root = await builtRoot(onTestFinished);
    fs.writeFileSync(path.join(root, "src", "a.ts"), "export const a = 2;\n");
    setTime(path.join(root, "src", "a.ts"), EDIT_TIME);
    const dist = path.join(root, "dist");
    let peerPublished = false;
    // This process has moved the old dist aside; before it renames its build into place, a peer's
    // complete build of the same inputs lands at dist.
    beforeRenameTo.set(dist, () => {
      fs.mkdirSync(path.join(dist, "nested"), { recursive: true });
      fs.writeFileSync(path.join(dist, "a.js"), "export const a = 2;\n");
      fs.writeFileSync(path.join(dist, "nested", "b.js"), "export const b = 1;\n");
      fs.writeFileSync(path.join(dist, "peer-marker.js"), "");
      peerPublished = true;
    });
    onTestFinished(() => {
      beforeRenameTo.delete(dist);
    });
    const build = fakeBuild();

    await expect(ensureFreshDist({ root, build: build.build })).resolves.toBe("built");

    expect(peerPublished).toBe(true);
    expect(fs.existsSync(path.join(dist, "peer-marker.js"))).toBe(true);
    expect(buildDirectoriesBesideDist(root)).toEqual([]);
  });

  it("gives up, advising a rerun, when another process publishes a stale dist between this build's renames every time", async ({ onTestFinished }) => {
    const root = packageRoot(onTestFinished);
    const dist = path.join(root, "dist");
    let peerPublishes = 0;
    // Before each attempt's second rename, a peer publishes a complete dist whose outputs are no
    // newer than the inputs, so this build is refused and the peer's dist is not current either.
    const publishStalePeer = (): void => {
      peerPublishes += 1;
      fs.mkdirSync(path.join(dist, "nested"), { recursive: true });
      fs.writeFileSync(path.join(dist, "a.js"), "export const a = 1;\n");
      fs.writeFileSync(path.join(dist, "nested", "b.js"), "export const b = 1;\n");
      for (const entry of walk(dist)) setTime(entry, INPUT_TIME);
      beforeRenameTo.set(dist, publishStalePeer);
    };
    beforeRenameTo.set(dist, publishStalePeer);
    onTestFinished(() => {
      beforeRenameTo.delete(dist);
    });
    const build = fakeBuild();

    await expect(ensureFreshDist({ root, build: build.build })).rejects.toThrow(
      /could not be built from unchanging inputs in 3 attempts \(another process kept replacing dist\/\); dist\/ is left as it was\. Rerun once edits have stopped\.$/u,
    );

    expect(build.calls).toBe(3);
    expect(peerPublishes).toBe(3);
    expect(buildDirectoriesBesideDist(root)).toEqual([]);
  });

  it("puts the previous dist back when renaming the build into place fails unexpectedly", async ({ onTestFinished }) => {
    const root = await builtRoot(onTestFinished);
    fs.writeFileSync(path.join(root, "src", "a.ts"), "export const a = 2;\n");
    setTime(path.join(root, "src", "a.ts"), EDIT_TIME);
    const dist = path.join(root, "dist");
    beforeRenameTo.set(dist, () => {
      throw Object.assign(new Error("permission denied"), { code: "EACCES" });
    });
    onTestFinished(() => {
      beforeRenameTo.delete(dist);
    });
    const build = fakeBuild();

    await expect(ensureFreshDist({ root, build: build.build })).rejects.toMatchObject({ code: "EACCES" });

    expect(distText(root, "a.js")).toBe("export const a = 1;\n");
    expect(distText(root, "nested/b.js")).toBe("export const b = 1;\n");
  });

  it("two concurrent calls each publish a complete build, and dist is whole at every rename", async ({ onTestFinished }) => {
    const root = packageRoot(onTestFinished);
    const dist = path.join(root, "dist");
    const seenAtRename: string[] = [];
    renameObservers.set(root, () => {
      seenAtRename.push(fs.existsSync(dist) ? walk(dist).map((entry) => path.relative(dist, entry)).join(",") : "absent");
    });
    onTestFinished(() => {
      renameObservers.delete(root);
    });
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let started!: () => void;
    const buildStarted = new Promise<void>((resolve) => {
      started = resolve;
    });
    const build = fakeBuild({ status: 0, output: "" }, gate, started);

    const first = ensureFreshDist({ root, build: build.build });
    await buildStarted;
    const second = ensureFreshDist({ root, build: build.build });
    release();

    expect(await Promise.all([first, second])).toEqual(["built", "built"]);
    expect(build.calls).toBe(2);
    // Before each rename dist is either absent or one build's complete output, never a mixture.
    expect(seenAtRename).toContain("a.js,nested,nested/b.js");
    expect(new Set(seenAtRename)).toEqual(new Set(["absent", "a.js,nested,nested/b.js"]));
    expect(distText(root, "a.js")).toBe("export const a = 1;\n");
    expect(buildDirectoriesBesideDist(root)).toEqual([]);
  });

  it("removes build directories left beside dist by processes that died, and keeps a live one's", async ({ onTestFinished }) => {
    const root = packageRoot(onTestFinished);
    const dead = exitedPid();
    const abandoned = [
      `dist.staging.${String(dead)}.${crypto.randomUUID()}`,
      `dist.retired.${String(dead)}.${crypto.randomUUID()}`,
    ];
    const live = `dist.staging.${String(process.ppid)}.${crypto.randomUUID()}`;
    for (const name of [...abandoned, live]) {
      fs.mkdirSync(path.join(root, name, "nested"), { recursive: true });
      fs.writeFileSync(path.join(root, name, "a.js"), "export const a = 0;\n");
    }
    const build = fakeBuild();

    await expect(ensureFreshDist({ root, build: build.build })).resolves.toBe("built");

    expect(buildDirectoriesBesideDist(root)).toEqual([live]);
  });
});

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
    const build = async (target: string, outDir: string): Promise<DistBuildResult> => {
      calls += 1;
      const read = fs.readFileSync(source, "utf8");
      if (calls === 1) {
        fs.writeFileSync(source, "export const a = 2;\n");
        setTime(source, EDIT_TIME);
      }
      await fakeBuild().build(target, outDir);
      fs.writeFileSync(path.join(outDir, "a.js"), read);
      return { status: 0, output: "" };
    };

    await expect(ensureFreshDist({ root, build })).resolves.toBe("built");

    expect(distText(root, "a.js")).toBe("export const a = 2;\n");
    expect(calls).toBe(2);
  });

  it("gives up, leaving dist as it was, when a source changes during every build", async ({ onTestFinished }) => {
    const root = packageRoot(onTestFinished);
    const source = path.join(root, "src", "a.ts");
    let edits = 0;
    const churning = async (target: string, outDir: string): Promise<DistBuildResult> => {
      edits += 1;
      fs.writeFileSync(source, `export const a = ${String(edits + 1)};\n`);
      setTime(source, new Date(EDIT_TIME.getTime() + edits * 1_000));
      return fakeBuild().build(target, outDir);
    };

    await expect(ensureFreshDist({ root, build: churning })).rejects.toThrow(/could not be built from unchanging inputs in 3 attempts \(src\/a\.ts changed.* Rerun once edits have stopped\.$/u);
    expect(edits).toBe(3);
    expect(fs.existsSync(path.join(root, "dist"))).toBe(false);
    expect(buildDirectoriesBesideDist(root)).toEqual([]);
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

  // File times carry fractions of a millisecond and Date.now() does not, so an input saved in the
  // same millisecond as the check reads as later than "now" unless the comparison allows for that.
  it("does not treat an input saved in the same millisecond as the check as dated in the future", async ({ onTestFinished }) => {
    const root = await builtRoot(onTestFinished);
    const now = EDIT_TIME.getTime();
    fs.writeFileSync(path.join(root, "src", "a.ts"), "export const a = 2;\n");
    fs.utimesSync(path.join(root, "src", "a.ts"), now / 1000 + 0.0004, now / 1000 + 0.0004);
    const build = fakeBuild();

    // The helper's clock is injected, so no other case running concurrently sees this time.
    await expect(ensureFreshDist({ root, build: build.build, now: () => now })).resolves.toBe("built");
    expect(build.calls).toBe(1);
  });

  it("rebuilds, instead of failing, when a source is saved after the post-build recheck but before the output check", async ({ onTestFinished }) => {
    const root = await builtRoot(onTestFinished);
    const source = path.join(root, "src", "a.ts");
    fs.writeFileSync(source, "export const a = 2;\n");
    setTime(source, EDIT_TIME);
    const src = path.join(root, "src");
    let edited = false;
    // The first build's completion arms two readdir hooks on src/: the first src/ walk after the
    // build is the post-build recheck, the second is the output check, and the edit lands between.
    const build = fakeBuild(undefined, undefined, undefined, () => {
      if (edited) return;
      beforeReaddir.set(src, () => {
        beforeReaddir.set(src, () => {
          edited = true;
          fs.writeFileSync(source, "export const a = 3;\n");
          // A fixed mtime, newer than the build read and older than any real-clock output, so a
          // coarse file system clock cannot give the edit and the next build's output one tick.
          setTime(source, new Date(EDIT_TIME.getTime() + 1_000));
        });
      });
    });

    await expect(ensureFreshDist({ root, build: build.build })).resolves.toBe("built");

    expect(edited).toBe(true);
    expect(build.calls).toBe(2);
    expect(distText(root, "a.js")).toBe("export const a = 3;\n");
  });

  it("rebuilds when the build's output carries the same mtime as the newest input it read", async ({ onTestFinished }) => {
    // A file system clock with coarse ticks gives files written a few milliseconds apart the same
    // mtime, so an output can be no newer than the input the build read even though nothing changed.
    const root = await builtRoot(onTestFinished);
    const source = path.join(root, "src", "a.ts");
    fs.writeFileSync(source, "export const a = 2;\n");
    for (const input of [source, ...CONFIG_FILES.map((file) => path.join(root, file))]) setTime(input, EDIT_TIME);
    const inner = fakeBuild();
    const build = async (buildRoot: string, outDir?: string): Promise<DistBuildResult> => {
      const result = await inner.build(buildRoot, outDir);
      if (inner.calls === 1 && outDir !== undefined) for (const output of walk(outDir)) setTime(output, EDIT_TIME);
      return result;
    };

    await expect(ensureFreshDist({ root, build })).resolves.toBe("built");

    expect(inner.calls).toBe(2);
    expect(distText(root, "a.js")).toBe("export const a = 2;\n");
  });

  it("gives up after its attempts, naming the stale output, when every build's output is no newer than its inputs", async ({ onTestFinished }) => {
    const root = await builtRoot(onTestFinished);
    const source = path.join(root, "src", "a.ts");
    fs.writeFileSync(source, "export const a = 2;\n");
    for (const input of [source, ...CONFIG_FILES.map((file) => path.join(root, file))]) setTime(input, EDIT_TIME);
    const inner = fakeBuild();
    const build = async (buildRoot: string, outDir?: string): Promise<DistBuildResult> => {
      const result = await inner.build(buildRoot, outDir);
      if (outDir !== undefined) for (const output of walk(outDir)) setTime(output, EDIT_TIME);
      return result;
    };

    await expect(ensureFreshDist({ root, build })).rejects.toThrow(
      /could not be built from unchanging inputs in 3 attempts \(its output was not current: .* is not older than .*left as it was\.$/u,
    );

    expect(inner.calls).toBe(3);
    expect(distText(root, "a.js")).toBe("export const a = 1;\n");
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
    expect(buildDirectoriesBesideDist(root)).toEqual([]);
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
