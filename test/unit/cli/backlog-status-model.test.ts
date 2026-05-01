import * as fs from "node:fs";
import * as path from "node:path";
import process from "node:process";
import { afterEach, describe, expect, it } from "vitest";
import { nodePathOps } from "../../../src/adapters/node-paths.js";
import type { FileSystem } from "../../../src/ports/filesystem.js";
import type { PathOps } from "../../../src/ports/paths.js";
import { createTestDir, type TestDir } from "../../helpers/temp.js";
import { realFs } from "../../helpers/real-fs.js";

interface BacklogStatusModel {
  readonly summary: {
    readonly activeBacklogByLane: Readonly<Record<string, number>>;
    readonly activeDesignCount: number;
    readonly completedRetroCount: number;
    readonly blockedInternalCount: number;
    readonly blockedExternalCount: number;
    readonly unresolvedDependencyReferenceCount: number;
  };
  readonly items: readonly BacklogStatusItem[];
  readonly warnings: readonly BacklogStatusWarning[];
}

interface BacklogStatusItem {
  readonly id: string;
  readonly title: string;
  readonly lane?: string | undefined;
  readonly frontmatterLane?: string | undefined;
  readonly status: string;
  readonly sourcePath: string;
  readonly blockedBy?: readonly string[] | undefined;
  readonly blocking?: readonly string[] | undefined;
  readonly blockedByExternal?: readonly string[] | undefined;
  readonly retroPath?: string | undefined;
}

interface BacklogStatusWarning {
  readonly type: string;
  readonly itemId?: string | undefined;
  readonly field?: string | undefined;
  readonly ref?: string | undefined;
  readonly expectedLane?: string | undefined;
  readonly actualLane?: string | undefined;
}

type BuildBacklogStatusModel = (input: {
  readonly root: string;
  readonly fs: FileSystem;
  readonly pathOps: PathOps;
}) => Promise<BacklogStatusModel> | BacklogStatusModel;

interface ReadOnlyFileSystem {
  readonly fs: FileSystem;
  readonly writeCalls: readonly string[];
}

const tempDirs: TestDir[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    dir.cleanup();
  }
});

async function loadBuilder(): Promise<BuildBacklogStatusModel> {
  const mod = await import("../../../src/cli/backlog-status-model.js") as {
    readonly buildBacklogStatusModel?: unknown;
  };
  expect(mod.buildBacklogStatusModel).toEqual(expect.any(Function));
  return mod.buildBacklogStatusModel as BuildBacklogStatusModel;
}

function makeTempDir(prefix: string): TestDir {
  const dir = createTestDir(prefix);
  tempDirs.push(dir);
  return dir;
}

function writeFixtureFile(root: string, relativePath: string, content: string): void {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, "utf-8");
}

function backlogCard(fields: string, body = "Body\n"): string {
  return `---\n${fields.trim()}\n---\n\n${body}`;
}

function createReadOnlyFileSystem(): ReadOnlyFileSystem {
  const writeCalls: string[] = [];
  function readFile(filePath: string, encoding: "utf-8"): Promise<string>;
  function readFile(filePath: string): Promise<Buffer>;
  function readFile(filePath: string, encoding?: "utf-8"): Promise<string | Buffer> {
    if (encoding === "utf-8") {
      return realFs.readFile(filePath, encoding);
    }
    return realFs.readFile(filePath);
  }

  const readOnlyFs: FileSystem = {
    readFile,
    readdir(filePath: string): Promise<string[]> {
      return realFs.readdir(filePath);
    },
    writeFile(filePath: string): Promise<void> {
      writeCalls.push(`writeFile:${filePath}`);
      throw new Error(`Unexpected writeFile during backlog-status model build: ${filePath}`);
    },
    appendFile(filePath: string): Promise<void> {
      writeCalls.push(`appendFile:${filePath}`);
      throw new Error(`Unexpected appendFile during backlog-status model build: ${filePath}`);
    },
    mkdir(filePath: string): Promise<void> {
      writeCalls.push(`mkdir:${filePath}`);
      throw new Error(`Unexpected mkdir during backlog-status model build: ${filePath}`);
    },
    stat(filePath: string): Promise<{ size: number }> {
      return realFs.stat(filePath);
    },
    readFileSync(filePath: string, encoding: "utf-8"): string {
      return realFs.readFileSync(filePath, encoding);
    },
  };

  return { fs: readOnlyFs, writeCalls };
}

