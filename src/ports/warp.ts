// ---------------------------------------------------------------------------
// WARP port — hexagonal boundary for graph reads and writes
// ---------------------------------------------------------------------------

export interface WarpObserverLens {
  readonly match: string | readonly string[];
  readonly expose?: readonly string[] | undefined;
  readonly redact?: readonly string[] | undefined;
}

export interface WarpObserverOptions {
  readonly source?: {
    readonly kind: "live";
    readonly ceiling: number | null;
  } | undefined;
}

export interface WarpEdge {
  readonly from: string;
  readonly to: string;
  readonly label: string;
}

export interface WarpObserver {
  getNodes(): Promise<string[]>;
  getNodeProps(nodeId: string): Promise<Record<string, unknown> | null>;
  getEdges(): Promise<readonly WarpEdge[]>;
}

export interface WarpPatchBuilder {
  addNode(id: string): unknown;
  setProperty(id: string, key: string, value: unknown): unknown;
  addEdge(from: string, to: string, label: string): unknown;
  removeNode(id: string): unknown;
  removeEdge(from: string, to: string, label: string): unknown;
}

export interface WarpMaterializeReceiptOp {
  readonly op: string;
  readonly result: string;
  readonly target: string;
}

export interface WarpMaterializeReceipt {
  readonly lamport: number;
  readonly ops: readonly WarpMaterializeReceiptOp[];
}

export interface WarpHandle {
  hasNode(nodeId: string): Promise<boolean>;
  observer(lens: WarpObserverLens, options?: WarpObserverOptions): Promise<WarpObserver>;
  patch(build: (patch: WarpPatchBuilder) => void | Promise<void>): Promise<string>;
  materialize(): Promise<void>;
  materializeReceipts(): Promise<readonly WarpMaterializeReceipt[]>;
}
