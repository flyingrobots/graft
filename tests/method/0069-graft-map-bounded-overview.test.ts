import { describe, it } from "vitest";
import {
  expectGraftMapDepthOverviewPlayback,
  expectGraftMapSummaryPlayback,
} from "../../test/helpers/graft-map-playback.js";

describe("0069 graft_map bounded overview playback", () => {
  it("graft_map depth 0 returns direct files and summarized child directories for one-call orientation", async () => {
    await expectGraftMapDepthOverviewPlayback();
  });

  it("graft_map summary mode reports symbol counts without emitting per-symbol payloads", async () => {
    await expectGraftMapSummaryPlayback();
  });
});
