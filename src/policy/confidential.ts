// ---------------------------------------------------------------------------
// Confidential content — which files a response must never be derived from.
//
// Policy bans serve two different purposes, and they must not be confused:
//
// - Relevance omission. BINARY, LOCKFILE, MINIFIED, BUILD_OUTPUT and
//   GRAFTIGNORE files are left out because their content is noise for an
//   agent. Their content is not returned, but a search may say how many of
//   its matches it left out for these reasons.
// - Content denial. SECRET files are confidential. Their content must not
//   influence any response at all: not a match, a match count, a refusal, a
//   size, or an error. A search therefore never reads them.
//
// Confidentiality is decided by file name alone, independently of the order
// in which bans choose the reason a refusal displays. `dist/.env` is refused
// as BUILD_OUTPUT, but it is still confidential.
// ---------------------------------------------------------------------------

import type { ReasonCode } from "./types.js";

/** The ban reason whose files are confidential. */
export const CONTENT_DENIAL_REASON = "SECRET" satisfies ReasonCode;

const SECRET_NAME_PATTERNS: readonly ((name: string) => boolean)[] = [
  (n) => n === ".env" || (n.startsWith(".env.") && !n.endsWith(".example")),
  (n) => n.endsWith(".pem"),
  (n) => n.endsWith(".key"),
  (n) => n.startsWith("credentials."),
];

function basename(filePath: string): string {
  const i = filePath.lastIndexOf("/");
  return i === -1 ? filePath : filePath.slice(i + 1);
}

/** True when a file name, without its directory, names a secret. */
export function isSecretFileName(name: string): boolean {
  return SECRET_NAME_PATTERNS.some((matches) => matches(name));
}

/**
 * True when the file at a repository path is confidential, whatever reason a
 * refusal of it would display.
 */
export function isConfidentialPath(filePath: string): boolean {
  return isSecretFileName(basename(filePath));
}
