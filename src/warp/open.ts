/**
 * git-warp secondary adapter.
 *
 * This is the sole production module that constructs or calls package-owned
 * git-warp runtime objects. Callers receive only the Graft-owned graph port.
 */

import RawWarpApp, { GitGraphAdapter } from "@git-stunts/git-warp";
import GitPlumbing from "@git-stunts/plumbing";
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

interface GitExecuteOptions {
  readonly args: string[];
  readonly input?: string | Uint8Array;
  readonly env?: Record<string, string>;
  readonly maxBytes?: number;
}

interface GitStreamLike {
  readonly finished: Promise<{ code: number; stderr: string; error?: Error | undefined }>;
  collect(opts?: { maxBytes?: number; asString?: boolean; encoding?: string }): Promise<Uint8Array | string>;
  [Symbol.asyncIterator](): AsyncIterator<Uint8Array>;
}

function raiseWarpGitBufferLimit(plumbing: GitPlumbing): GitPlumbing {
  const execute = plumbing.execute.bind(plumbing);
  plumbing.execute = ((options: GitExecuteOptions) => execute({
    ...options,
    maxBytes: options.maxBytes ?? WARP_GIT_MAX_BUFFER_BYTES,
  })) as GitPlumbing["execute"];

  const executeStream = plumbing.executeStream.bind(plumbing);
  plumbing.executeStream = (async (options: { args: string[]; input?: string | Uint8Array; env?: Record<string, string> }) => {
    const stream = await executeStream(options);
    const collect = stream.collect.bind(stream);
    stream.collect = (opts = {}) => collect({
      ...opts,
      maxBytes: opts.maxBytes ?? WARP_GIT_MAX_BUFFER_BYTES,
    });
    return stream as GitStreamLike;
  }) as GitPlumbing["executeStream"];

  return plumbing;
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
  if (options === undefined) return undefined;
  if (options.source === undefined) return {};
  return {
    source: {
      kind: "live",
      ...(options.source.ceiling !== undefined ? { ceiling: options.source.ceiling } : {}),
    },
  };
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

  constructor(private readonly raw: RawCore) {
    assertProvenanceTimelinePort(raw);
    this.provenance = raw;
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
      return { receipts: result.receipts };
    }
    await this.raw.materialize();
  }

  async hasNode(nodeId: string): Promise<boolean> {
    return await this.raw.hasNode(nodeId);
  }

  async getContentMeta(nodeId: string): Promise<WarpContentMeta | null> {
    return await this.raw.getContentMeta(nodeId);
  }

  async getContent(nodeId: string): Promise<Uint8Array | null> {
    return await this.raw.getContent(nodeId);
  }

  async patchesFor(entityId: string): Promise<readonly string[]> {
    return await this.provenance.patchesFor(entityId);
  }

  async loadPatchBySha(sha: string): Promise<WarpProvenancePatch> {
    return await this.provenance.loadPatchBySha(sha);
  }
}

class GitWarpWorldlineAdapter implements WarpWorldlinePort {
  constructor(private readonly raw: RawWorldline) {}

  async seek(options?: WarpObserverOptions): Promise<WarpWorldlinePort> {
    return new GitWarpWorldlineAdapter(
      await this.raw.seek(toRawObserverOptions(options)),
    );
  }

  async getNodeProps(nodeId: string): Promise<Record<string, unknown> | null> {
    return await this.raw.getNodeProps(nodeId);
  }
}

class GitWarpGraphAdapter implements WarpGraphPort {
  private readonly coreAdapter: WarpCorePort;

  constructor(private readonly raw: RawWarpApp) {
    this.coreAdapter = new GitWarpCoreAdapter(raw.core());
  }

  async patch(build: (patch: WarpPatchPort) => void | Promise<void>): Promise<string> {
    return await this.raw.patch(async (rawPatch) => {
      await build(new GitWarpPatchAdapter(rawPatch));
    });
  }

  async observer(lens: WarpLens, options?: WarpObserverOptions): Promise<WarpObserverPort> {
    const rawObserver = await this.raw.observer(
      toRawLens(lens),
      toRawObserverOptions(options),
    );
    return new GitWarpObserverAdapter(rawObserver);
  }

  core(): WarpCorePort {
    return this.coreAdapter;
  }

  worldline(): WarpWorldlinePort {
    return new GitWarpWorldlineAdapter(this.raw.worldline());
  }
}

export interface OpenWarpOptions {
  readonly cwd: string;
  readonly writerId?: string;
  readonly checkpointEvery?: number;
}

export async function openWarp(options: OpenWarpOptions): Promise<WarpGraphPort> {
  const plumbing = raiseWarpGitBufferLimit(GitPlumbing.createDefault({ cwd: options.cwd }));
  const persistence = new GitGraphAdapter({ plumbing });

  const app = await RawWarpApp.open({
    persistence,
    graphName: GRAPH_NAME,
    writerId: options.writerId ?? DEFAULT_WARP_WRITER_ID,
    checkpointPolicy: { every: options.checkpointEvery ?? DEFAULT_WARP_CHECKPOINT_EVERY },
    onDeleteWithData: "cascade",
  });

  return new GitWarpGraphAdapter(app);
}
