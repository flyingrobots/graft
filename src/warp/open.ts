/**
 * WARP graph initialization — opens the graft-ast graph backed by
 * the repo's own .git directory.
 *
 * Sole construction adapter. After this, git-warp types flow directly.
 */

import WarpApp, { GitGraphAdapter } from "@git-stunts/git-warp";
import GitPlumbing from "@git-stunts/plumbing";
import { DEFAULT_WARP_WRITER_ID } from "./writer-id.js";

export const GRAPH_NAME = "graft-ast";
export const DEFAULT_WARP_CHECKPOINT_EVERY = 128;
const WARP_GIT_MAX_BUFFER_BYTES = 128 * 1024 * 1024;

/**
 * Compaction settings for the AST graph.
 *
 * git-warp ships auto-GC disabled, so a graph opened with defaults never
 * compacts at all. Re-indexing retires a generation of AST anchors on every
 * edit, which makes this graph unusually tombstone-heavy: thresholds well
 * below the library defaults keep compaction tracking that churn rather than
 * waiting for a backlog to accumulate.
 *
 * Field names follow git-warp 16's `gcPolicy`; 17+ renames
 * `maxTimeSinceCompaction` to a tick-based bound, so this object must be
 * revisited with any major upgrade.
 */
export const WARP_GC_POLICY = {
  enabled: true,
  compactOnCheckpoint: true,
  tombstoneRatioThreshold: 0.2,
  entryCountThreshold: 10_000,
  minPatchesSinceCompaction: 256,
  maxTimeSinceCompaction: 300_000,
} as const;

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

export interface OpenWarpOptions {
  readonly cwd: string;
  readonly writerId?: string;
  readonly checkpointEvery?: number;
}

export async function openWarp(options: OpenWarpOptions): Promise<WarpApp> {
  const plumbing = raiseWarpGitBufferLimit(GitPlumbing.createDefault({ cwd: options.cwd }));
  const persistence = new GitGraphAdapter({ plumbing });

  return WarpApp.open({
    persistence,
    graphName: GRAPH_NAME,
    writerId: options.writerId ?? DEFAULT_WARP_WRITER_ID,
    checkpointPolicy: { every: options.checkpointEvery ?? DEFAULT_WARP_CHECKPOINT_EVERY },
    gcPolicy: { ...WARP_GC_POLICY },
    onDeleteWithData: "cascade",
  });
}
