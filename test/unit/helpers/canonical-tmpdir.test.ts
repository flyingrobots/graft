import * as fs from "node:fs";
import * as os from "node:os";
import { describe, expect, it } from "vitest";
import { graftTestRoot } from "../../setup-graft-root.js";

// Oracle: sidecar storage refuses symlink-aliased graph roots by contract, so
// the temp directory tests derive graph roots from, and the suite's Graft root
// inside it, must already be canonical (macOS aliases /var to /private/var).
describe("test harness: canonical temp directory", () => {
  it("exposes a canonical temp directory", () => {
    expect(os.tmpdir()).toBe(fs.realpathSync.native(os.tmpdir()));
  });

  it("creates the suite's Graft root at its canonical path", () => {
    expect(graftTestRoot).toBe(fs.realpathSync.native(graftTestRoot));
  });
});
