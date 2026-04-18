import { startDaemonBackedStdioBridge } from "../../src/mcp/daemon-stdio-bridge.js";

const socketPath = process.env["GRAFT_TEST_DAEMON_SOCKET"];
if (socketPath === undefined) {
  throw new Error("GRAFT_TEST_DAEMON_SOCKET is required");
}

await startDaemonBackedStdioBridge({
  socketPath,
  ensureReady: () => Promise.resolve(socketPath),
});
