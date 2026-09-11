import { describe, expect, it, vi } from "vitest";
import { closeDaemonResources } from "../../../src/mcp/daemon-server.js";

describe("mcp: daemon server shutdown", () => {
  it("attempts every cleanup stage before reporting aggregate failures", async () => {
    const sessionError = new Error("injected session cleanup failure");
    const workerError = new Error("injected worker cleanup failure");
    const closeSessionHost = vi.fn(() => Promise.reject(sessionError));
    const closeMonitorRuntime = vi.fn(() => Promise.resolve());
    const closeWorkerPool = vi.fn(() => Promise.reject(workerError));
    const closeHttpServer = vi.fn(() => Promise.resolve());
    const removeSocket = vi.fn(() => Promise.resolve());

    const closed = closeDaemonResources([
      { close: closeSessionHost },
      { close: closeMonitorRuntime },
      { close: closeWorkerPool },
      { close: closeHttpServer },
      { close: removeSocket },
    ]);

    await expect(closed).rejects.toEqual(expect.objectContaining({
      errors: [sessionError, workerError],
    }));
    expect(closeSessionHost).toHaveBeenCalledOnce();
    expect(closeMonitorRuntime).toHaveBeenCalledOnce();
    expect(closeWorkerPool).toHaveBeenCalledOnce();
    expect(closeHttpServer).toHaveBeenCalledOnce();
    expect(removeSocket).toHaveBeenCalledOnce();
  });
});
