import * as os from "node:os";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { ensureDaemonReady } from "../../../src/mcp/daemon-stdio-bridge.js";

describe("mcp: daemon stdio bridge", () => {
  it("returns immediately when the daemon is already healthy", async () => {
    let spawns = 0;
    const socketPath = path.join(os.tmpdir(), "graft-daemon-ready.sock");

    const resolved = await ensureDaemonReady({
      socketPath,
      healthCheck: () => Promise.resolve(true),
      spawnDaemon: () => {
        spawns += 1;
        return undefined;
      },
    });

    expect(resolved).toBe(path.resolve(socketPath));
    expect(spawns).toBe(0);
  });

  it("spawns and waits for daemon readiness when missing", async () => {
    let healthy = false;
    let spawns = 0;

    const resolved = await ensureDaemonReady({
      socketPath: path.join(os.tmpdir(), "graft-daemon-autostart.sock"),
      pollIntervalMs: 1,
      timeoutMs: 200,
      healthCheck: () => Promise.resolve(healthy),
      spawnDaemon: () => {
        spawns += 1;
        setTimeout(() => {
          healthy = true;
        }, 5);
        return undefined;
      },
    });

    expect(resolved).toBe(path.resolve(path.join(os.tmpdir(), "graft-daemon-autostart.sock")));
    expect(spawns).toBe(1);
  });

  it("fails clearly when the daemon is missing and auto-start is disabled", async () => {
    await expect(ensureDaemonReady({
      socketPath: path.join(os.tmpdir(), "graft-daemon-missing.sock"),
      spawnIfMissing: false,
      healthCheck: () => Promise.resolve(false),
    })).rejects.toThrow("No graft daemon is listening");
  });
});
