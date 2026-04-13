import { describe, expect, it } from "vitest";
import { renderActivityView } from "../../../src/cli/activity-render.js";

describe("activity renderer", () => {
  it("rejects malformed diag activity payloads at the renderer boundary", () => {
    expect(() => renderActivityView({} as never)).toThrow();
  });
});
