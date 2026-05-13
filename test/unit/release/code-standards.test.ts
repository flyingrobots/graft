import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

describe("repository code standards", () => {
  it("keeps the Code Lawyer standards discoverable from agent orientation", () => {
    const standards = readRepoFile("CODE_STANDARDS.md");
    const agents = readRepoFile("AGENTS.md");

    expect(standards).toContain("# CODE_STANDARDS");
    expect(standards).toContain("Code Lawyer");
    expect(standards).toContain("Phase 0: Lockdown");
    expect(standards).toContain("Auth error — run `gh auth login` and retry.");
    expect(standards).toContain("Merge Gate");
    expect(agents).toContain("CODE_STANDARDS.md");
  });
});
