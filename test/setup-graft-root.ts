import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterAll } from "vitest";

// Every per-user Graft default derives from GRAFT_ROOT_PATH (src/adapters/graft-root.ts).
// Point it at a private per-file directory so no test, or process it spawns,
// writes into the developer's real ~/.graft. HOME is left alone: git, ssh and gh
// read it too.
const testRoot = fs.mkdtempSync(path.join(os.tmpdir(), "graft-test-root-"));
process.env["GRAFT_ROOT_PATH"] = testRoot;

afterAll(() => {
  fs.rmSync(testRoot, { recursive: true, force: true });
});
