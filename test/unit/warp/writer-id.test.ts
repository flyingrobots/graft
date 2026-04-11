import { describe, expect, it } from "vitest";
import {
  DEFAULT_WARP_WRITER_ID,
  buildMonitorWarpWriterId,
  buildSessionWarpWriterId,
  buildWarpWriterId,
} from "../../../src/warp/writer-id.js";

describe("warp: writer id", () => {
  it("keeps the default writer id stable", () => {
    expect(DEFAULT_WARP_WRITER_ID).toBe("graft");
  });

  it("builds stable writer ids from logical lane and scope", () => {
    const first = buildWarpWriterId("monitor", "repo:abc123");
    const second = buildWarpWriterId("monitor", "repo:abc123");

    expect(first).toBe(second);
    expect(first).toMatch(/^graft_monitor_[a-f0-9]{12}$/);
  });

  it("normalizes unsafe lane names without leaking raw scope into refs", () => {
    const writerId = buildWarpWriterId("Monitor Lane/Primary", "repo:/tmp/demo");

    expect(writerId).toMatch(/^graft_monitor_lane_primary_[a-f0-9]{12}$/);
    expect(writerId).not.toContain("/tmp/demo");
    expect(writerId).not.toContain("/");
    expect(writerId).not.toContain(":");
  });

  it("uses different writer ids for different scopes", () => {
    const left = buildWarpWriterId("monitor", "repo:left");
    const right = buildWarpWriterId("monitor", "repo:right");

    expect(left).not.toBe(right);
  });

  it("Are WARP writer identities stable and meaningful, rather than tied to incidental worker-process IDs?", () => {
    expect(buildSessionWarpWriterId("session-123")).toMatch(/^graft_session_[a-f0-9]{12}$/);
    expect(buildMonitorWarpWriterId("repo:abc123")).toMatch(/^graft_monitor_[a-f0-9]{12}$/);
  });
});
