// ---------------------------------------------------------------------------
// Export surface diff — what changed in the public API between two refs?
// ---------------------------------------------------------------------------

import type { GitClient } from "../ports/git.js";
import { getChangedFiles, getFileAtRef } from "../git/diff.js";
import { detectLang } from "../parser/lang.js";
import { extractOutline } from "../parser/outline.js";
import type { OutlineEntry } from "../parser/types.js";
import { toJsonObject } from "./result-dto.js";
import type { JsonObject } from "../contracts/json-object.js";

// ---- Public types ---------------------------------------------------------

export interface ExportChange {
  readonly symbol: string;
  readonly filePath: string;
  readonly kind: string;
  readonly changeType: "added" | "removed" | "signature_changed";
  readonly signature?: string | undefined;
  readonly previousSignature?: string | undefined;
}

export interface ExportSurfaceDiffResult {
  readonly base: string;
  readonly head: string;
  readonly added: readonly ExportChange[];
  readonly removed: readonly ExportChange[];
  readonly changed: readonly ExportChange[];
  readonly semverImpact: "major" | "minor" | "patch" | "none";
  readonly summary: string;
}

export interface ExportSurfaceDiffOptions {
  readonly cwd: string;
  readonly git: GitClient;
  readonly base?: string | undefined;
  readonly head?: string | undefined;
}

// ---- Internal helpers -----------------------------------------------------

function exportKey(entry: OutlineEntry): string {
  return `${entry.kind}:${entry.name}`;
}

function extractExportedEntries(
  content: string | null,
  filePath: string,
): Map<string, OutlineEntry> {
  if (content === null) return new Map();
  const lang = detectLang(filePath);
  if (lang === null) return new Map();
  const outline = extractOutline(content, lang);
  const result = new Map<string, OutlineEntry>();
  for (const entry of outline.entries) {
    if (entry.exported) {
      result.set(exportKey(entry), entry);
    }
  }
  return result;
}

function deriveSemverImpact(
  added: readonly ExportChange[],
  removed: readonly ExportChange[],
  changed: readonly ExportChange[],
): "major" | "minor" | "patch" | "none" {
  if (removed.length > 0) return "major";
  if (added.length > 0) return "minor";
  if (changed.length > 0) return "patch";
  return "none";
}

function buildSummary(
  added: readonly ExportChange[],
  removed: readonly ExportChange[],
  changed: readonly ExportChange[],
  semverImpact: string,
): string {
  const total = added.length + removed.length + changed.length;
  if (total === 0) return "No exported API changes.";
  const parts: string[] = [];
  if (added.length > 0) parts.push(`+${String(added.length)} added`);
  if (removed.length > 0) parts.push(`-${String(removed.length)} removed`);
  if (changed.length > 0) parts.push(`~${String(changed.length)} changed`);
  return `${parts.join(", ")} exported symbols. Semver impact: ${semverImpact}.`;
}

// ---- Public API -----------------------------------------------------------

/**
 * Compute the export surface diff between two git refs.
 *
 * Extracts outlines at both refs, filters to exported symbols, and
 * classifies additions, removals, and signature changes. Derives
 * the semver impact from the change set.
 */
export async function exportSurfaceDiff(
  opts: ExportSurfaceDiffOptions,
): Promise<ExportSurfaceDiffResult> {
  const { cwd, git } = opts;
  const base = opts.base ?? "HEAD~1";
  const head = opts.head ?? "HEAD";

  const changedFiles = await getChangedFiles({ cwd, git, base, head });

  const added: ExportChange[] = [];
  const removed: ExportChange[] = [];
  const changed: ExportChange[] = [];

  for (const filePath of changedFiles) {
    const baseContent = await getFileAtRef(base, filePath, { cwd, git });

    const headContent = await getFileAtRef(head, filePath, { cwd, git });

    const baseExports = extractExportedEntries(baseContent, filePath);
    const headExports = extractExportedEntries(headContent, filePath);

    // Detect added and changed exports
    for (const [key, headEntry] of headExports) {
      const baseEntry = baseExports.get(key);
      if (baseEntry === undefined) {
        added.push({
          symbol: headEntry.name,
          filePath,
          kind: headEntry.kind,
          changeType: "added",
          signature: headEntry.signature,
        });
      } else if (headEntry.signature !== baseEntry.signature) {
        changed.push({
          symbol: headEntry.name,
          filePath,
          kind: headEntry.kind,
          changeType: "signature_changed",
          signature: headEntry.signature,
          previousSignature: baseEntry.signature,
        });
      }
    }

    // Detect removed exports
    for (const [key, baseEntry] of baseExports) {
      if (!headExports.has(key)) {
        removed.push({
          symbol: baseEntry.name,
          filePath,
          kind: baseEntry.kind,
          changeType: "removed",
          signature: baseEntry.signature,
        });
      }
    }
  }

  const semverImpact = deriveSemverImpact(added, removed, changed);
  const summary = buildSummary(added, removed, changed, semverImpact);

  return { base, head, added, removed, changed, semverImpact, summary };
}

/** Serialize an ExportSurfaceDiffResult for MCP / CLI output. */
export function exportSurfaceDiffToJson(result: ExportSurfaceDiffResult): JsonObject {
  return toJsonObject(result);
}
