import { diffOutlines } from "../parser/diff.js";
import type {
  AnchorAffinityResult,
  BufferRange,
  ChangedRegion,
  SemanticSummaryResult,
  StructuredBufferDiffResult,
  StructuredBufferSnapshot,
  SyntaxSpan,
} from "./structured-buffer-model.js";
import {
  buildNamedPath,
  emptyRangeAt,
  findCoveringNamedNode,
  followNamedPath,
  indexToPoint,
  nodeName,
  nodeRange,
  normalizeSelection,
  point,
  pointToIndex,
} from "./structured-buffer-model.js";
import { buildOutlineResult, buildSyntaxSpansResult } from "./structured-buffer-query.js";

function lineTable(source: string): readonly string[] {
  return source.split("\n");
}

function lineRangeToRange(lines: readonly string[], startLine: number, endLineExclusive: number): BufferRange {
  if (startLine >= lines.length) {
    const row = Math.max(lines.length - 1, 0);
    return emptyRangeAt(point(row, lines[row]?.length ?? 0));
  }
  if (endLineExclusive <= startLine) {
    return emptyRangeAt(point(startLine, 0));
  }
  const endRow = Math.min(endLineExclusive - 1, lines.length - 1);
  return {
    start: point(startLine, 0),
    end: point(endRow, lines[endRow]?.length ?? 0),
  };
}

function lcsDiffRegions(oldSource: string, newSource: string): ChangedRegion[] {
  const oldLines = lineTable(oldSource);
  const newLines = lineTable(newSource);
  const rows = oldLines.length;
  const cols = newLines.length;
  const table: number[][] = Array.from(
    { length: rows + 1 },
    (): number[] => Array.from({ length: cols + 1 }, () => 0),
  );
  for (let row = rows - 1; row >= 0; row -= 1) {
    const rowEntry = table[row];
    if (rowEntry === undefined) {
      continue;
    }
    for (let col = cols - 1; col >= 0; col -= 1) {
      if (oldLines[row] === newLines[col]) {
        rowEntry[col] = (table[row + 1]?.[col + 1] ?? 0) + 1;
      } else {
        rowEntry[col] = Math.max(table[row + 1]?.[col] ?? 0, rowEntry[col + 1] ?? 0);
      }
    }
  }

  const operations: { readonly kind: "equal" | "delete" | "insert"; readonly oldIndex: number; readonly newIndex: number }[] = [];
  let oldIndex = 0;
  let newIndex = 0;
  while (oldIndex < rows && newIndex < cols) {
    if (oldLines[oldIndex] === newLines[newIndex]) {
      operations.push({ kind: "equal", oldIndex, newIndex });
      oldIndex += 1;
      newIndex += 1;
      continue;
    }
    const down = table[oldIndex + 1]?.[newIndex] ?? 0;
    const right = table[oldIndex]?.[newIndex + 1] ?? 0;
    if (down >= right) {
      operations.push({ kind: "delete", oldIndex, newIndex });
      oldIndex += 1;
    } else {
      operations.push({ kind: "insert", oldIndex, newIndex });
      newIndex += 1;
    }
  }
  while (oldIndex < rows) {
    operations.push({ kind: "delete", oldIndex, newIndex });
    oldIndex += 1;
  }
  while (newIndex < cols) {
    operations.push({ kind: "insert", oldIndex, newIndex });
    newIndex += 1;
  }

  const regions: ChangedRegion[] = [];
  let index = 0;
  while (index < operations.length) {
    if (operations[index]?.kind === "equal") {
      index += 1;
      continue;
    }
    const startOld = operations[index]?.oldIndex ?? 0;
    const startNew = operations[index]?.newIndex ?? 0;
    let endOld = startOld;
    let endNew = startNew;
    while (index < operations.length && operations[index]?.kind !== "equal") {
      const op = operations[index];
      if (op?.kind === "delete") {
        endOld = op.oldIndex + 1;
      }
      if (op?.kind === "insert") {
        endNew = op.newIndex + 1;
      }
      index += 1;
    }
    regions.push({
      kind: endOld === startOld ? "insert" : (endNew === startNew ? "delete" : "replace"),
      oldRange: lineRangeToRange(oldLines, startOld, endOld),
      newRange: lineRangeToRange(newLines, startNew, endNew),
      oldText: oldLines.slice(startOld, endOld).join("\n"),
      newText: newLines.slice(startNew, endNew).join("\n"),
    });
  }
  return regions;
}

