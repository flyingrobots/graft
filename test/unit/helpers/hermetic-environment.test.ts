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
});
