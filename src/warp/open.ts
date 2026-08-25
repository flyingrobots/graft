/**
 * git-warp secondary adapter.
 *
 * This is the sole production module that constructs or calls package-owned
 * git-warp runtime objects. Callers receive only the Graft-owned graph port.
 */

/* eslint-disable @typescript-eslint/no-deprecated --
 * Exact git-warp 18.0.0 is a migration-only compatibility bridge. Its
 * supported graph facade is deliberately isolated in this adapter while the
 * retained graph is checkpointed for the v19 public Runtime/Lane cutover.
 */

import RawWarpApp, { GitGraphAdapter } from "@git-stunts/git-warp";
import GitPlumbing from "@git-stunts/plumbing";
import { Buffer } from "node:buffer";
import type {
  WarpAggregateResult,
  WarpAggregateSpec,
  WarpContentAttachmentOptions,
  WarpContentMeta,
  WarpCorePort,
  WarpGraphPort,
  WarpLens,
  WarpObserverOptions,
  WarpObserverPort,
  WarpPatchPort,
  WarpProvenancePatch,
  WarpQueryNodeSnapshot,
  WarpQueryPort,
  WarpQueryResult,
  WarpTickReceipt,
  WarpTickReceiptOp,
  WarpTickReceiptResult,
  WarpTraversalOptions,
  WarpTraversalPort,
  WarpWorldlinePort,
} from "../ports/warp.js";
import {
  assertProvenanceTimelinePort,
  type ProvenanceTimelinePort,
} from "../ports/provenance-timeline.js";
import { DEFAULT_WARP_WRITER_ID } from "./writer-id.js";

export const GRAPH_NAME = "graft-ast";
export const DEFAULT_WARP_CHECKPOINT_EVERY = 128;
const WARP_GIT_MAX_BUFFER_BYTES = 128 * 1024 * 1024;

type RawObserver = Awaited<ReturnType<RawWarpApp["observer"]>>;
type RawQuery = ReturnType<RawObserver["query"]>;
type RawPatch = Parameters<Parameters<RawWarpApp["patch"]>[0]>[0];
type RawCore = ReturnType<RawWarpApp["core"]>;
type RawWorldline = ReturnType<RawWarpApp["worldline"]>;
type RawNodePropsReader = Pick<RawObserver, "getNodeProps">;
type RawHistoricalObserverFactory = (
  lens: WarpLens,
  ceiling: number,
) => Promise<RawObserver>;
type RawGitPlumbing = ConstructorParameters<typeof GitGraphAdapter>[0]["plumbing"];

interface GitExecuteOptions {
  readonly args: string[];
  readonly input?: string | Uint8Array;
  readonly env?: Record<string, string>;
  readonly maxBytes?: number;
}

function adaptWarpGitPlumbing(plumbing: GitPlumbing): RawGitPlumbing {
  return {
    emptyTree: plumbing.emptyTree,
    async execute(options: GitExecuteOptions): Promise<string> {
      return await plumbing.execute({
        ...options,
        maxBytes: options.maxBytes ?? WARP_GIT_MAX_BUFFER_BYTES,
      });
    },
    async executeStream(options: { args: string[] }) {
      const stream = await plumbing.executeStream(options);
      return {
        [Symbol.asyncIterator](): AsyncIterator<Uint8Array> {
          return stream[Symbol.asyncIterator]();
        },
        async collect(collectOptions: { asString?: boolean; maxBytes?: number } = {}) {
          const result = await stream.collect({
            ...collectOptions,
            maxBytes: collectOptions.maxBytes ?? WARP_GIT_MAX_BUFFER_BYTES,
          });
          return typeof result === "string" ? result : Buffer.from(result);
        },
      };
    },
  };
}

function isWarpTickReceiptOp(value: string): value is WarpTickReceiptOp {
  switch (value) {
    case "NodeAdd":
    case "NodeTombstone":
    case "EdgeAdd":
    case "EdgeTombstone":
    case "PropSet":
    case "NodePropSet":
    case "EdgePropSet":
    case "BlobValue":
      return true;
    default:
      return false;
  }
}

function isWarpTickReceiptResult(value: string): value is WarpTickReceiptResult {
  return value === "applied" || value === "superseded" || value === "redundant";
}

