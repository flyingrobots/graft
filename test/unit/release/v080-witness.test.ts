import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function readReleaseWitness(): string {
  return fs.readFileSync(path.join(ROOT, "docs/method/releases/v0.8.0/verification.md"), "utf8");
}

describe("v0.8.0 release witness", () => {
  it("records the pushed release blocker branch instead of stale pending sync text", () => {
    const witness = readReleaseWitness();

    expect(witness).toContain(
      "- Release blocker branch synced with origin: yes, `origin/release/v0.8.0-blockers`",
    );
    expect(witness).not.toContain("Release blocker branch synced with origin: pending");
  });
});
