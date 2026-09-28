import * as fs from "node:fs";
import { expect, it, vi } from "vitest";
import { InlineDaemonWorkerPool } from "../../../src/mcp/daemon-worker-pool.js";
import { PersistentMonitorRuntime } from "../../../src/mcp/persistent-monitor-runtime.js";
import { createInProcessDaemonHarness } from "../../helpers/daemon.js";

// Oracle: daemon harness resource ownership ends even if one session fails.
it("settles all daemon harness resources after a session release fails", async () => {
  const harness = await createInProcessDaemonHarness();
  const first = harness.createSession();
  const second = harness.createSession();
  const failure = new Error("injected session release failure");
  const releaseFirst = first.server.releaseWarpLeases.bind(first.server);
  vi.spyOn(first.server, "releaseWarpLeases").mockImplementation(async () => {
    await releaseFirst();
    throw failure;
  });
  const releaseSecond = vi.spyOn(second.server, "releaseWarpLeases");
  const closeMonitors = vi.spyOn(PersistentMonitorRuntime.prototype, "close");
  const closeWorkers = vi.spyOn(InlineDaemonWorkerPool.prototype, "close");
  try {
    const error: unknown = await harness.close().catch((reason: unknown) => reason);
    expect(fs.existsSync(harness.rootDir)).toBe(false);
    expect(releaseSecond).toHaveBeenCalledOnce();
    expect(closeMonitors).toHaveBeenCalledOnce();
    expect(closeWorkers).toHaveBeenCalledOnce();
    expect(error).toMatchObject({ errors: [failure] });
  } finally {
    vi.restoreAllMocks();
    await harness.close();
  }
});