function toWarpTickReceipt(receipt: {
  readonly patchSha: string;
  readonly writer: string;
  readonly lamport: number;
  readonly ops: readonly {
    readonly op: string;
    readonly target: string;
    readonly result: string;
    readonly reason?: string | undefined;
  }[];
}): WarpTickReceipt {
  return {
    patchSha: receipt.patchSha,
    writer: receipt.writer,
    lamport: receipt.lamport,
    ops: receipt.ops.map((outcome) => {
      if (!isWarpTickReceiptOp(outcome.op)) {
        throw new TypeError(`Unsupported git-warp receipt operation: ${outcome.op}`);
      }
      if (!isWarpTickReceiptResult(outcome.result)) {
        throw new TypeError(`Unsupported git-warp receipt result: ${outcome.result}`);
      }
      return {
        op: outcome.op,
        target: outcome.target,
        result: outcome.result,
        ...(outcome.reason !== undefined ? { reason: outcome.reason } : {}),
      };
    }),
  };
}

function toRawLens(lens: WarpLens): {
  match: string | string[];
  expose?: string[];
  redact?: string[];
} {
  return {
    match: typeof lens.match === "string" ? lens.match : [...lens.match],
    ...(lens.expose !== undefined ? { expose: [...lens.expose] } : {}),
    ...(lens.redact !== undefined ? { redact: [...lens.redact] } : {}),
  };
}

function toRawObserverOptions(options: WarpObserverOptions | undefined): {
  source?: { kind: "live"; ceiling?: number | null };
} | undefined {
  if (options?.source === undefined) return { source: { kind: "live" } };
  return {
    source: {
      kind: "live",
      ...(options.source.ceiling !== undefined ? { ceiling: options.source.ceiling } : {}),
    },
  };
}

function historicalCeiling(options: WarpObserverOptions | undefined): number | null {
  const ceiling = options?.source?.ceiling;
  return typeof ceiling === "number" ? ceiling : null;
}

function toRawTraversalOptions(options: WarpTraversalOptions | undefined): {
  maxDepth?: number;
  dir?: "out" | "in" | "both";
  labelFilter?: string | string[];
} | undefined {
  if (options === undefined) return undefined;
  return {
    ...(options.maxDepth !== undefined ? { maxDepth: options.maxDepth } : {}),
    ...(options.dir !== undefined ? { dir: options.dir } : {}),
    ...(options.labelFilter !== undefined
      ? {
          labelFilter: typeof options.labelFilter === "string"
            ? options.labelFilter
            : [...options.labelFilter],
        }
      : {}),
  };
}

class GitWarpQueryAdapter implements WarpQueryPort {
  constructor(private readonly raw: RawQuery) {}

  match(pattern: string | readonly string[]): WarpQueryPort {
    this.raw.match(typeof pattern === "string" ? pattern : [...pattern]);
    return this;
  }

  where(
    predicate: ((node: WarpQueryNodeSnapshot) => boolean) | Readonly<Record<string, unknown>>,
  ): WarpQueryPort {
    this.raw.where(predicate as Parameters<RawQuery["where"]>[0]);
    return this;
  }

  select(fields?: readonly ("id" | "props")[]): WarpQueryPort {
    this.raw.select(fields === undefined ? undefined : [...fields]);
    return this;
  }

  aggregate(spec: WarpAggregateSpec): WarpQueryPort {
    this.raw.aggregate({
      ...(spec.count !== undefined ? { count: spec.count } : {}),
      ...(spec.sum !== undefined ? { sum: spec.sum } : {}),
      ...(spec.avg !== undefined ? { avg: spec.avg } : {}),
      ...(spec.min !== undefined ? { min: spec.min } : {}),
      ...(spec.max !== undefined ? { max: spec.max } : {}),
    });
    return this;
  }

  async run(): Promise<WarpQueryResult | WarpAggregateResult> {
    return await this.raw.run();
  }
}

class GitWarpTraversalAdapter implements WarpTraversalPort {
  constructor(private readonly raw: RawObserver["traverse"]) {}

  async bfs(start: string, options?: WarpTraversalOptions): Promise<string[]> {
    return await this.raw.bfs(start, toRawTraversalOptions(options));
  }
}

class GitWarpObserverAdapter implements WarpObserverPort {
  readonly traverse: WarpTraversalPort;

