import { INSPECTION_LIMITS } from "../contracts/daemon-inspection-limits.js";

/** Explicit detail encoding, shared by export and terminal. Oversized arbitrary
 * text is omitted wholesale so a truncated secret is never accidentally emitted. */
export function inspectionText(value: string): string {
  if (value.length > INSPECTION_LIMITS.text) return "[detail omitted: exceeds 512 characters]";
  if (/PRIVATE KEY|\b[a-z0-9_-]*(?:password|passwd|secret|token|api[_-]?key|authorization|bearer|credentials)[a-z0-9_-]*\b\s*[:= ]|\b(?:sk-[a-z0-9_-]{16,}|gh[pousr]_[a-z0-9]{16,}|github_pat_[a-z0-9_]{16,})\b|[a-z][a-z0-9+.-]*:\/\/[^/\s]*@/iu.test(value)) {
    return "[detail redacted]";
  }
  return value.replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu, char => `\\u{${char.codePointAt(0)?.toString(16) ?? ""}}`).slice(0, INSPECTION_LIMITS.text);
}

/** Join keys are either exact or refused. Never truncate, redact, or normalize
 * an identity and then use that altered value as an authoritative key. */
export function inspectionIdentity(value: string): string {
  if (value.length === 0 || value.length > INSPECTION_LIMITS.text || inspectionText(value) !== value) {
    throw new Error("UNREPRESENTABLE_IDENTITY");
  }
  return value;
}
