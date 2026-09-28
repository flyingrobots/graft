import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterAll } from "vitest";

// Sidecar storage refuses symlink-aliased graph roots, and tests derive graph
// roots from the temp directory. Canonicalize it first (macOS aliases /var to
// /private/var) so everything below, and every spawned process, sees one path.
process.env["TMPDIR"] = fs.realpathSync.native(os.tmpdir());

// Product defaults such as the WARP graph root (~/.graft/graphs) and the daemon
// root (~/.graft/daemon) derive from HOME. Point HOME at a private per-file
// directory so no test, or process it spawns, writes into the developer's home.
const testHome = fs.mkdtempSync(path.join(os.tmpdir(), "graft-test-home-"));
process.env["HOME"] = testHome;

afterAll(() => {
  fs.rmSync(testHome, { recursive: true, force: true });
});
