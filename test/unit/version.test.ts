import { describe, expect, it } from "vitest";
import packageJson from "../../package.json";
import { GRAFT_VERSION } from "../../src/version.js";

describe("GRAFT_VERSION", () => {
  it("matches package.json", () => {
    expect(GRAFT_VERSION).toBe(packageJson.version);
  });
});