function envelopeDiffRegion(oldSource: string, newSource: string): ChangedRegion[] {
  let prefix = 0;
  while (prefix < oldSource.length && prefix < newSource.length && oldSource[prefix] === newSource[prefix]) {
    prefix += 1;
  }
  let oldSuffix = oldSource.length;
  let newSuffix = newSource.length;
  while (oldSuffix > prefix && newSuffix > prefix && oldSource[oldSuffix - 1] === newSource[newSuffix - 1]) {
    oldSuffix -= 1;
    newSuffix -= 1;
  }
  if (prefix === oldSource.length && prefix === newSource.length) {
    return [];
  }
  return [{
    kind: prefix === oldSuffix ? "insert" : (prefix === newSuffix ? "delete" : "replace"),
    oldRange: { start: indexToPoint(oldSource, prefix), end: indexToPoint(oldSource, oldSuffix) },
    newRange: { start: indexToPoint(newSource, prefix), end: indexToPoint(newSource, newSuffix) },
    oldText: oldSource.slice(prefix, oldSuffix),
    newText: newSource.slice(prefix, newSuffix),
  }];
}

function diffChangedRegions(oldSource: string, newSource: string): ChangedRegion[] {
  const totalLines = lineTable(oldSource).length * lineTable(newSource).length;
  if (totalLines <= 40000) {
    return lcsDiffRegions(oldSource, newSource);
  }
  return envelopeDiffRegion(oldSource, newSource);
}

function normalizedWithoutWhitespace(source: string): string {
  return source.replace(/\s+/g, "");
}

function stripCommentText(source: string, spans: readonly SyntaxSpan[]): string {
  const commentSpans = spans.filter((span) => span.className === "comment");
  if (commentSpans.length === 0) {
    return source;
  }
  const sorted = [...commentSpans].sort((left, right) => pointToIndex(source, left.range.start) - pointToIndex(source, right.range.start));
  let cursor = 0;
  let output = "";
  for (const span of sorted) {
    const start = pointToIndex(source, span.range.start);
    const end = pointToIndex(source, span.range.end);
    if (start > cursor) {
      output += source.slice(cursor, start);
    }
    cursor = Math.max(cursor, end);
  }
  if (cursor < source.length) {
    output += source.slice(cursor);
  }
  return output;
}

function simpleRenameFact(diff: StructuredBufferDiffResult["outlineDiff"]): string | null {
  if (diff.changed.length === 0 && diff.continuity.length === 1) {
    const [continuity] = diff.continuity;
    if (continuity === undefined) {
      return null;
    }
    return `renamed ${continuity.symbolKind} ${continuity.oldName} to ${continuity.newName}`;
  }
  return null;
}

export function buildDiffResult(current: StructuredBufferSnapshot, next: StructuredBufferSnapshot): StructuredBufferDiffResult {
  const currentOutline = buildOutlineResult(current);
  const nextOutline = buildOutlineResult(next);
  return {
    path: next.path,
    format: next.format,
    fromBasis: current.basis,
    toBasis: next.basis,
    partial: current.partial || next.partial,
    outlineDiff: diffOutlines(currentOutline.outline, nextOutline.outline),
    changedRegions: diffChangedRegions(current.content, next.content),
  };
}

