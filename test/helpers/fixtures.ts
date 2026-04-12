import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SOURCE_FIXTURE_ROOT = path.join(REPO_ROOT, "test", "fixtures");

let sharedFixtureSandbox: string | null = null;
let sharedFixtureRoot: string | null = null;

function copyFixturesInto(projectRoot: string): string {
  const fixtureRoot = path.join(projectRoot, "fixtures");
  fs.cpSync(SOURCE_FIXTURE_ROOT, fixtureRoot, { recursive: true });
  return fixtureRoot;
}

function ensureSharedFixtureRoot(): string {
  if (sharedFixtureRoot !== null) {
    return sharedFixtureRoot;
  }
  sharedFixtureSandbox = fs.mkdtempSync(path.join(os.tmpdir(), "graft-test-fixtures-"));
  sharedFixtureRoot = copyFixturesInto(sharedFixtureSandbox);
  return sharedFixtureRoot;
}

export function fixtureRoot(): string {
  return ensureSharedFixtureRoot();
}

export function fixturePath(relativePath: string): string {
  return path.join(ensureSharedFixtureRoot(), relativePath);
}

export function harnessPath(...segments: string[]): string {
  return path.join(REPO_ROOT, ...segments);
}

export interface FixtureWorkspace {
  cleanup(): void;
  fixturePath(relativePath: string): string;
  fixtureRoot: string;
  projectRoot: string;
}

export function createFixtureWorkspace(): FixtureWorkspace {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "graft-test-workspace-"));
  const isolatedFixtureRoot = copyFixturesInto(projectRoot);
  return {
    fixtureRoot: isolatedFixtureRoot,
    projectRoot,
    fixturePath(relativePath: string): string {
      return path.join(isolatedFixtureRoot, relativePath);
    },
    cleanup(): void {
      fs.rmSync(projectRoot, { recursive: true, force: true });
    },
  };
}

process.once("exit", () => {
  if (sharedFixtureSandbox !== null) {
    fs.rmSync(sharedFixtureSandbox, { recursive: true, force: true });
  }
});
