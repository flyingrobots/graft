import * as path from "node:path";
import { fileURLToPath } from "node:url";
import type { TestProject } from "vitest/node";
import { keepDistFresh, tscBuild } from "./helpers/fresh-dist.js";

// Runs once per Vitest project, before any worker starts, so no test executes a missing or stale
// dist/; in watch mode it also rechecks before every rerun. Design: docs/design/CLEAN_tests-fresh-dist.md.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export default async function setup(project: TestProject): Promise<void> {
  await keepDistFresh(project, { root: ROOT, build: tscBuild });
}
