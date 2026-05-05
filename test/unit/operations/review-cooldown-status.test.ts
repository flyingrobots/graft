import { describe, expect, it } from "vitest";
import { reviewCooldownStatus } from "../../../src/operations/review-cooldown-status.js";

describe("operations: review cooldown status", () => {
  it("calculates an active CodeRabbit cooldown from the latest rate-limit marker", () => {
    const status = reviewCooldownStatus({
      now: new Date("2026-05-05T15:10:00.000Z"),
      comments: [
        {
          author: "coderabbitai",
          body: "Rate limit exceeded. Please retry in 30 minutes.",
          updatedAt: "2026-05-05T15:00:00.000Z",
        },
      ],
    });

    expect(status).toMatchObject({
      status: "cooldown",
      markerFound: true,
      sourceCommentAt: "2026-05-05T15:00:00.000Z",
      cooldownDurationMs: 1_800_000,
      cooldownExpiresAt: "2026-05-05T15:30:00.000Z",
      remainingMs: 1_200_000,
    });
  });

  it("reports ready when the latest cooldown has expired", () => {
    const status = reviewCooldownStatus({
      now: new Date("2026-05-05T15:45:00.000Z"),
      comments: [
        {
          author: "coderabbitai",
          body: "Rate limit exceeded. Try again in 30m.",
          updatedAt: "2026-05-05T15:00:00.000Z",
        },
      ],
    });

    expect(status.status).toBe("ready");
    expect(status.remainingMs).toBe(0);
    expect(status.cooldownExpiresAt).toBe("2026-05-05T15:30:00.000Z");
  });

  it("ignores non-CodeRabbit rate-limit comments", () => {
    const status = reviewCooldownStatus({
      now: new Date("2026-05-05T15:10:00.000Z"),
      comments: [
        {
          author: "human-reviewer",
          body: "Rate limit exceeded. Please retry in 30 minutes.",
          updatedAt: "2026-05-05T15:00:00.000Z",
        },
      ],
    });

    expect(status).toMatchObject({
      status: "ready",
      markerFound: false,
    });
  });

  it("reports unknown when a marker lacks enough expiry evidence", () => {
    const status = reviewCooldownStatus({
      now: new Date("2026-05-05T15:10:00.000Z"),
      comments: [
        {
          author: "coderabbitai",
          body: "Rate limit exceeded.",
          updatedAt: "2026-05-05T15:00:00.000Z",
        },
      ],
    });

    expect(status).toMatchObject({
      status: "unknown",
      markerFound: true,
      reason: "cooldown_marker_missing_timestamp_or_duration",
    });
  });
});
