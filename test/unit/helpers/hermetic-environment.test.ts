import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { defaultWarpGraphRoot } from "../../../src/warp/sidecar.js";

function isWithin(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

// Oracle: TESTING_STANDARDS rule 8. The account database (os.userInfo) names the
// developer's real home independently of HOME; no test may default into it.
describe("test harness: hermetic environment", () => {
  it("resolves the default WARP graph root outside the real user home", () => {
    expect(isWithin(os.userInfo().homedir, defaultWarpGraphRoot())).toBe(false);
  });

  // Oracle: sidecar storage refuses symlink-aliased graph roots by contract, so
  // graph roots that tests derive from the temp directory must start canonical
  // (macOS aliases /var to /private/var).
  it("exposes a canonical temp directory", () => {
    expect(os.tmpdir()).toBe(fs.realpathSync.native(os.tmpdir()));
  });
});
