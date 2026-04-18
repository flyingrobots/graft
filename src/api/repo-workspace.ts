import * as path from "node:path";
import { CanonicalJsonCodec } from "../adapters/canonical-json.js";
import { nodeFs } from "../adapters/node-fs.js";
import { createRepoPathResolver, toRepoPolicyPath } from "../adapters/repo-paths.js";
import { ObservationCache } from "../operations/observation-cache.js";
import { RepoWorkspace } from "../operations/repo-workspace.js";
import { GovernorTracker } from "../session/tracker.js";
import type { JsonCodec } from "../ports/codec.js";
import type { FileSystem } from "../ports/filesystem.js";

export interface CreateRepoWorkspaceOptions {
  readonly cwd?: string | undefined;
  readonly graftignorePatterns?: readonly string[] | undefined;
  readonly fs?: FileSystem | undefined;
  readonly codec?: JsonCodec | undefined;
  readonly governor?: GovernorTracker | undefined;
  readonly cache?: ObservationCache | undefined;
}

export async function createRepoWorkspace(options: CreateRepoWorkspaceOptions = {}): Promise<RepoWorkspace> {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const fs = options.fs ?? nodeFs;
  const codec = options.codec ?? new CanonicalJsonCodec();
  return new RepoWorkspace({
    projectRoot: cwd,
    fs,
    codec,
    graftignorePatterns: options.graftignorePatterns ?? await RepoWorkspace.loadGraftignorePatterns(fs, cwd),
    resolvePath: createRepoPathResolver(cwd),
    toPolicyPath: (resolvedPath) => toRepoPolicyPath(cwd, resolvedPath),
    ...(options.governor !== undefined ? { governor: options.governor } : {}),
    ...(options.cache !== undefined ? { cache: options.cache } : {}),
  });
}
