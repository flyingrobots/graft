import { afterEach, describe, expect, it, vi } from "vitest";
import { runCli } from "../../../src/cli/main.js";
import { parseDaemonInspect } from "../../../src/cli/daemon-inspect.js";
import { renderDaemonInspection } from "../../../src/cli/daemon-inspect-render.js";
import { createBufferWriter } from "../../helpers/init.js";

afterEach(() => { process.exitCode = 0; });
describe("single-frame inspection CLI", () => {
  it("passes identity filters without workspace discovery and accepts only bounded options", () => {
    expect(parseDaemonInspect("/tmp", ["--workspace", "worktree:a", "--limit", "7", "--socket", "d.sock", "--json"])).toEqual({
      socketPath: "/tmp/d.sock", json: true, request: { workspaceId: "worktree:a", limit: 7 },
    });
    for (const args of [["--limit", "101"], ["--limit", "2x"], ["--session", "s", "--repo", "r"], ["--json", "--json"], ["--watch"], ["--socket", "--json"]]) expect(() => parseDaemonInspect("/tmp", args)).toThrow();
  });
  it("does not start a daemon or check Git to emit an explicit no-daemon JSON result", async () => {
    const stdout = createBufferWriter();
    const forbidden = vi.fn(() => { throw new Error("forbidden"); });
    const inspectDaemon = vi.fn((_options: import("../../../src/adapters/local-daemon-inspection-client.js").InspectDaemonOptions) => Promise.resolve({ status: "no_daemon" as const, clientVersion: "client", reason: "NO_DAEMON_LISTENING" }));
    await runCli({ args: ["daemon", "inspect", "--json", "--session", "s"], stdout, startDaemon: forbidden, ensureGitVersion: forbidden, readDaemonStatus: forbidden, inspectDaemon });
    expect(forbidden).not.toHaveBeenCalled();
    expect(inspectDaemon.mock.calls[0]?.[0]).toMatchObject({ request: { sessionId: "s" } });
    expect(JSON.parse(stdout.text())).toEqual({ status: "no_daemon", clientVersion: "client", reason: "NO_DAEMON_LISTENING" });
    expect(process.exitCode).toBe(1);
  });
  it("never lets hostile text escape as terminal control sequences", () => {
    const frame = renderDaemonInspection({ status: "unsupported", clientVersion: "evil\u001b[2J", reason: "password=secret" }, "2026-09-07T00:00:00Z");
    expect(frame).not.toContain("\u001b");
    expect(frame).not.toContain("password=secret");
  });
});
