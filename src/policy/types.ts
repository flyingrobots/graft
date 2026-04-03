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

// Shared fields for all results
interface PolicyResultBase {
  readonly thresholds: { readonly lines: number; readonly bytes: number };
  readonly actual: { readonly lines: number; readonly bytes: number };
  readonly sessionDepth?: SessionDepth | undefined;
}

export class ContentResult implements PolicyResultBase {
  readonly projection = "content" as const;
  readonly reason = "CONTENT" as const;
  readonly thresholds: { readonly lines: number; readonly bytes: number };
  readonly actual: { readonly lines: number; readonly bytes: number };
  readonly sessionDepth?: SessionDepth | undefined;

  constructor(opts: { thresholds: { lines: number; bytes: number }; actual: { lines: number; bytes: number }; sessionDepth?: SessionDepth | undefined }) {
    this.thresholds = Object.freeze({ ...opts.thresholds });
    this.actual = Object.freeze({ ...opts.actual });
    if (opts.sessionDepth !== undefined) this.sessionDepth = opts.sessionDepth;
    Object.freeze(this);
  }
}

export class OutlineResult implements PolicyResultBase {
  readonly projection = "outline" as const;
  readonly reason: "OUTLINE" | "SESSION_CAP";
  readonly thresholds: { readonly lines: number; readonly bytes: number };
  readonly actual: { readonly lines: number; readonly bytes: number };
  readonly sessionDepth?: SessionDepth | undefined;

  constructor(opts: { reason: "OUTLINE" | "SESSION_CAP"; thresholds: { lines: number; bytes: number }; actual: { lines: number; bytes: number }; sessionDepth?: SessionDepth | undefined }) {
    this.reason = opts.reason;
    this.thresholds = Object.freeze({ ...opts.thresholds });
    this.actual = Object.freeze({ ...opts.actual });
    if (opts.sessionDepth !== undefined) this.sessionDepth = opts.sessionDepth;
    Object.freeze(this);
  }
}

export class RefusedResult implements PolicyResultBase {
  readonly projection = "refused" as const;
  readonly reason: ReasonCode;
  readonly reasonDetail: string;
  readonly next: readonly string[];
  readonly thresholds: { readonly lines: number; readonly bytes: number };
  readonly actual: { readonly lines: number; readonly bytes: number };
  readonly sessionDepth?: SessionDepth | undefined;

  constructor(opts: { reason: ReasonCode; reasonDetail: string; next: string[]; thresholds: { lines: number; bytes: number }; actual: { lines: number; bytes: number }; sessionDepth?: SessionDepth | undefined }) {
    this.reason = opts.reason;
    this.reasonDetail = opts.reasonDetail;
    this.next = Object.freeze([...opts.next]);
    this.thresholds = Object.freeze({ ...opts.thresholds });
    this.actual = Object.freeze({ ...opts.actual });
    if (opts.sessionDepth !== undefined) this.sessionDepth = opts.sessionDepth;
    Object.freeze(this);
  }
}

// Union type for callers that need the general type
export type PolicyResult = ContentResult | OutlineResult | RefusedResult;