function createSyntheticMethodTree(root: string): void {
  writeFixtureFile(root, "docs/method/backlog/asap/CORE_dependency.md", backlogCard(`
title: "Dependency"
lane: asap
legend: CORE
feature: core
kind: leaf
effort: S
`));

  writeFixtureFile(root, "docs/method/backlog/asap/CORE_blocked.md", backlogCard(`
title: "Blocked by dependency"
lane: asap
legend: CORE
feature: core
kind: leaf
effort: S
blocked_by:
  - CORE_dependency
`));

  writeFixtureFile(root, "docs/method/backlog/asap/CORE_external.md", backlogCard(`
title: "Externally blocked"
lane: asap
legend: CORE
feature: core
kind: leaf
effort: S
blocked_by_external:
  - vendor-runtime
`));

  writeFixtureFile(root, "docs/method/backlog/asap/CORE_unresolved.md", backlogCard(`
title: "Unresolved dependency"
lane: asap
legend: CORE
feature: core
kind: leaf
effort: S
blocked_by:
  - CORE_missing
`));

  writeFixtureFile(root, "docs/method/backlog/up-next/CORE_mismatch.md", backlogCard(`
title: "Mismatched lane"
lane: asap
legend: CORE
feature: core
kind: leaf
effort: S
`));

  writeFixtureFile(root, "docs/design/CORE_active-design.md", backlogCard(`
title: "Active design"
feature: core
kind: leaf
legend: CORE
status: design
source_lane: asap
`));

  writeFixtureFile(root, "docs/design/CORE_done.md", backlogCard(`
title: "Completed design"
feature: core
kind: leaf
legend: CORE
status: completed
source_lane: asap
`));

  writeFixtureFile(root, "docs/method/retro/CORE_done/retro.md", "# CORE_done retro\n\nCompleted.\n");
  writeFixtureFile(root, "docs/method/backlog/dependency-dag.dot", "digraph backlog_dependencies {}\n");
}

function findItem(model: BacklogStatusModel, id: string): BacklogStatusItem {
  const item = model.items.find((candidate) => candidate.id === id);
  expect(item).toBeDefined();
  return item!;
}

describe("backlog status model", () => {
  it("builds from an explicit temp root without depending on process.cwd() or writing files", async () => {
    const buildBacklogStatusModel = await loadBuilder();
    const explicitRoot = makeTempDir("graft-backlog-status-root-");
    const cwdTrap = makeTempDir("graft-backlog-status-cwd-trap-");
    createSyntheticMethodTree(explicitRoot.path);
    writeFixtureFile(cwdTrap.path, "docs/method/backlog/asap/CWD_SHOULD_NOT_APPEAR.md", backlogCard(`
title: "Wrong root"
lane: asap
legend: CORE
feature: core
kind: leaf
effort: S
`));
    const { fs: readOnlyFs, writeCalls } = createReadOnlyFileSystem();
    const originalCwd = process.cwd();

    process.chdir(cwdTrap.path);
    try {
      const model = await buildBacklogStatusModel({
        root: explicitRoot.path,
        fs: readOnlyFs,
        pathOps: nodePathOps,
      });

      expect(model.summary.activeBacklogByLane).toMatchObject({ asap: 4, "up-next": 1 });
      expect(model.items.map((item) => item.id)).not.toContain("CWD_SHOULD_NOT_APPEAR");
      expect(writeCalls).toEqual([]);
    } finally {
      process.chdir(originalCwd);
    }
  });

  it("reports unresolved dependencies and lane/frontmatter mismatches from synthetic METHOD files", async () => {
    const buildBacklogStatusModel = await loadBuilder();
    const explicitRoot = makeTempDir("graft-backlog-status-warnings-");
    createSyntheticMethodTree(explicitRoot.path);

    const model = await buildBacklogStatusModel({
      root: explicitRoot.path,
      fs: createReadOnlyFileSystem().fs,
      pathOps: nodePathOps,
    });

    expect(model.summary).toMatchObject({
      blockedInternalCount: 1,
      blockedExternalCount: 1,
      unresolvedDependencyReferenceCount: 1,
    });
    expect(findItem(model, "CORE_blocked")).toMatchObject({
      status: "blocked_internal",
      blockedBy: ["CORE_dependency"],
      sourcePath: "docs/method/backlog/asap/CORE_blocked.md",
    });
    expect(findItem(model, "CORE_external")).toMatchObject({
      status: "blocked_external",
      blockedByExternal: ["vendor-runtime"],
      sourcePath: "docs/method/backlog/asap/CORE_external.md",
    });
    expect(findItem(model, "CORE_mismatch")).toMatchObject({
      status: "stale_metadata",
      lane: "up-next",
      frontmatterLane: "asap",
      sourcePath: "docs/method/backlog/up-next/CORE_mismatch.md",
    });
    expect(model.warnings).toContainEqual(expect.objectContaining({
      type: "unresolved_dependency_ref",
      itemId: "CORE_unresolved",
      field: "blocked_by",
      ref: "CORE_missing",
    }));
    expect(model.warnings).toContainEqual(expect.objectContaining({
      type: "lane_frontmatter_mismatch",
      itemId: "CORE_mismatch",
      expectedLane: "up-next",
      actualLane: "asap",
    }));
  });

  it("detects completed retros separately from active design cycles", async () => {
    const buildBacklogStatusModel = await loadBuilder();
    const explicitRoot = makeTempDir("graft-backlog-status-completed-");
    createSyntheticMethodTree(explicitRoot.path);

    const model = await buildBacklogStatusModel({
      root: explicitRoot.path,
      fs: createReadOnlyFileSystem().fs,
      pathOps: nodePathOps,
    });

    expect(model.summary).toMatchObject({
      activeDesignCount: 1,
      completedRetroCount: 1,
    });
    expect(findItem(model, "CORE_active-design")).toMatchObject({
      status: "active_design",
      sourcePath: "docs/design/CORE_active-design.md",
    });
    expect(findItem(model, "CORE_done")).toMatchObject({
      status: "completed",
      sourcePath: "docs/design/CORE_done.md",
      retroPath: "docs/method/retro/CORE_done/retro.md",
    });
  });
});
