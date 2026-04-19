export class Tripwire {
  /** @internal */
  private readonly _brand = "Tripwire" as const;
  readonly signal: string;
  readonly recommendation: string;

  constructor(opts: { signal: string; recommendation: string }) {
    if (opts.signal.trim().length === 0) {
      throw new Error("Tripwire: signal must be non-empty");
    }
    if (opts.recommendation.trim().length === 0) {
      throw new Error("Tripwire: recommendation must be non-empty");
    }
    this.signal = opts.signal.trim();
    this.recommendation = opts.recommendation.trim();
    Object.freeze(this);
  }
}

export type GovernorDepth = "early" | "mid" | "late";

/** @deprecated Use {@link GovernorDepth}. Kept as a wire-format alias. */
export type SessionDepth = GovernorDepth;
