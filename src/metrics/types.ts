// ---------------------------------------------------------------------------
// DecisionEntry — runtime-backed metric event for policy decisions
// ---------------------------------------------------------------------------

export class DecisionEntry {
  readonly ts: string;
  readonly command: string;
  readonly path: string;
  readonly projection: string;
  readonly reason: string;
  readonly lines: number;
  readonly bytes: number;
  readonly estimatedBytesAvoided?: number | undefined;
  readonly sessionDepth?: string | undefined;
  readonly tripwire?: string | null | undefined;

  constructor(fields: {
    readonly ts: string;
    readonly command: string;
    readonly path: string;
    readonly projection: string;
    readonly reason: string;
    readonly lines: number;
    readonly bytes: number;
    readonly estimatedBytesAvoided?: number | undefined;
    readonly sessionDepth?: string | undefined;
    readonly tripwire?: string | null | undefined;
  }) {
    this.ts = fields.ts;
    this.command = fields.command;
    this.path = fields.path;
    this.projection = fields.projection;
    this.reason = fields.reason;
    this.lines = fields.lines;
    this.bytes = fields.bytes;
    this.estimatedBytesAvoided = fields.estimatedBytesAvoided;
    this.sessionDepth = fields.sessionDepth;
    this.tripwire = fields.tripwire;
  }
}