  constructor(private readonly raw: RawObserver) {
    this.traverse = new GitWarpTraversalAdapter(raw.traverse);
  }

  async hasNode(nodeId: string): Promise<boolean> {
    return await this.raw.hasNode(nodeId);
  }

  async getNodes(): Promise<string[]> {
    return await this.raw.getNodes();
  }

  async getNodeProps(nodeId: string): Promise<Record<string, unknown> | null> {
    return await this.raw.getNodeProps(nodeId);
  }

  async getEdges(): Promise<Awaited<ReturnType<WarpObserverPort["getEdges"]>>> {
    return await this.raw.getEdges();
  }

  query(): WarpQueryPort {
    return new GitWarpQueryAdapter(this.raw.query());
  }
}

class GitWarpPatchAdapter implements WarpPatchPort {
  constructor(private readonly raw: RawPatch) {}

  addNode(nodeId: string): WarpPatchPort {
    this.raw.addNode(nodeId);
    return this;
  }

  removeNode(nodeId: string): WarpPatchPort {
    this.raw.removeNode(nodeId);
    return this;
  }

  addEdge(from: string, to: string, label: string): WarpPatchPort {
    this.raw.addEdge(from, to, label);
    return this;
  }

  removeEdge(from: string, to: string, label: string): WarpPatchPort {
    this.raw.removeEdge(from, to, label);
    return this;
  }

  setProperty(nodeId: string, key: string, value: unknown): WarpPatchPort {
    this.raw.setProperty(nodeId, key, value);
    return this;
  }

  async attachContent(
    nodeId: string,
    content: AsyncIterable<Uint8Array> | ReadableStream<Uint8Array> | Uint8Array | string,
    metadata?: WarpContentAttachmentOptions,
  ): Promise<WarpPatchPort> {
    await this.raw.attachContent(
      nodeId,
      content,
      metadata === undefined
        ? undefined
        : {
            ...(metadata.mime !== undefined ? { mime: metadata.mime } : {}),
            ...(metadata.size !== undefined ? { size: metadata.size } : {}),
          },
    );
    return this;
  }

  build(): ReturnType<WarpPatchPort["build"]> {
    return this.raw.build();
  }
}

class GitWarpCoreAdapter implements WarpCorePort {
  private readonly provenance: ProvenanceTimelinePort;
  private readingBasis: Promise<void> | null = null;
  private provenanceBasis: Promise<void> | null = null;

  constructor(private readonly raw: RawCore) {
    assertProvenanceTimelinePort(raw);
    this.provenance = raw;
  }

  private async ensureReadingBasis(): Promise<void> {
    if (this.readingBasis === null) {
      const pending = this.raw.materialize().then(() => undefined);
      this.readingBasis = pending;
      try {
        await pending;
      } catch (error) {
        if (this.readingBasis === pending) {
          this.readingBasis = null;
        }
        throw error;
      }
      return;
    }
    await this.readingBasis;
  }

  private async ensureProvenanceBasis(): Promise<void> {
    if (this.provenanceBasis === null) {
      const pending = this.raw.materialize({ receipts: true }).then(() => undefined);
      this.provenanceBasis = pending;
      try {
        await pending;
      } catch (error) {
        if (this.provenanceBasis === pending) {
          this.provenanceBasis = null;
        }
        throw error;
      }
      this.readingBasis = Promise.resolve();
      return;
    }
    await this.provenanceBasis;
  }

  async materialize(options: { readonly receipts: true }): Promise<{
    readonly receipts: readonly WarpTickReceipt[];
  }>;
  async materialize(options?: { readonly receipts?: false | undefined }): Promise<void>;
  async materialize(options?: { readonly receipts?: boolean | undefined }): Promise<
    void | { readonly receipts: readonly WarpTickReceipt[] }
  > {
    if (options?.receipts === true) {
      const result = await this.raw.materialize({ receipts: true });
      this.readingBasis = Promise.resolve();
      this.provenanceBasis = Promise.resolve();
      return { receipts: result.receipts.map(toWarpTickReceipt) };
    }
    await this.raw.materialize();
    this.readingBasis = Promise.resolve();
    this.provenanceBasis = null;
  }

  async hasNode(nodeId: string): Promise<boolean> {
    await this.ensureReadingBasis();
    return await this.raw.hasNode(nodeId);
  }

