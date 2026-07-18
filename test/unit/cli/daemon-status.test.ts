import { describe, expect, it } from "vitest";
import { buildDaemonStatusProbeArguments } from "../../../src/cli/daemon-status.js";

describe("cli: daemon status probe compatibility", () => {
  it("omits the v2 receipt control when an older daemon does not advertise it", () => {
    expect(buildDaemonStatusProbeArguments(
      {
        type: "object",
        properties: {
          cwd: { type: "string" },
        },
      },
      { cwd: "/repo" },
    )).toEqual({ cwd: "/repo" });
  });

  it("requests a full receipt when the daemon advertises the v2 control", () => {
    expect(buildDaemonStatusProbeArguments(
      {
        type: "object",
        properties: {
          cwd: { type: "string" },
          receipt: { type: "string", enum: ["compact", "full"] },
        },
      },
      { cwd: "/repo" },
    )).toEqual({ cwd: "/repo", receipt: "full" });
  });
});
