// ---------------------------------------------------------------------------
// WARP graph port — Graft-owned boundary for graph reads and writes.
// ---------------------------------------------------------------------------

export interface WarpLens {
  readonly match: string | readonly string[];
  readonly expose?: readonly string[] | undefined;
  readonly redact?: readonly string[] | undefined;
}

export interface WarpLiveSource {
  readonly kind: "live";
  readonly ceiling?: number | null | undefined;
}

export interface WarpObserverOptions {
  readonly source?: WarpLiveSource | undefined;
}

export interface WarpEdge {
  readonly from: string;
  readonly to: string;
  readonly label: string;
  readonly props: Readonly<Record<string, unknown>>;
}

export interface WarpTraversalOptions {
  readonly maxDepth?: number | undefined;
  readonly dir?: "out" | "in" | "both" | undefined;
  readonly labelFilter?: string | readonly string[] | undefined;
}

export interface WarpTraversalPort {
  bfs(start: string, options?: WarpTraversalOptions): Promise<string[]>;
}

export interface WarpQueryNodeSnapshot {
  readonly id: string;
  readonly props: Readonly<Record<string, unknown>>;
  readonly edgesOut: readonly { readonly label: string; readonly to: string }[];
  readonly edgesIn: readonly { readonly label: string; readonly from: string }[];
}

export interface WarpQueryResult {
  readonly stateHash: string;
  readonly nodes: readonly {
    readonly id?: string | undefined;
    readonly props?: Readonly<Record<string, unknown>> | undefined;
  }[];
}

export interface WarpAggregateSpec {
  readonly count?: boolean | undefined;
  readonly sum?: string | undefined;
  readonly avg?: string | undefined;
  readonly min?: string | undefined;
  readonly max?: string | undefined;
}

export interface WarpAggregateResult {
  readonly stateHash: string;
  readonly count?: number | undefined;
  readonly sum?: number | undefined;
  readonly avg?: number | undefined;
  readonly min?: number | undefined;
  readonly max?: number | undefined;
}

export interface WarpQueryPort {
  match(pattern: string | readonly string[]): WarpQueryPort;
  where(
    predicate: ((node: WarpQueryNodeSnapshot) => boolean) | Readonly<Record<string, unknown>>,
  ): WarpQueryPort;
  select(fields?: readonly ("id" | "props")[]): WarpQueryPort;
  aggregate(spec: WarpAggregateSpec): WarpQueryPort;
  run(): Promise<WarpQueryResult | WarpAggregateResult>;
}

export interface WarpObserverPort {
  readonly traverse: WarpTraversalPort;
  hasNode(nodeId: string): Promise<boolean>;
  getNodes(): Promise<string[]>;
  getNodeProps(nodeId: string): Promise<Record<string, unknown> | null>;
  getEdges(): Promise<readonly WarpEdge[]>;
  query(): WarpQueryPort;
}

export interface WarpContentAttachmentOptions {
  readonly mime?: string | null | undefined;
  readonly size?: number | null | undefined;
}

export interface WarpBuiltPatch {
  readonly lamport: number;
}

export interface WarpPatchPort {
  addNode(nodeId: string): WarpPatchPort;
  removeNode(nodeId: string): WarpPatchPort;
  addEdge(from: string, to: string, label: string): WarpPatchPort;
  removeEdge(from: string, to: string, label: string): WarpPatchPort;
  setProperty(nodeId: string, key: string, value: unknown): WarpPatchPort;
  attachContent(
    nodeId: string,
    content: AsyncIterable<Uint8Array> | ReadableStream<Uint8Array> | Uint8Array | string,
    metadata?: WarpContentAttachmentOptions,
  ): Promise<WarpPatchPort>;
  build(): WarpBuiltPatch;
}

export type WarpTickReceiptOp =
  | "NodeAdd"
  | "NodeTombstone"
  | "EdgeAdd"
  | "EdgeTombstone"
  | "PropSet"
  | "NodePropSet"
  | "EdgePropSet"
  | "BlobValue";

export type WarpTickReceiptResult = "applied" | "superseded" | "redundant";

export interface WarpTickReceipt {
  readonly patchSha: string;
  readonly writer: string;
  readonly lamport: number;
  readonly ops: readonly {
    readonly op: WarpTickReceiptOp;
    readonly target: string;
    readonly result: WarpTickReceiptResult;
    readonly reason?: string | undefined;
  }[];
}

export interface WarpContentMeta {
  readonly oid: string;
  readonly mime: string | null;
  readonly size: number | null;
}

export interface WarpProvenancePatch {
  readonly lamport: number;
  readonly ops: readonly unknown[];
}

export interface WarpCorePort {
  materialize(options: { readonly receipts: true }): Promise<{
    readonly receipts: readonly WarpTickReceipt[];
  }>;
  materialize(options?: { readonly receipts?: false | undefined }): Promise<void>;
  hasNode(nodeId: string): Promise<boolean>;
  getContentMeta(nodeId: string): Promise<WarpContentMeta | null>;
  getContent(nodeId: string): Promise<Uint8Array | null>;
  patchesFor(entityId: string): Promise<readonly string[]>;
  loadPatchBySha(sha: string): Promise<WarpProvenancePatch>;
}

export interface WarpWorldlinePort {
  seek(options?: WarpObserverOptions): Promise<WarpWorldlinePort>;
  getNodeProps(nodeId: string): Promise<Record<string, unknown> | null>;
}

export interface WarpGraphPort {
  patch(build: (patch: WarpPatchPort) => void | Promise<void>): Promise<string>;
  observer(lens: WarpLens, options?: WarpObserverOptions): Promise<WarpObserverPort>;
  core(): WarpCorePort;
  worldline(): WarpWorldlinePort;
}
