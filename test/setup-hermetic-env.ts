import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterAll } from "vitest";

// Product defaults such as the WARP graph root (~/.graft/graphs) and the daemon
// root (~/.graft/daemon) derive from HOME. Point HOME at a private per-file
// directory so no test, or process it spawns, writes into the developer's home.
const testHome = fs.mkdtempSync(path.join(os.tmpdir(), "graft-test-home-"));
process.env["HOME"] = testHome;

afterAll(() => {
  fs.rmSync(testHome, { recursive: true, force: true });
});
