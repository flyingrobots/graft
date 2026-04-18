/**
 * Identity enrichment for structural diffs.
 *
 * When WARP indexed truth is available, projects canonical symbol
 * identity (`sid:*`) onto DiffEntry objects. Level 1 address truth
 * (name, kind, signature) is preserved — identityId is additive.
 *
 * Symbols without indexed identity keep identityId undefined.
 * This module never fabricates identity from heuristics.
 */

import { DiffEntry, OutlineDiff } from "../parser/diff.js";
import type { GraftDiffResult, FileDiff } from "./graft-diff.js";

/**
 * Identity lookup: maps symbol name to identityId for a single file.
 */
export type IdentityMap = ReadonlyMap<string, string>;

/**
 * Resolves canonical symbol identities for a file path.
 * Returns an empty map when the file has no indexed symbols.
 */
export type IdentityResolver = (filePath: string) => Promise<IdentityMap>;

/**
 * Enrich a single DiffEntry with identity from the WARP index.
 * Returns a new DiffEntry with identityId when found, or the
 * original entry unchanged when no indexed identity exists.
 */
function enrichEntry(
  entry: DiffEntry,
  identities: IdentityMap,
): DiffEntry {
  const identityId = identities.get(entry.name);
  const enrichedChildDiff = entry.childDiff !== undefined
    ? enrichOutlineDiff(entry.childDiff, identities)
    : undefined;

  // No identity and no child enrichment needed — return original
  if (identityId === undefined && enrichedChildDiff === undefined) {
    return entry;
  }

  return new DiffEntry({
    name: entry.name,
    kind: entry.kind,
    ...(entry.signature !== undefined ? { signature: entry.signature } : {}),
    ...(entry.oldSignature !== undefined ? { oldSignature: entry.oldSignature } : {}),
    ...(enrichedChildDiff !== undefined ? { childDiff: enrichedChildDiff } : entry.childDiff !== undefined ? { childDiff: entry.childDiff } : {}),
    ...(identityId !== undefined ? { identityId } : {}),
  });
}

/**
 * Enrich all entries in an OutlineDiff with WARP identity.
 * Returns undefined if no entries were actually enriched (saves allocation).
 */
function enrichOutlineDiff(
  diff: OutlineDiff,
  identities: IdentityMap,
): OutlineDiff | undefined {
  const enrichedAdded = diff.added.map((e) => enrichEntry(e, identities));
  const enrichedRemoved = diff.removed.map((e) => enrichEntry(e, identities));
  const enrichedChanged = diff.changed.map((e) => enrichEntry(e, identities));

  const anyEnriched =
    enrichedAdded.some((e, i) => e !== diff.added[i]) ||
    enrichedRemoved.some((e, i) => e !== diff.removed[i]) ||
    enrichedChanged.some((e, i) => e !== diff.changed[i]);

  if (!anyEnriched) return undefined;

  return new OutlineDiff({
    added: [...enrichedAdded],
    removed: [...enrichedRemoved],
    changed: [...enrichedChanged],
    continuity: [...diff.continuity],
    unchangedCount: diff.unchangedCount,
  });
}

/**
 * Enrich a GraftDiffResult with canonical symbol identities.
 *
 * For each file in the diff, resolves symbol identities through the
 * provided resolver and attaches them to matching DiffEntry objects.
 * Files with no indexed symbols pass through unchanged.
 *
 * This function is safe to call even when the resolver has no data —
 * it gracefully degrades to returning the original result.
 */
export async function enrichDiffWithIdentity(
  result: GraftDiffResult,
  resolve: IdentityResolver,
): Promise<GraftDiffResult> {
  const enrichedFiles: FileDiff[] = [];
  let anyEnriched = false;

  for (const file of result.files) {
    const identities = await resolve(file.path);

    if (identities.size === 0) {
      enrichedFiles.push(file);
      continue;
    }

    const enrichedDiff = enrichOutlineDiff(file.diff, identities);
    if (enrichedDiff === undefined) {
      enrichedFiles.push(file);
      continue;
    }

    anyEnriched = true;
    enrichedFiles.push({
      ...file,
      diff: enrichedDiff,
    });
  }

  if (!anyEnriched) return result;

  return {
    ...result,
    files: enrichedFiles,
  };
}
