export type ReviewCooldownStatusKind = "ready" | "cooldown" | "unknown";

export interface ReviewCooldownComment {
  readonly body: string;
  readonly createdAt?: string | undefined;
  readonly updatedAt?: string | undefined;
  readonly author?: string | undefined;
}

export interface ReviewCooldownStatus {
  readonly status: ReviewCooldownStatusKind;
  readonly reviewer: "coderabbitai";
  readonly processedAt: string;
  readonly processedAtLocal: string;
  readonly markerFound: boolean;
  readonly sourceCommentAt?: string | undefined;
  readonly cooldownDurationMs?: number | undefined;
  readonly cooldownExpiresAt?: string | undefined;
  readonly cooldownExpiresAtLocal?: string | undefined;
  readonly remainingMs?: number | undefined;
  readonly reason?: string | undefined;
  readonly summary: string;
}

export interface ReviewCooldownStatusOptions {
  readonly comments: readonly ReviewCooldownComment[];
  readonly now?: Date | undefined;
}

const RATE_LIMIT_PATTERN = /rate limit exceeded/i;
const CODERABBIT_AUTHOR_PATTERN = /coderabbit/i;
const DURATION_PATTERN = /(?:rate limit exceeded[\s\S]{0,240}?)(\d+)\s*(m|min|mins|minute|minutes|h|hr|hrs|hour|hours)\b/i;

function timestampForComment(comment: ReviewCooldownComment): Date | null {
  const raw = comment.updatedAt ?? comment.createdAt;
  if (raw === undefined) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function durationMsFromBody(body: string): number | null {
  const match = DURATION_PATTERN.exec(body);
  if (match === null) return null;
  const amount = Number.parseInt(match[1] ?? "", 10);
  if (!Number.isInteger(amount) || amount <= 0) return null;
  const unit = (match[2] ?? "").toLowerCase();
  if (unit.startsWith("h")) return amount * 60 * 60 * 1000;
  return amount * 60 * 1000;
}

function localString(date: Date): string {
  return date.toString();
}

function renderSummary(status: ReviewCooldownStatusKind, remainingMs: number | undefined): string {
  if (status === "cooldown") {
    const minutes = remainingMs === undefined ? "unknown" : String(Math.ceil(remainingMs / 60_000));
    return `CodeRabbit review cooldown is active; about ${minutes} minutes remaining.`;
  }
  if (status === "unknown") {
    return "CodeRabbit review cooldown marker found, but its expiry could not be calculated.";
  }
  return "CodeRabbit review cooldown is ready.";
}

function isCodeRabbitComment(comment: ReviewCooldownComment, trustUnknown = false): boolean {
  if (comment.author === undefined) {
    return trustUnknown;
  }
  return CODERABBIT_AUTHOR_PATTERN.test(comment.author);
}

export function reviewCooldownStatus(
  options: ReviewCooldownStatusOptions,
): ReviewCooldownStatus {
  const now = options.now ?? new Date();
  const markerComments = options.comments
    .filter((comment) => isCodeRabbitComment(comment) && RATE_LIMIT_PATTERN.test(comment.body))
    .map((comment) => ({
      comment,
      timestamp: timestampForComment(comment),
      durationMs: durationMsFromBody(comment.body),
    }))
    .sort((a, b) => (b.timestamp?.getTime() ?? 0) - (a.timestamp?.getTime() ?? 0));

  const latest = markerComments[0];
  if (latest === undefined) {
    return {
      status: "ready",
      reviewer: "coderabbitai",
      processedAt: now.toISOString(),
      processedAtLocal: localString(now),
      markerFound: false,
      summary: renderSummary("ready", undefined),
    };
  }

  if (latest.timestamp === null || latest.durationMs === null) {
    return {
      status: "unknown",
      reviewer: "coderabbitai",
      processedAt: now.toISOString(),
      processedAtLocal: localString(now),
      markerFound: true,
      ...(latest.timestamp !== null ? { sourceCommentAt: latest.timestamp.toISOString() } : {}),
      ...(latest.durationMs !== null ? { cooldownDurationMs: latest.durationMs } : {}),
      reason: "cooldown_marker_missing_timestamp_or_duration",
      summary: renderSummary("unknown", undefined),
    };
  }

  const expires = new Date(latest.timestamp.getTime() + latest.durationMs);
  const remainingMs = Math.max(0, expires.getTime() - now.getTime());
  const status: ReviewCooldownStatusKind = remainingMs > 0 ? "cooldown" : "ready";

  return {
    status,
    reviewer: "coderabbitai",
    processedAt: now.toISOString(),
    processedAtLocal: localString(now),
    markerFound: true,
    sourceCommentAt: latest.timestamp.toISOString(),
    cooldownDurationMs: latest.durationMs,
    cooldownExpiresAt: expires.toISOString(),
    cooldownExpiresAtLocal: localString(expires),
    remainingMs,
    summary: renderSummary(status, remainingMs),
  };
}
