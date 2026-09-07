import { describe, expect, it } from "vitest";
import {
  MINIMUM_MAX_CONCURRENT_JOBS,
  deriveMaxConcurrentJobs,
  resolveDaemonSchedulerConfig,
} from "../../../src/mcp/daemon-scheduler-config.js";

describe("mcp: daemon scheduler config", () => {
  it("Does a bigger machine get more lanes without anyone configuring anything?", () => {
    expect(deriveMaxConcurrentJobs(10)).toBe(9);
    expect(deriveMaxConcurrentJobs(16)).toBe(15);
    expect(deriveMaxConcurrentJobs(64)).toBe(63);
  });

  it("Is one lane left for the human whose machine this is?", () => {
    // The daemon is background work on a machine someone is using. Taking
    // every lane is how a background service becomes the reason an editor
    // stutters.
    for (const cores of [ 8, 12, 32 ]) {
      expect(deriveMaxConcurrentJobs(cores)).toBe(cores - 1);
    }
  });

  it("Is a small machine never worse off than when the number was hardcoded?", () => {
    // 2 was the hardcoded default. A one- or two-core box must not regress
    // to 1 just because the number became derived.
    expect(deriveMaxConcurrentJobs(1)).toBe(MINIMUM_MAX_CONCURRENT_JOBS);
    expect(deriveMaxConcurrentJobs(2)).toBe(MINIMUM_MAX_CONCURRENT_JOBS);
    expect(deriveMaxConcurrentJobs(3)).toBe(MINIMUM_MAX_CONCURRENT_JOBS);
  });

  it("Does a machine that reports nothing sensible still start a working daemon?", () => {
    for (const reported of [ 0, -4, Number.NaN, Number.POSITIVE_INFINITY ]) {
      expect(deriveMaxConcurrentJobs(reported)).toBe(MINIMUM_MAX_CONCURRENT_JOBS);
    }
  });

  it("Does the resolver read the machine rather than any ambient configuration?", () => {
    const config = resolveDaemonSchedulerConfig({ availableParallelism: () => 10 });
    expect(config.maxConcurrentJobs).toBe(9);
  });

  it("Can a caller still pin the number through the API it already had?", () => {
    const config = resolveDaemonSchedulerConfig({
      availableParallelism: () => 10,
      overrides: { maxConcurrentJobs: 3 },
    });
    expect(config.maxConcurrentJobs).toBe(3);
  });

  it("Is an environment variable ignored, so a stale number cannot outlive its machine?", () => {
    // Asserted behaviourally, not by reading this module's source for
    // `process.env`. A source scan breaks when the file moves and passes when
    // an environment read is added somewhere else; setting the variable and
    // observing that nothing changes is the actual promise.
    const previous = process.env["GRAFT_MAX_CONCURRENT_JOBS"];
    process.env["GRAFT_MAX_CONCURRENT_JOBS"] = "64";
    try {
      expect(
        resolveDaemonSchedulerConfig({ availableParallelism: () => 10 })
          .maxConcurrentJobs,
      ).toBe(9);
    } finally {
      if (previous === undefined) delete process.env["GRAFT_MAX_CONCURRENT_JOBS"];
      else process.env["GRAFT_MAX_CONCURRENT_JOBS"] = previous;
    }
  });
});
