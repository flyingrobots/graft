import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureFreshDist, tscBuild } from "./helpers/fresh-dist.js";

// Runs once per Vitest process, before any worker starts, so no test executes a missing or stale
// dist/. Design: docs/design/CLEAN_tests-fresh-dist.md.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export default async function setup(): Promise<void> {
  await ensureFreshDist({ root: ROOT, build: tscBuild });
}
