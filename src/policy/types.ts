export type Projection = "content" | "outline" | "refused" | "error";

export type ReasonCode =
  | "CONTENT"
  | "OUTLINE"
  | "SESSION_CAP"
  | "BINARY"
  | "LOCKFILE"
  | "MINIFIED"
  | "BUILD_OUTPUT"
  | "SECRET"
  | "GRAFTIGNORE";

export type SessionDepth = "early" | "mid" | "late" | "unknown";

export interface PolicyInput {
  path: string;
  lines: number;
  bytes: number;
}

export interface PolicyOptions {
  graftignorePatterns?: string[] | undefined;
  sessionDepth?: SessionDepth | undefined;
}

export interface PolicyResult {
  projection: Projection;
  reason: ReasonCode;
  reasonDetail?: string | undefined;
  next?: string[] | undefined;
  thresholds: { lines: number; bytes: number };
  actual: { lines: number; bytes: number };
  sessionDepth?: SessionDepth | undefined;
}