export function buildSemanticSummaryResult(current: StructuredBufferSnapshot, next: StructuredBufferSnapshot): SemanticSummaryResult {
  const diff = buildDiffResult(current, next);
  if (current.content === next.content) {
    return {
      path: next.path,
      format: next.format,
      fromBasis: current.basis,
      toBasis: next.basis,
      partial: diff.partial,
      kind: "no_changes",
      summary: "No changes",
      facts: [],
    };
  }
  if (normalizedWithoutWhitespace(current.content) === normalizedWithoutWhitespace(next.content)) {
    return {
      path: next.path,
      format: next.format,
      fromBasis: current.basis,
      toBasis: next.basis,
      partial: diff.partial,
      kind: "whitespace_only",
      summary: "Edited whitespace only",
      facts: [],
    };
  }
  const currentWithoutComments = stripCommentText(current.content, buildSyntaxSpansResult(current).spans);
  const nextWithoutComments = stripCommentText(next.content, buildSyntaxSpansResult(next).spans);
  if (normalizedWithoutWhitespace(currentWithoutComments) === normalizedWithoutWhitespace(nextWithoutComments)) {
    return {
      path: next.path,
      format: next.format,
      fromBasis: current.basis,
      toBasis: next.basis,
      partial: diff.partial,
      kind: "comments_only",
      summary: "Edited comments only",
      facts: [],
    };
  }
  const renameFact = simpleRenameFact(diff.outlineDiff);
  if (renameFact !== null) {
    return {
      path: next.path,
      format: next.format,
      fromBasis: current.basis,
      toBasis: next.basis,
      partial: diff.partial,
      kind: "renamed_symbol",
      summary: renameFact,
      facts: [renameFact],
    };
  }
  if (diff.outlineDiff.added.length > 0 && diff.outlineDiff.removed.length === 0 && diff.outlineDiff.changed.length === 0) {
    const first = diff.outlineDiff.added[0];
    const summary = first === undefined ? "Added symbol" : `added ${first.kind} ${first.name}`;
    return {
      path: next.path,
      format: next.format,
      fromBasis: current.basis,
      toBasis: next.basis,
      partial: diff.partial,
      kind: "added_symbol",
      summary,
      facts: [summary],
    };
  }
  if (diff.outlineDiff.removed.length > 0 && diff.outlineDiff.added.length === 0 && diff.outlineDiff.changed.length === 0) {
    const first = diff.outlineDiff.removed[0];
    const summary = first === undefined ? "Removed symbol" : `removed ${first.kind} ${first.name}`;
    return {
      path: next.path,
      format: next.format,
      fromBasis: current.basis,
      toBasis: next.basis,
      partial: diff.partial,
      kind: "removed_symbol",
      summary,
      facts: [summary],
    };
  }
  const signatureChange = diff.outlineDiff.changed.find((entry) => entry.oldSignature !== undefined || entry.signature !== undefined);
  if (signatureChange !== undefined) {
    const summary = `changed signature for ${signatureChange.kind} ${signatureChange.name}`;
    return {
      path: next.path,
      format: next.format,
      fromBasis: current.basis,
      toBasis: next.basis,
      partial: diff.partial,
      kind: "changed_signature",
      summary,
      facts: [summary],
    };
  }
  if (diff.outlineDiff.added.length > 0 || diff.outlineDiff.removed.length > 0 || diff.outlineDiff.changed.length > 0) {
    return {
      path: next.path,
      format: next.format,
      fromBasis: current.basis,
      toBasis: next.basis,
      partial: diff.partial,
      kind: "changed_structure",
      summary: "Changed structure",
      facts: [
        `${String(diff.outlineDiff.added.length)} added`,
        `${String(diff.outlineDiff.removed.length)} removed`,
        `${String(diff.outlineDiff.changed.length)} changed`,
      ],
    };
  }
  if (diff.changedRegions.length > 0) {
    return {
      path: next.path,
      format: next.format,
      fromBasis: current.basis,
      toBasis: next.basis,
      partial: diff.partial,
      kind: "changed_regions_only",
      summary: "Edited buffer regions without structural changes",
      facts: [`${String(diff.changedRegions.length)} changed region(s)`],
    };
  }
  return {
    path: next.path,
    format: next.format,
    fromBasis: current.basis,
    toBasis: next.basis,
    partial: diff.partial,
    kind: "mixed_edit",
    summary: "Edited code",
    facts: [],
  };
}

export function buildAnchorAffinityResult(
  current: StructuredBufferSnapshot,
  next: StructuredBufferSnapshot,
  selection: BufferRange,
): AnchorAffinityResult {
  if (current.parsed === null || next.parsed === null) {
    return {
      path: next.path,
      format: next.format,
      fromBasis: current.basis,
      toBasis: next.basis,
      partial: current.partial || next.partial,
      oldRange: selection,
      newRange: null,
      status: "lost",
      strategy: "none",
      confidence: "low",
      reason: "UNSUPPORTED_LANGUAGE",
    };
  }
  const target = findCoveringNamedNode(current.parsed.root, normalizeSelection(selection));
  const pathMatch = followNamedPath(next.parsed.root, buildNamedPath(target));
  if (pathMatch !== null && pathMatch.type === target.type) {
    return {
      path: next.path,
      format: next.format,
      fromBasis: current.basis,
      toBasis: next.basis,
      partial: current.partial || next.partial,
      oldRange: selection,
      newRange: nodeRange(pathMatch),
      status: "mapped",
      strategy: "named_path",
      confidence: "high",
    };
  }
  const name = nodeName(target);
  if (name !== undefined) {
    const candidates = next.parsed.root.descendantsOfType(target.type).filter((node) => nodeName(node) === name);
    const onlyCandidate = candidates[0];
    if (candidates.length === 1 && onlyCandidate !== undefined) {
      return {
        path: next.path,
        format: next.format,
        fromBasis: current.basis,
        toBasis: next.basis,
        partial: current.partial || next.partial,
        oldRange: selection,
        newRange: nodeRange(onlyCandidate),
        status: "mapped",
        strategy: "named_search",
        confidence: "medium",
      };
    }
  }
  const textCandidates = next.parsed.root.descendantsOfType(target.type).filter((node) => node.text === target.text);
  const onlyTextCandidate = textCandidates[0];
  if (textCandidates.length === 1 && onlyTextCandidate !== undefined) {
    return {
      path: next.path,
      format: next.format,
      fromBasis: current.basis,
      toBasis: next.basis,
      partial: current.partial || next.partial,
      oldRange: selection,
      newRange: nodeRange(onlyTextCandidate),
      status: "mapped",
      strategy: "text_search",
      confidence: "low",
    };
  }
  return {
    path: next.path,
    format: next.format,
    fromBasis: current.basis,
    toBasis: next.basis,
    partial: current.partial || next.partial,
    oldRange: selection,
    newRange: null,
    status: "lost",
    strategy: "none",
    confidence: "low",
    reason: "ANCHOR_NOT_FOUND",
  };
}
