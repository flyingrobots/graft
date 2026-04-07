/** The kind of a top-level or member declaration. */
export type EntryKind =
  | "function"
  | "class"
  | "method"
  | "interface"
  | "type"
  | "enum"
  | "export"
  | "heading";

/** A single entry in a file outline. */
export class OutlineEntry {
  /** @internal Brand prevents structural forgery from plain objects. */
  private readonly _brand = "OutlineEntry" as const;
  readonly kind: EntryKind;
  readonly name: string;
  readonly signature?: string;
  readonly exported: boolean;
  readonly children?: readonly OutlineEntry[];

  constructor(opts: {
    kind: EntryKind;
    name: string;
    exported: boolean;
    signature?: string;
    children?: readonly OutlineEntry[];
  }) {
    if (opts.name.trim().length === 0) {
      throw new Error("OutlineEntry: name must be non-empty");
    }
    this.kind = opts.kind;
    this.name = opts.name.trim();
    this.exported = opts.exported;
    if (opts.signature !== undefined) this.signature = opts.signature;
    if (opts.children !== undefined) this.children = Object.freeze([...opts.children]);
    Object.freeze(this);
  }
}

/** A jump-table entry mapping a symbol to its 1-based line range. */
export class JumpEntry {
  /** @internal Brand prevents structural forgery from plain objects. */
  private readonly _brand = "JumpEntry" as const;
  readonly symbol: string;
  readonly kind: string;
  readonly start: number; // 1-based line
  readonly end: number; // 1-based line

  constructor(opts: {
    symbol: string;
    kind: string;
    start: number;
    end: number;
  }) {
    if (!Number.isInteger(opts.start) || opts.start < 1) {
      throw new Error("JumpEntry: start must be an integer >= 1");
    }
    if (!Number.isInteger(opts.end) || opts.end < opts.start) {
      throw new Error("JumpEntry: end must be an integer >= start");
    }
    this.symbol = opts.symbol;
    this.kind = opts.kind;
    this.start = opts.start;
    this.end = opts.end;
    Object.freeze(this);
  }
}

/** Result of outline extraction. */
export interface OutlineResult {
  entries: OutlineEntry[];
  jumpTable?: JumpEntry[];
  partial?: boolean;
}
