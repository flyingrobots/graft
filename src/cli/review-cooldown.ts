import * as fs from "node:fs";
import { CanonicalJsonCodec } from "../adapters/canonical-json.js";
import { nodePathOps } from "../adapters/node-paths.js";
import { nodeProcessRunner } from "../adapters/node-process-runner.js";
import { attachCliSchemaMeta, validateCliOutput } from "../contracts/output-schemas.js";
import {
  reviewCooldownStatus,
  type ReviewCooldownComment,
  type ReviewCooldownStatus,
} from "../operations/review-cooldown-status.js";
import type { ProcessRunner } from "../ports/process-runner.js";
import type { Writer } from "./peer-command.js";

const codec = new CanonicalJsonCodec();

export interface RunReviewCooldownOptions {
  readonly cwd: string;
  readonly json: boolean;
  readonly stdout?: Writer | undefined;
  readonly pr?: string | undefined;
  readonly commentsFile?: string | undefined;
  readonly now?: string | undefined;
  readonly processRunner?: ProcessRunner | undefined;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function authorName(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  const record = asRecord(value);
  if (record === null) return undefined;
  const login = record["login"];
  if (typeof login === "string") return login;
  const name = record["name"];
  return typeof name === "string" ? name : undefined;
}

function commentsFromJson(value: unknown): readonly ReviewCooldownComment[] {
  const rawComments = Array.isArray(value)
    ? value
    : asRecord(value)?.["comments"];
  if (!Array.isArray(rawComments)) {
    throw new Error("Review comments JSON must be an array or an object with a comments array");
  }

  return rawComments.map((raw, index): ReviewCooldownComment => {
    const record = asRecord(raw);
    if (record === null || typeof record["body"] !== "string") {
      throw new Error(`Review comment ${String(index + 1)} is missing a string body`);
    }
    const createdAt = record["createdAt"];
    const updatedAt = record["updatedAt"];
    return {
      body: record["body"],
      ...(typeof createdAt === "string" ? { createdAt } : {}),
      ...(typeof updatedAt === "string" ? { updatedAt } : {}),
      ...(authorName(record["author"]) !== undefined ? { author: authorName(record["author"]) } : {}),
    };
  });
}

function parseCommentsText(text: string, label: string): readonly ReviewCooldownComment[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new Error(`${label} was not valid JSON`);
  }
  return commentsFromJson(parsed);
}

function readCommentsFile(cwd: string, commentsFile: string): readonly ReviewCooldownComment[] {
  const filePath = commentsFile.startsWith("/")
    ? nodePathOps.normalize(commentsFile)
    : nodePathOps.join(cwd, commentsFile);
  return parseCommentsText(fs.readFileSync(filePath, "utf8"), commentsFile);
}

function readCommentsFromGh(
  cwd: string,
  pr: string | undefined,
  processRunner: ProcessRunner,
): readonly ReviewCooldownComment[] {
  const args = [
    "pr",
    "view",
    ...(pr !== undefined ? [pr] : []),
    "--json",
    "comments",
  ];
  const result = processRunner.run({
    command: "gh",
    args,
    cwd,
    timeoutMs: 30_000,
    maxBufferBytes: 1_000_000,
  });
  if (result.error !== undefined) {
    throw new Error(`gh pr view failed: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const detail = result.stderr.trim() || result.stdout.trim() || `exit status ${String(result.status)}`;
    throw new Error(`gh pr view failed: ${detail}`);
  }
  return parseCommentsText(result.stdout, "gh pr view");
}

function parseNow(raw: string | undefined): Date | undefined {
  if (raw === undefined) return undefined;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("--now must be a valid date/time string");
  }
  return parsed;
}

function minutesFromMs(value: number): number {
  return Math.ceil(value / 60_000);
}

export function renderReviewCooldown(status: ReviewCooldownStatus): string {
  const lines = [
    "Graft Review Cooldown",
    `status: ${status.status}`,
    `reviewer: ${status.reviewer}`,
    `processed: ${status.processedAtLocal}`,
    `marker found: ${status.markerFound ? "yes" : "no"}`,
  ];

  if (status.cooldownExpiresAtLocal !== undefined) {
    lines.push(`expires: ${status.cooldownExpiresAtLocal}`);
  }
  if (status.remainingMs !== undefined && status.remainingMs > 0) {
    lines.push(`remaining: ${String(minutesFromMs(status.remainingMs))}m`);
  }
  if (status.reason !== undefined) {
    lines.push(`reason: ${status.reason}`);
  }
  lines.push("", status.summary);
  return lines.join("\n");
}

export function runReviewCooldown(options: RunReviewCooldownOptions): void {
  const stdout = options.stdout ?? process.stdout;
  const comments = options.commentsFile !== undefined
    ? readCommentsFile(options.cwd, options.commentsFile)
    : readCommentsFromGh(options.cwd, options.pr, options.processRunner ?? nodeProcessRunner);
  const now = parseNow(options.now);
  const status = reviewCooldownStatus({
    comments,
    ...(now !== undefined ? { now } : {}),
  });
  const validated = validateCliOutput("review_cooldown", attachCliSchemaMeta("review_cooldown", status));

  if (options.json) {
    stdout.write(`${codec.encode(validated)}\n`);
    return;
  }

  stdout.write(`${renderReviewCooldown(status)}\n`);
}
