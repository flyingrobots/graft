import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterAll } from "vitest";

// Every per-user Graft default derives from GRAFT_ROOT_PATH (src/adapters/graft-root.ts).
// Point it at a private per-file directory so no test, or process it spawns,
// writes into the developer's real ~/.graft. HOME is left alone: git, ssh and gh
// read it too.

/** HOME as this test process received it, recorded before anything below runs. */
export const homeBeforeSetup = process.env["HOME"];

/** The private Graft root this test file runs under. */
export const graftTestRoot = fs.mkdtempSync(path.join(os.tmpdir(), "graft-test-root-"));
process.env["GRAFT_ROOT_PATH"] = graftTestRoot;

afterAll(() => {
  fs.rmSync(graftTestRoot, { recursive: true, force: true });
});
