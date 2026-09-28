import * as fs from "node:fs";
import * as os from "node:os";

// Graft resolves graph roots to their real path, and many tests compare the
// paths Graft reports with paths they built from the temp directory. macOS
// aliases /var to /private/var, so canonicalize the temp directory first;
// everything below, and every process a test spawns, then sees one spelling of
// it. Only the spelling changes: it is
// the same directory. HOME is not touched.
process.env["TMPDIR"] = fs.realpathSync.native(os.tmpdir());
