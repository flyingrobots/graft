import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ensureFreshDist, type DistBuildResult } from "../../helpers/fresh-dist.js";

// Oracle: docs/design/CLEAN_tests-fresh-dist.md. dist/ is fresh only when it holds at least one
// file and its oldest file is newer than the newest build input (every file and directory under
// src/, plus tsconfig.json, tsconfig.build.json, package.json, pnpm-lock.yaml). A stale dist/ is
// removed and rebuilt; tsc's exit 2 (diagnostics, output emitted) warns; any other failure throws
// and leaves no dist/. src/ and each config file are required; a missing one fails setup unbuilt.
// Size: medium (TESTING_STANDARDS.md Rule 9). Owner: @flyingrobots. Resources: files only under a
// private mkdtemp root per case, removed in afterEach; at most one child process at a time (the
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

const roots: string[] = [];

afterEach(() => {
  while (roots.length > 0) {
    fs.rmSync(roots.pop()!, { recursive: true, force: true });
  }
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

/** A fake package root whose inputs all carry INPUT_TIME. */
function packageRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "graft-fresh-dist-"));
  roots.push(root);
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

/** Stands in for tsc: writes dist/<source>.js carrying the source text, then reports `result`. */
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
        if (!entry.endsWith(".ts")) continue;
        const target = path.join(root, "dist", path.relative(src, entry).replace(/\.ts$/u, ".js"));
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, fs.readFileSync(entry, "utf8"));
      }
      return result;
    },
  };
}

/** Builds dist/ with the fake build and stamps every output with BUILD_TIME. */
async function builtRoot(): Promise<string> {
  const root = packageRoot();
  await fakeBuild().build(root);
  for (const entry of walk(path.join(root, "dist"))) setTime(entry, BUILD_TIME);
  return root;
}

function distText(root: string, relative: string): string {
  return fs.readFileSync(path.join(root, "dist", relative), "utf8");
}

describe("test support: ensureFreshDist", { timeout: CASE_TIMEOUT_MS }, () => {
  it("builds dist when it is missing", async () => {
    const root = packageRoot();
    const build = fakeBuild();

    await expect(ensureFreshDist({ root, build: build.build })).resolves.toBe("built");

    expect(build.calls).toBe(1);
    expect(distText(root, "a.js")).toBe("export const a = 1;\n");
  });

  it("does not build when every output is newer than every input", async () => {
    const root = await builtRoot();
    const build = fakeBuild();

    await expect(ensureFreshDist({ root, build: build.build })).resolves.toBe("fresh");

    expect(build.calls).toBe(0);
  });

  it("rebuilds when a source file is newer than the build", async () => {
    const root = await builtRoot();
    fs.writeFileSync(path.join(root, "src", "a.ts"), "export const a = 2;\n");
    setTime(path.join(root, "src", "a.ts"), EDIT_TIME);
    const build = fakeBuild();

    await expect(ensureFreshDist({ root, build: build.build })).resolves.toBe("built");

    expect(build.calls).toBe(1);
    expect(distText(root, "a.js")).toBe("export const a = 2;\n");
  });

  it.each(CONFIG_FILES)("rebuilds when %s is newer than the build", async (file) => {
    const root = await builtRoot();
    setTime(path.join(root, file), EDIT_TIME);
    const build = fakeBuild();

    await expect(ensureFreshDist({ root, build: build.build })).resolves.toBe("built");

    expect(build.calls).toBe(1);
  });

  it.each(["src", ...CONFIG_FILES])("fails without building when the required input %s is missing", async (input) => {
    const root = await builtRoot();
    fs.rmSync(path.join(root, input), { recursive: true });
    const build = fakeBuild();

    await expect(ensureFreshDist({ root, build: build.build })).rejects.toThrow(
      `required build input ${input} is missing`,
    );

    expect(build.calls).toBe(0);
  });

  it("rebuilds from a clean dist when a source file was deleted, dropping its orphaned output", async () => {
    const root = await builtRoot();
    fs.rmSync(path.join(root, "src", "nested", "b.ts"));
    setTime(path.join(root, "src", "nested"), EDIT_TIME);
    const build = fakeBuild();

    await expect(ensureFreshDist({ root, build: build.build })).resolves.toBe("built");

    expect(build.calls).toBe(1);
    expect(fs.existsSync(path.join(root, "dist", "nested", "b.js"))).toBe(false);
    expect(fs.existsSync(path.join(root, "dist", "a.js"))).toBe(true);
  });

  it("rebuilds when one output predates an input even though the rest are newer", async () => {
    const root = await builtRoot();
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

  it("keeps the emitted output and warns when tsc reports diagnostics with exit 2", async () => {
    const root = packageRoot();
    const build = fakeBuild({ status: 2, output: "src/a.ts(1,1): error TS2322: example" });
    const warnings: string[] = [];

    await expect(ensureFreshDist({ root, build: build.build, warn: (message) => warnings.push(message) }))
      .resolves.toBe("built");

    expect(distText(root, "a.js")).toBe("export const a = 1;\n");
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("error TS2322: example");
  });

  it("fails and leaves no dist when the build fails without emitting", async () => {
    const root = packageRoot();
    const build = fakeBuild({ status: 1, output: "error TS5083: Cannot read file" });

    await expect(ensureFreshDist({ root, build: build.build })).rejects.toThrow(/error TS5083/u);

    expect(fs.existsSync(path.join(root, "dist"))).toBe(false);
  });

  it("builds once when two calls race on the same stale checkout", async () => {
    const root = packageRoot();
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

  it("takes over a build lock whose owning process has exited", async () => {
    const root = packageRoot();
    const exited = spawnSync(process.execPath, ["-e", ""]);
    const lock = path.join(root, "node_modules", ".cache", "graft", "dist-build.lock");
    fs.mkdirSync(lock, { recursive: true });
    fs.writeFileSync(path.join(lock, "pid"), String(exited.pid));
    const build = fakeBuild();

    await expect(ensureFreshDist({ root, build: build.build })).resolves.toBe("built");

    expect(build.calls).toBe(1);
    expect(fs.existsSync(lock)).toBe(false);
  });
});
