import * as fs from "node:fs";
import * as os from "node:os";

// Sidecar storage refuses a graph root reached through a symlink alias, and
// tests derive graph roots, including the Graft root that test/setup-graft-root.ts
// creates, from the temp directory. macOS aliases /var to /private/var, so
// canonicalize the temp directory first; everything below, and every process a
// test spawns, then sees one spelling of it. Only the spelling changes: it is
// the same directory. HOME is not touched.
process.env["TMPDIR"] = fs.realpathSync.native(os.tmpdir());
