import picomatch from "picomatch";
import type { PolicyInput, PolicyOptions, ReasonCode, SessionDepth } from "./types.js";
import { ContentResult, OutlineResult, RefusedResult } from "./types.js";
import type { PolicyResult } from "./types.js";

export const STATIC_THRESHOLDS = { lines: 150, bytes: 12288 } as const;

const SESSION_BYTE_CAPS: Record<string, number> = {
  early: 20480,
  mid: 10240,
  late: 4096,
};

const BINARY_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".pdf", ".zip",
  ".wasm", ".bin", ".sqlite", ".mp4", ".mov", ".ico",
]);

const LOCKFILE_NAMES = new Set([
  "package-lock.json", "pnpm-lock.yaml", "yarn.lock",
  "Gemfile.lock", "poetry.lock", "Cargo.lock",
  "composer.lock", "Pipfile.lock",
]);

const BUILD_OUTPUT_PREFIXES = ["dist/", "build/", ".next/", "out/", "target/"];

const SECRET_PATTERNS: ((name: string) => boolean)[] = [
  (n) => n === ".env" || (n.startsWith(".env.") && !n.endsWith(".example")),
  (n) => n.endsWith(".pem"),
  (n) => n.endsWith(".key"),
  (n) => n.startsWith("credentials."),
];

function basename(path: string): string {
  const i = path.lastIndexOf("/");
  return i === -1 ? path : path.slice(i + 1);
}

function extname(path: string): string {
  const name = basename(path);
  const i = name.lastIndexOf(".");
  return i <= 0 ? "" : name.slice(i);
}

function checkBan(path: string): { reason: ReasonCode; reasonDetail: string; next: string[] } | undefined {
  const name = basename(path);
  const ext = extname(path).toLowerCase();

  if (BINARY_EXTENSIONS.has(ext)) {
    return {
      reason: "BINARY",
      reasonDetail: `Binary file (${ext}) cannot be usefully read`,
      next: ["Use file_outline to see metadata", "Check for a text alternative"],
    };
  }

  if (LOCKFILE_NAMES.has(name)) {
    return {
      reason: "LOCKFILE",
      reasonDetail: `Lockfile ${name} is machine-generated and not useful to read`,
      next: ["Read package.json for dependency info instead"],
    };
  }

  if (name.endsWith(".min.js") || name.endsWith(".min.css")) {
    return {
      reason: "MINIFIED",
      reasonDetail: `Minified file ${name} is not human-readable`,
      next: ["Look for the unminified source"],
    };
  }

  for (const prefix of BUILD_OUTPUT_PREFIXES) {
    if (path.includes("/" + prefix) || path.startsWith(prefix)) {
      return {
        reason: "BUILD_OUTPUT",
        reasonDetail: `Build output path ${prefix} contains generated files`,
        next: ["Try reading src/ instead of dist/"],
      };
    }
  }

  for (const check of SECRET_PATTERNS) {
    if (check(name)) {
      return {
        reason: "SECRET",
        reasonDetail: `${name} may contain secrets and should not be read`,
        next: ["Check for a .example or template version"],
      };
    }
  }

  return undefined;
}

export function evaluatePolicy(input: PolicyInput, options?: PolicyOptions): PolicyResult {
  const { path, lines, bytes } = input;
  const actual = { lines, bytes };
  const thresholds = { ...STATIC_THRESHOLDS };
  const sessionDepth: SessionDepth | undefined = options?.sessionDepth;

  // 1. Bans first
  const ban = checkBan(path);
  if (ban !== undefined) {
    return new RefusedResult({
      reason: ban.reason,
      reasonDetail: ban.reasonDetail,
      next: ban.next,
      thresholds,
      actual,
      ...(sessionDepth !== undefined ? { sessionDepth } : {}),
    });
  }

  // 2. Graftignore
  const patterns = options?.graftignorePatterns;
  if (patterns !== undefined && patterns.length > 0) {
    const isMatch = picomatch(patterns);
    if (isMatch(path)) {
      return new RefusedResult({
        reason: "GRAFTIGNORE",
        reasonDetail: "File matches .graftignore pattern",
        next: ["Check .graftignore if this file should be readable"],
        thresholds,
        actual,
        ...(sessionDepth !== undefined ? { sessionDepth } : {}),
      });
    }
  }

  // 3. Determine effective byte cap
  // When session depth is known (not "unknown"), the session cap replaces the static byte threshold.
  // Static line threshold always applies.
  const hasSessionCap = sessionDepth !== undefined && sessionDepth !== "unknown";
  const effectiveByteCap = hasSessionCap
    ? SESSION_BYTE_CAPS[sessionDepth] ?? STATIC_THRESHOLDS.bytes
    : STATIC_THRESHOLDS.bytes;

  const exceedsLines = lines > STATIC_THRESHOLDS.lines;
  const exceedsBytes = bytes > effectiveByteCap;

  if (!exceedsLines && !exceedsBytes) {
    return new ContentResult({
      thresholds,
      actual,
      ...(sessionDepth !== undefined ? { sessionDepth } : {}),
    });
  }

  // Determine reason: SESSION_CAP when the session byte cap triggered (and it's the dynamic one)
  const finalReason: "OUTLINE" | "SESSION_CAP" = exceedsLines && !exceedsBytes
    ? "OUTLINE"
    : exceedsBytes && hasSessionCap
      ? "SESSION_CAP"
      : "OUTLINE";

  return new OutlineResult({
    reason: finalReason,
    thresholds,
    actual,
    ...(sessionDepth !== undefined ? { sessionDepth } : {}),
  });
}
