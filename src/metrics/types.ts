export interface DecisionEntry {
  readonly ts: string;
  readonly command: string;
  readonly path: string;
  readonly projection: string;
  readonly reason: string;
  readonly lines: number;
  readonly bytes: number;
  readonly estimatedBytesAvoided?: number;
  readonly sessionDepth?: string;
  readonly tripwire?: string | null;
}
