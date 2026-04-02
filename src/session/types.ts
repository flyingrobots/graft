export interface Tripwire {
  readonly signal: string;
  readonly recommendation: string;
}

export type SessionDepth = "early" | "mid" | "late";
