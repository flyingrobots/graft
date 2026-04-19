// ---------------------------------------------------------------------------
// Secret scrubbing — shared redaction for observability and capture logs
// ---------------------------------------------------------------------------

const PRIVATE_KEY_BLOCK_RE = /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g;
const SECRET_ASSIGNMENT_RE = /(\b(?:api[_-]?key|access[_-]?token|auth(?:orization)?|bearer|token|secret|password|passwd|private[_-]?key|client[_-]?secret|session[_-]?key)\b\s*[:=]\s*)([^\r\n]+)/gi;
const BEARER_TOKEN_RE = /(\bbearer\s+)([A-Za-z0-9._~+/=-]{8,})/gi;

/**
 * Keys whose values should always be redacted in observability logs,
 * regardless of the value's content.
 */
const SENSITIVE_ARG_KEYS = new Set([
  "token",
  "apiKey",
  "api_key",
  "secret",
  "password",
  "passwd",
  "access_token",
  "accessToken",
  "authorization",
  "auth",
  "bearer",
  "private_key",
  "privateKey",
  "client_secret",
  "clientSecret",
  "session_key",
  "sessionKey",
  "credentials",
]);

/** Maximum string value length before truncation in observability logs. */
const MAX_VALUE_LENGTH = 512;

/**
 * Scrub secret patterns from a free-text string (e.g. shell output).
 * Returns the scrubbed text and how many redactions were applied.
 */
export function scrubSecrets(output: string): {
  readonly value: string;
  readonly redactions: number;
} {
  let redactions = 0;
  let value = output.replace(PRIVATE_KEY_BLOCK_RE, () => {
    redactions++;
    return "[REDACTED PRIVATE KEY BLOCK]";
  });
  value = value.replace(SECRET_ASSIGNMENT_RE, (_match, prefix: string) => {
    redactions++;
    return `${prefix}[REDACTED]`;
  });
  value = value.replace(BEARER_TOKEN_RE, (_match, prefix: string) => {
    redactions++;
    return `${prefix}[REDACTED]`;
  });
  return { value, redactions };
}

/**
 * Sanitize a tool's argument map for observability logging.
 * Returns a safe-to-persist record with:
 *   - sensitive keys redacted
 *   - oversized string values truncated
 *   - non-string values preserved as-is (they're JSON-safe)
 */
export function sanitizeArgValues(
  args: Record<string, unknown>,
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const key of Object.keys(args).sort()) {
    if (SENSITIVE_ARG_KEYS.has(key)) {
      sanitized[key] = "[REDACTED]";
      continue;
    }
    const value = args[key];
    if (typeof value === "string") {
      if (value.length > MAX_VALUE_LENGTH) {
        sanitized[key] = `${value.slice(0, MAX_VALUE_LENGTH)}... [truncated, ${String(value.length)} chars]`;
      } else {
        sanitized[key] = scrubSecrets(value).value;
      }
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}
