import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { runCli } from "../../src/cli/main.js";
import { cleanupTestRepo, createTestRepo } from "../../test/helpers/git.js";
import { createBufferWriter } from "../../test/helpers/init.js";

async function runCooldown(repoDir: string, args: readonly string[]): Promise<{ stdout: string; stderr: string }> {
  const stdout = createBufferWriter();
  const stderr = createBufferWriter();
  await runCli({ cwd: repoDir, args, stdout, stderr });
  return { stdout: stdout.text(), stderr: stderr.text() };
}

function writeCommentsFixture(repoDir: string): string {
  const commentsFile = "comments.json";
  fs.writeFileSync(path.join(repoDir, commentsFile), JSON.stringify({
    comments: [
      {
        author: { login: "coderabbitai" },
        body: "Rate limit exceeded. Please retry in 30 minutes.",
        createdAt: "2026-05-05T15:00:00.000Z",
        updatedAt: "2026-05-05T15:00:00.000Z",
      },
    ],
  }));
  return commentsFile;
}

describe("SURFACE_review-cooldown-status playback", () => {
  it("Can I see whether the automated review loop is still in cooldown?", async () => {
    const repoDir = createTestRepo("graft-review-cooldown-playback-");
    try {
      const commentsFile = writeCommentsFixture(repoDir);

      const result = await runCooldown(repoDir, [
        "review",
        "cooldown",
        "--comments-file",
        commentsFile,
        "--now",
        "2026-05-05T15:10:00.000Z",
      ]);

      expect(result.stderr).toBe("");
      expect(result.stdout).toContain("Graft Review Cooldown");
      expect(result.stdout).toContain("status: cooldown");
      expect(result.stdout).toContain("reviewer: coderabbitai");
      expect(result.stdout).toContain("remaining: 20m");
      expect(result.stdout.trimStart().startsWith("{")).toBe(false);
    } finally {
      cleanupTestRepo(repoDir);
    }
  });

  it("Can agents request schema-validated cooldown facts from the same comments?", async () => {
    const repoDir = createTestRepo("graft-review-cooldown-json-");
    try {
      const commentsFile = writeCommentsFixture(repoDir);

      const result = await runCooldown(repoDir, [
        "review",
        "cooldown",
        "--comments-file",
        commentsFile,
        "--now",
        "2026-05-05T15:10:00.000Z",
        "--json",
      ]);

      expect(result.stderr).toBe("");
      const parsed = JSON.parse(result.stdout) as {
        _schema: { id: string };
        status: string;
        markerFound: boolean;
        cooldownExpiresAt: string;
        remainingMs: number;
      };
      expect(parsed._schema.id).toBe("graft.cli.review_cooldown");
      expect(parsed.status).toBe("cooldown");
      expect(parsed.markerFound).toBe(true);
      expect(parsed.cooldownExpiresAt).toBe("2026-05-05T15:30:00.000Z");
      expect(parsed.remainingMs).toBe(1_200_000);
    } finally {
      cleanupTestRepo(repoDir);
    }
  });
});
