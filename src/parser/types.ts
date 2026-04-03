/** A single entry in a file outline. */
export interface OutlineEntry {
  kind: "function" | "class" | "method" | "interface" | "type" | "enum" | "export";
  name: string;
  signature?: string;
  exported: boolean;
  children?: OutlineEntry[];
}

/** A jump-table entry mapping a symbol to its 1-based line range. */
export interface JumpEntry {
  symbol: string;
  kind: string;
  start: number; // 1-based line
  end: number; // 1-based line
}

/** Result of outline extraction. */
export interface OutlineResult {
  entries: OutlineEntry[];
  jumpTable?: JumpEntry[];
  partial?: boolean;
}