  async getContentMeta(nodeId: string): Promise<WarpContentMeta | null> {
    await this.ensureReadingBasis();
    return await this.raw.getContentMeta(nodeId);
  }

  async getContent(nodeId: string): Promise<Uint8Array | null> {
    await this.ensureReadingBasis();
    return await this.raw.getContent(nodeId);
  }

  async patchesFor(entityId: string): Promise<readonly string[]> {
    await this.ensureProvenanceBasis();
    return await this.provenance.patchesFor(entityId);
  }

  async loadPatchBySha(sha: string): Promise<WarpProvenancePatch> {
    return await this.provenance.loadPatchBySha(sha);
  }
}

class GitWarpWorldlineAdapter implements WarpWorldlinePort {
  constructor(
    private readonly raw: RawNodePropsReader,
    private readonly live: RawWorldline,
    private readonly openHistoricalObserver: RawHistoricalObserverFactory,
  ) {}

  async seek(options?: WarpObserverOptions): Promise<WarpWorldlinePort> {
    const ceiling = historicalCeiling(options);
    if (ceiling !== null) {
      return new GitWarpWorldlineAdapter(
        await this.openHistoricalObserver({ match: "*" }, ceiling),
        this.live,
        this.openHistoricalObserver,
      );
    }
    const live = await this.live.seek(toRawObserverOptions(options));
    return new GitWarpWorldlineAdapter(
      live,
      live,
      this.openHistoricalObserver,
    );
  }

  async getNodeProps(nodeId: string): Promise<Record<string, unknown> | null> {
    return await this.raw.getNodeProps(nodeId);
  }
}

class GitWarpGraphAdapter implements WarpGraphPort {
  private readonly coreAdapter: WarpCorePort;

  constructor(
    private readonly raw: RawWarpApp,
    private readonly openHistoricalObserver: RawHistoricalObserverFactory,
  ) {
    this.coreAdapter = new GitWarpCoreAdapter(raw.core());
  }

  async patch(build: (patch: WarpPatchPort) => void | Promise<void>): Promise<string> {
    return await this.raw.patch(async (rawPatch) => {
      await build(new GitWarpPatchAdapter(rawPatch));
    });
  }

  async observer(lens: WarpLens, options?: WarpObserverOptions): Promise<WarpObserverPort> {
    const ceiling = historicalCeiling(options);
    const rawObserver = ceiling === null
      ? await this.raw.observer(toRawLens(lens), toRawObserverOptions(options))
      : await this.openHistoricalObserver(lens, ceiling);
    return new GitWarpObserverAdapter(rawObserver);
  }

  core(): WarpCorePort {
    return this.coreAdapter;
  }

  worldline(): WarpWorldlinePort {
    const live = this.raw.worldline();
    return new GitWarpWorldlineAdapter(live, live, this.openHistoricalObserver);
  }
}

export interface OpenWarpOptions {
  readonly cwd: string;
  readonly writerId?: string;
  readonly checkpointEvery?: number;
}

export async function openWarp(options: OpenWarpOptions): Promise<WarpGraphPort> {
  const plumbing = await GitPlumbing.createDefault({ cwd: options.cwd });
  const persistence = new GitGraphAdapter({ plumbing: adaptWarpGitPlumbing(plumbing) });
  const openOptions = {
    persistence,
    graphName: GRAPH_NAME,
    writerId: options.writerId ?? DEFAULT_WARP_WRITER_ID,
    checkpointPolicy: { every: options.checkpointEvery ?? DEFAULT_WARP_CHECKPOINT_EVERY },
    onDeleteWithData: "cascade",
  } as const;
  const app = await RawWarpApp.open(openOptions);

  const openHistoricalObserver: RawHistoricalObserverFactory = async (lens, ceiling) => {
    // git-warp 18.2.1 considers a live null-ceiling state-cache snapshot a
    // compatible predecessor of an older bounded ceiling. Replay the exact
    // ceiling without that cache, then snapshot the already-materialized state.
    const historical = await RawWarpApp.open({ ...openOptions, stateCache: null });
    await historical.core().materialize({ ceiling });
    return await historical.observer(toRawLens(lens));
  };

  return new GitWarpGraphAdapter(app, openHistoricalObserver);
}
