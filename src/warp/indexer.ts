/**
 * WARP Indexer — walks git history and writes structural delta
 * patches into the WARP graph.
 */

import type { WarpHandle } from "../ports/warp.js";
import { assignCanonicalSymbolIdentities } from "./symbol-identity.js";
import {
  applyModifiedSymbols,
  emitDirectoryChain,
  emitSymbols,
  loadPriorIdentityMap,
  removeSymbols,
  resolveParentTick,
} from "./indexer-graph.js";
import { emitAstNodes } from "./ast-emitter.js";
import {
  getCommitChanges,
  getCommitMeta,
  getParentSha,
  hasParent,
  listCommits,
  prepareChange,
} from "./indexer-git.js";
import { fileNodeId, type IndexOptions, type IndexResult } from "./indexer-model.js";

export type { IndexOptions, IndexResult } from "./indexer-model.js";

export async function indexCommits(
  warp: WarpHandle,
  options: IndexOptions,
): Promise<IndexResult> {
  try {
    return await indexCommitsCore(warp, options);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

async function indexCommitsCore(
  warp: WarpHandle,
  options: IndexOptions,
): Promise<IndexResult> {
  const { cwd, git: gitClient } = options;
  const commits = await listCommits(gitClient, cwd, options.from, options.to);

  let patchesWritten = 0;
  const commitTicks = new Map<string, number>();
  const liveIdentityByFile = new Map<string, Map<string, string>>();

  for (const sha of commits) {
    const changes = await getCommitChanges(gitClient, sha, cwd);
    const hasRemovals = changes.some((change) =>
      change.status === "D" || change.status === "M" || change.status === "R"
    );
    if (hasRemovals) {
      await warp.materialize();
    }

    const meta = await getCommitMeta(gitClient, sha, cwd);
    const parentExists = await hasParent(gitClient, sha, cwd);
    const parentRef = `${sha}~1`;
    const parentSha = parentExists ? await getParentSha(gitClient, sha, cwd) : null;
    const preparedChanges = await Promise.all(changes.map((change) =>
      prepareChange(gitClient, cwd, sha, parentRef, parentExists, change)
    ));
    const parentTick = await resolveParentTick(warp, commitTicks, parentSha);

    const resolvedChanges = await Promise.all(preparedChanges.map(async (change) => {
      const oldIdentitySourcePath = change.previousPath ?? change.filePath;
      const oldIdentityByPath = await loadPriorIdentityMap(
        warp,
        liveIdentityByFile,
        oldIdentitySourcePath,
        parentTick,
      );
      const newIdentityByPath = change.lang !== null && change.newOutline !== undefined
        ? assignCanonicalSymbolIdentities({
          oldEntries: change.oldOutline,
          newEntries: change.newOutline,
          oldIdentityByPath,
          commitSha: sha,
          filePath: change.filePath,
        })
        : new Map<string, string>();

      return {
        ...change,
        newIdentityByPath,
      };
    }));

    await warp.patch((builder) => {
      const patch = builder;
      const commitId = `commit:${sha}`;
      patch.addNode(commitId);
      patch.setProperty(commitId, "sha", sha);
      patch.setProperty(commitId, "message", meta.message);
      patch.setProperty(commitId, "author", meta.author);
      patch.setProperty(commitId, "email", meta.email);
      patch.setProperty(commitId, "timestamp", meta.timestamp);
      patch.setProperty(commitId, "tick", patchesWritten + 1);

      for (const change of resolvedChanges) {
        if (change.status === "D") {
          if (change.lang !== null) {
            removeSymbols(patch, change.filePath, change.oldOutline, "", commitId);
          }
          patch.removeNode(change.fileId);
          continue;
        }

        patch.addNode(change.fileId);
        patch.setProperty(change.fileId, "path", change.filePath);
        patch.setProperty(change.fileId, "lang", change.lang ?? "unknown");
        patch.addEdge(commitId, change.fileId, "touches");
        emitDirectoryChain(patch, change.filePath);

        if (change.lang === null || change.newOutline === undefined || change.jumpLookup === undefined) {
          continue;
        }

        if (change.status === "R" && change.previousPath !== undefined) {
          removeSymbols(patch, change.previousPath, change.oldOutline, "", commitId);
          patch.removeNode(fileNodeId(change.previousPath));
          emitSymbols(
            patch,
            change.filePath,
            change.newOutline,
            change.jumpLookup,
            change.newIdentityByPath,
            undefined,
            "",
            commitId,
          );
          if (change.parsedTree !== undefined) {
            emitAstNodes(patch, change.filePath, change.parsedTree.root);
          }
          continue;
        }

        if (change.status === "A" || !change.parentExists || change.diff === undefined) {
          emitSymbols(
            patch,
            change.filePath,
            change.newOutline,
            change.jumpLookup,
            change.newIdentityByPath,
            undefined,
            "",
            commitId,
          );
          if (change.parsedTree !== undefined) {
            emitAstNodes(patch, change.filePath, change.parsedTree.root);
          }
          continue;
        }

        applyModifiedSymbols(
          patch,
          change.filePath,
          change.fileId,
          commitId,
          change.oldOutline,
          change.newOutline,
          change.jumpLookup,
          change.newIdentityByPath,
        );

        // Emit full AST for modified files
        if (change.parsedTree !== undefined) {
          emitAstNodes(patch, change.filePath, change.parsedTree.root);
        }
      }
    });

    patchesWritten++;
    commitTicks.set(sha, patchesWritten);

    // Release parsed tree-sitter trees
    for (const change of resolvedChanges) {
      change.parsedTree?.delete();
    }

    for (const change of resolvedChanges) {
      if (change.status === "D") {
        liveIdentityByFile.delete(change.filePath);
        continue;
      }
      if (change.previousPath !== undefined && change.previousPath !== change.filePath) {
        liveIdentityByFile.delete(change.previousPath);
      }
      if (change.newOutline !== undefined && change.lang !== null) {
        liveIdentityByFile.set(change.filePath, new Map(change.newIdentityByPath));
      } else {
        liveIdentityByFile.delete(change.filePath);
      }
    }
  }

  return { ok: true, commitsIndexed: commits.length, patchesWritten, commitTicks };
}
