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

type SemverImpact = ExportSurfaceDiffResult["semverImpact"];

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

interface ParsedParameter {
  readonly type: string;
  readonly required: boolean;
}

interface ParsedSignature {
  readonly parameters: readonly ParsedParameter[];
  readonly returnType: string;
}

function normalizeSignaturePart(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function findMatchingParen(signature: string, openIndex: number): number {
  let depth = 0;
  for (let index = openIndex; index < signature.length; index += 1) {
    const char = signature[index];
    if (char === "(") {
      depth += 1;
    } else if (char === ")") {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }
  return -1;
}

function splitTopLevelCommaList(value: string): string[] {
  const parts: string[] = [];
  let start = 0;
  let angle = 0;
  let brace = 0;
  let bracket = 0;
  let paren = 0;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (char === "<") angle += 1;
    else if (char === ">" && angle > 0) angle -= 1;
    else if (char === "{") brace += 1;
    else if (char === "}" && brace > 0) brace -= 1;
    else if (char === "[") bracket += 1;
    else if (char === "]" && bracket > 0) bracket -= 1;
    else if (char === "(") paren += 1;
    else if (char === ")" && paren > 0) paren -= 1;
    else if (char === "," && angle === 0 && brace === 0 && bracket === 0 && paren === 0) {
      const part = value.slice(start, index).trim();
      if (part.length > 0) parts.push(part);
      start = index + 1;
    }
  }

  const tail = value.slice(start).trim();
  if (tail.length > 0) parts.push(tail);
  return parts;
}

function findTopLevelColon(value: string): number {
  let angle = 0;
  let brace = 0;
  let bracket = 0;
  let paren = 0;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (char === "<") angle += 1;
    else if (char === ">" && angle > 0) angle -= 1;
    else if (char === "{") brace += 1;
    else if (char === "}" && brace > 0) brace -= 1;
    else if (char === "[") bracket += 1;
    else if (char === "]" && bracket > 0) bracket -= 1;
    else if (char === "(") paren += 1;
    else if (char === ")" && paren > 0) paren -= 1;
    else if (char === ":" && angle === 0 && brace === 0 && bracket === 0 && paren === 0) {
      return index;
    }
  }

  return -1;
}

function findTopLevelEquals(value: string): number {
  let angle = 0;
  let brace = 0;
  let bracket = 0;
  let paren = 0;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (char === "<") angle += 1;
    else if (char === ">" && angle > 0) angle -= 1;
    else if (char === "{") brace += 1;
    else if (char === "}" && brace > 0) brace -= 1;
    else if (char === "[") bracket += 1;
    else if (char === "]" && bracket > 0) bracket -= 1;
    else if (char === "(") paren += 1;
    else if (char === ")" && paren > 0) paren -= 1;
    else if (char === "=" && angle === 0 && brace === 0 && bracket === 0 && paren === 0) {
      return index;
    }
  }

  return -1;
}

function parseParameter(rawParameter: string): ParsedParameter {
  const equalsIndex = findTopLevelEquals(rawParameter);
  const declaration = equalsIndex === -1 ? rawParameter : rawParameter.slice(0, equalsIndex);
  const normalized = normalizeSignaturePart(declaration);
  const required = !/^\s*\.\.\./.test(declaration)
    && !/^[^:=]+?\?\s*:/.test(declaration)
    && equalsIndex === -1;
  const colonIndex = findTopLevelColon(declaration);
  const type = colonIndex === -1
    ? normalized
    : normalizeSignaturePart(declaration.slice(colonIndex + 1));
  return { type, required };
}

function parseSignature(signature: string | undefined): ParsedSignature | null {
  if (signature === undefined) {
    return null;
  }

  const openIndex = signature.indexOf("(");
  if (openIndex === -1) {
    return null;
  }

  const closeIndex = findMatchingParen(signature, openIndex);
  if (closeIndex === -1) {
    return null;
  }

  const parameterText = signature.slice(openIndex + 1, closeIndex).trim();
  const parameters = parameterText.length === 0
    ? []
    : splitTopLevelCommaList(parameterText).map(parseParameter);
  const trailing = signature.slice(closeIndex + 1).trim();
  const returnType = trailing.startsWith(":")
    ? normalizeSignaturePart(trailing.slice(1))
    : "";

  return { parameters, returnType };
}

function classifySignatureImpact(change: ExportChange): SemverImpact {
  const previous = parseSignature(change.previousSignature);
  const next = parseSignature(change.signature);
  if (previous === null || next === null) {
    return "major";
  }

  if (previous.returnType !== next.returnType) {
    return "major";
  }

  for (let index = 0; index < previous.parameters.length; index += 1) {
    const previousParam = previous.parameters[index];
    const nextParam = next.parameters[index];
    if (previousParam === undefined || nextParam === undefined) {
      return "major";
    }
    if (previousParam.type !== nextParam.type) {
      return "major";
    }
    if (!previousParam.required && nextParam.required) {
      return "major";
    }
  }

  const addedParameters = next.parameters.slice(previous.parameters.length);
  if (addedParameters.some((parameter) => parameter.required)) {
    return "major";
  }
  if (addedParameters.length > 0) {
    return "minor";
  }

  return "patch";
}

function deriveSemverImpact(
  added: readonly ExportChange[],
  removed: readonly ExportChange[],
  changed: readonly ExportChange[],
): SemverImpact {
  if (removed.length > 0) return "major";
  if (changed.some((change) => classifySignatureImpact(change) === "major")) return "major";
  if (added.length > 0) return "minor";
  if (changed.some((change) => classifySignatureImpact(change) === "minor")) return "minor";
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
