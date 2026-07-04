import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("Wesley projection contract", () => {
  it("does not depend on the Edict projection contract", () => {
    const source = fs.readFileSync(
      new URL("../../../src/operations/wesley-projection.ts", import.meta.url),
      "utf8",
    );

    expect(source).not.toContain("./edict-projection.js");
  });
});
