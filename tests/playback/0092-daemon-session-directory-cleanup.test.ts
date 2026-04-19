import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createInProcessDaemonHarness, type InProcessDaemonHarness } from "../../test/helpers/daemon.js";

let harness: InProcessDaemonHarness | undefined;

afterEach(async () => {
  if (harness !== undefined) {
    await harness.close();
    harness = undefined;
  }
});

describe("0092 daemon session directory cleanup", () => {
  it("removes the session graft directory when a session is closed", async () => {
    harness = await createInProcessDaemonHarness();
    const session = harness.createSession();
    const sessionDir = session.graftDir;

    expect(fs.existsSync(sessionDir)).toBe(true);

    session.close();

    expect(fs.existsSync(sessionDir)).toBe(false);
  });

  it("removes all session directories when the daemon harness is closed", async () => {
    harness = await createInProcessDaemonHarness();
    const session1 = harness.createSession();
    const session2 = harness.createSession();
    const dir1 = session1.graftDir;
    const dir2 = session2.graftDir;

    expect(fs.existsSync(dir1)).toBe(true);
    expect(fs.existsSync(dir2)).toBe(true);

    await harness.close();

    // The root dir is removed by harness.close(), which includes all session dirs
    expect(fs.existsSync(dir1)).toBe(false);
    expect(fs.existsSync(dir2)).toBe(false);

    harness = undefined; // Already closed
  });

  it("the sessions directory itself survives after individual session cleanup", async () => {
    harness = await createInProcessDaemonHarness();
    const session = harness.createSession();
    const sessionsParent = path.dirname(session.graftDir);

    session.close();

    // The parent `sessions/` directory should still exist even after session removal
    expect(fs.existsSync(sessionsParent)).toBe(true);
  });
});
