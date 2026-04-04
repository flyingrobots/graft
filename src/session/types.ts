export class Tripwire {
  readonly signal: string;
  readonly recommendation: string;

  constructor(opts: { signal: string; recommendation: string }) {
    if (opts.signal.length === 0) {
      throw new Error("Tripwire: signal must be non-empty");
    }
    if (opts.recommendation.length === 0) {
      throw new Error("Tripwire: recommendation must be non-empty");
    }
    this.signal = opts.signal;
    this.recommendation = opts.recommendation;
    Object.freeze(this);
  }
}

export type SessionDepth = "early" | "mid" | "late";
