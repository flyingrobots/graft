import { expect, it, vi } from "vitest";
import { RuntimeEventLogger } from "../../../src/mcp/runtime-observability.js";
import { WorkspaceRouter } from "../../../src/mcp/workspace-router.js";
import { createIsolatedServer } from "../../helpers/mcp.js";

function gate() {
  let resolve!: () => void;
  const promise = new Promise<void>((finish) => { resolve = finish; });
  return { promise, resolve };
}

// Medium: owned scratch directory. Oracle: release settles all owned obligations
// before reporting failure. Explicit barriers control both resource boundaries.
it("waits for startup logging before reporting router cleanup failure", async () => {
  const loggingStarted = gate();
  const finishLogging = gate();
  const cleanupFailure = new Error("injected router cleanup failure");
  let logged = false;
  vi.spyOn(RuntimeEventLogger.prototype, "log").mockImplementation(async () => {
    loggingStarted.resolve();
    await finishLogging.promise;
    logged = true;
  });
  vi.spyOn(WorkspaceRouter.prototype, "releaseWarpLeases").mockRejectedValue(cleanupFailure);
  const isolated = createIsolatedServer({ mode: "daemon", runtimeObservability: { enabled: true } });
  try {
    await loggingStarted.promise;
    let settledBeforeLogging = false;
    const released = isolated.server.releaseWarpLeases().catch((error: unknown) => {
      settledBeforeLogging = !logged;
      return error;
    });
    // Drain the microtasks from the deliberately rejected cleanup before
    // allowing the independent logging obligation to finish. No timed sleep.
    await new Promise<void>((resolve) => setImmediate(resolve));
    finishLogging.resolve();
    const failure = await released;
    expect(settledBeforeLogging).toBe(false);
    expect(failure).toMatchObject({ errors: [cleanupFailure] });
  } finally {
    finishLogging.resolve();
    isolated.cleanup();
    vi.restoreAllMocks();
  }
});

it("keeps logging failure best-effort while awaiting router cleanup", async () => {
  const loggingStarted = gate();
  const finishCleanup = gate();
  vi.spyOn(RuntimeEventLogger.prototype, "log").mockImplementation(() => {
    loggingStarted.resolve();
    return Promise.reject(new Error("injected log failure"));
  });
  vi.spyOn(WorkspaceRouter.prototype, "releaseWarpLeases").mockImplementation(() => finishCleanup.promise);
  const isolated = createIsolatedServer({ mode: "daemon", runtimeObservability: { enabled: true } });
  try {
    await loggingStarted.promise;
    let settled = false;
    const released = isolated.server.releaseWarpLeases().then(() => { settled = true; });
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(settled).toBe(false);
    finishCleanup.resolve();
    await expect(released).resolves.toBeUndefined();
    expect(settled).toBe(true);
  } finally {
    finishCleanup.resolve();
    isolated.cleanup();
    vi.restoreAllMocks();
  }
});
