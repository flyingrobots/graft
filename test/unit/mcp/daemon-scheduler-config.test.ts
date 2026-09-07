import { describe, expect, it } from "vitest";
import { resolveDaemonSchedulerConfig } from "../../../src/mcp/daemon-scheduler-config.js";

describe("mcp: daemon scheduler config", () => {
  it("Does an operator who sets no environment still get the conservative default?", () => {
    expect(resolveDaemonSchedulerConfig({ env: {} }).maxConcurrentJobs).toBe(2);
  });

  it("Can an operator raise daemon job concurrency without editing an installed package?", () => {
    const config = resolveDaemonSchedulerConfig({
      env: { GRAFT_MAX_CONCURRENT_JOBS: "10" },
    });
    expect(config.maxConcurrentJobs).toBe(10);
  });

  it("Does a value that cannot mean a job count fall back rather than crash the daemon?", () => {
    for (const value of [ "0", "-3", "banana", "", "  ", "1.5.2" ]) {
      expect(
        resolveDaemonSchedulerConfig({ env: { GRAFT_MAX_CONCURRENT_JOBS: value } })
          .maxConcurrentJobs,
      ).toBe(2);
    }
  });

  it("Is a fractional value truncated rather than passed to a scheduler that refuses it?", () => {
    expect(
      resolveDaemonSchedulerConfig({ env: { GRAFT_MAX_CONCURRENT_JOBS: "4.9" } })
        .maxConcurrentJobs,
    ).toBe(4);
  });

  it("Does an explicit override beat the environment, so a caller can still pin it?", () => {
    const config = resolveDaemonSchedulerConfig({
      env: { GRAFT_MAX_CONCURRENT_JOBS: "10" },
      overrides: { maxConcurrentJobs: 3 },
    });
    expect(config.maxConcurrentJobs).toBe(3);
  });
});
