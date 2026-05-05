import { describe, expect, it } from "vitest";
import type { GitClient } from "../../../src/ports/git.js";
import {
  compareGitVersions,
  ensureGitVersionSupportsGraft,
  parseGitVersion,
} from "../../../src/git/version-guard.js";

function fakeGit(stdout: string, status = 0, stderr = ""): GitClient {
  return {
    run: () => Promise.resolve({
      status,
      stdout,
      stderr,
    }),
  };
}

describe("git version guard", () => {
  it("parses common Git version output", () => {
    expect(parseGitVersion("git version 2.53.0")).toEqual({ major: 2, minor: 53, patch: 0 });
    expect(parseGitVersion("git version 2.39.3 (Apple Git-145)")).toEqual({
      major: 2,
      minor: 39,
      patch: 3,
    });
    expect(parseGitVersion("git version 2.42.windows.1")).toEqual({
      major: 2,
      minor: 42,
      patch: 0,
    });
  });

  it("orders semantic Git versions", () => {
    expect(compareGitVersions(
      { major: 2, minor: 31, patch: 0 },
      { major: 2, minor: 30, patch: 9 },
    )).toBeGreaterThan(0);
    expect(compareGitVersions(
      { major: 2, minor: 31, patch: 0 },
      { major: 2, minor: 31, patch: 0 },
    )).toBe(0);
  });

  it("rejects Git versions below the required plumbing baseline", async () => {
    await expect(ensureGitVersionSupportsGraft({
      git: fakeGit("git version 2.30.9"),
      minimum: { major: 2, minor: 31, patch: 0 },
    })).rejects.toThrow("Git 2.31.0 or newer is required");
  });

  it("accepts Git versions that satisfy the required plumbing baseline", async () => {
    await expect(ensureGitVersionSupportsGraft({
      git: fakeGit("git version 2.31.0"),
      minimum: { major: 2, minor: 31, patch: 0 },
    })).resolves.toBeUndefined();
  });
});
