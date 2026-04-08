export class PrecisionSymbolMatch {
  readonly name: string;
  readonly kind: string;
  readonly path: string;
  readonly signature?: string;
  readonly exported: boolean;
  readonly startLine?: number;
  readonly endLine?: number;

  constructor(opts: {
    name: string;
    kind: string;
    path: string;
    signature?: string;
    exported: boolean;
    startLine?: number;
    endLine?: number;
  }) {
    if (opts.name.trim().length === 0) {
      throw new Error("PrecisionSymbolMatch: name must be non-empty");
    }
    if (opts.kind.trim().length === 0) {
      throw new Error("PrecisionSymbolMatch: kind must be non-empty");
    }
    if (opts.path.trim().length === 0) {
      throw new Error("PrecisionSymbolMatch: path must be non-empty");
    }
    if (opts.startLine !== undefined && (!Number.isInteger(opts.startLine) || opts.startLine < 1)) {
      throw new Error("PrecisionSymbolMatch: startLine must be an integer >= 1");
    }
    if (opts.endLine !== undefined && (!Number.isInteger(opts.endLine) || opts.endLine < 1)) {
      throw new Error("PrecisionSymbolMatch: endLine must be an integer >= 1");
    }
    if (
      opts.startLine !== undefined &&
      opts.endLine !== undefined &&
      opts.endLine < opts.startLine
    ) {
      throw new Error("PrecisionSymbolMatch: endLine must be >= startLine");
    }

    this.name = opts.name.trim();
    this.kind = opts.kind.trim();
    this.path = opts.path.trim();
    this.exported = opts.exported;
    if (opts.signature !== undefined) this.signature = opts.signature;
    if (opts.startLine !== undefined) this.startLine = opts.startLine;
    if (opts.endLine !== undefined) this.endLine = opts.endLine;
    Object.freeze(this);
  }
}
