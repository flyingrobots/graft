// ---------------------------------------------------------------------------
// Markdown outline extraction — heading-based structural summary
// ---------------------------------------------------------------------------

import { OutlineEntry, JumpEntry } from "./types.js";
import type { OutlineResult } from "./types.js";

interface MarkdownHeading {
  level: number;
  name: string;
  start: number;
  end: number;
}

interface MarkdownHeadingNode extends MarkdownHeading {
  children: MarkdownHeadingNode[];
}

// ---------------------------------------------------------------------------
// Fence detection
// ---------------------------------------------------------------------------

function isFenceLine(line: string): { marker: "`" | "~"; length: number } | null {
  const match = /^\s*([`~])\1{2,}.*$/.exec(line);
  if (match === null) return null;

  const marker = match[1];
  if (marker !== "`" && marker !== "~") return null;
  const markerRun = /^([`~]+)/.exec(match[0].trimStart());
  if (markerRun === null) return null;
  const run = markerRun[1];
  if (run === undefined) return null;
  return { marker, length: run.length };
}

function isFenceClose(line: string, marker: "`" | "~", length: number): boolean {
  const pattern = marker === "`"
    ? new RegExp(`^\\s*\`{${String(length)},}\\s*$`)
    : new RegExp(`^\\s*~{${String(length)},}\\s*$`);
  return pattern.test(line);
}

// ---------------------------------------------------------------------------
// Heading parsing
// ---------------------------------------------------------------------------

function parseAtxHeading(line: string, lineNumber: number): MarkdownHeading | null {
  const match = /^\s{0,3}(#{1,6})[ \t]+(.+?)\s*#*\s*$/.exec(line);
  if (match === null) return null;

  const hashes = match[1];
  const rawName = match[2]?.trim() ?? "";
  if (hashes === undefined || rawName.length === 0) return null;

  return {
    level: hashes.length,
    name: rawName,
    start: lineNumber,
    end: lineNumber,
  };
}

function parseSetextHeading(
  currentLine: string,
  nextLine: string | undefined,
  lineNumber: number,
): MarkdownHeading | null {
  if (nextLine === undefined) return null;
  if (currentLine.trim().length === 0) return null;
  if (parseAtxHeading(currentLine, lineNumber) !== null) return null;

  if (/^\s{0,3}=+\s*$/.test(nextLine)) {
    return { level: 1, name: currentLine.trim(), start: lineNumber, end: lineNumber + 1 };
  }
  if (/^\s{0,3}-+\s*$/.test(nextLine)) {
    return { level: 2, name: currentLine.trim(), start: lineNumber, end: lineNumber + 1 };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Hierarchy and range finalization
// ---------------------------------------------------------------------------

function finalizeMarkdownRanges(headings: MarkdownHeading[], totalLines: number): void {
  for (let i = 0; i < headings.length; i++) {
    const current = headings[i];
    if (current === undefined) continue;
    let end = totalLines;
    for (let j = i + 1; j < headings.length; j++) {
      const next = headings[j];
      if (next === undefined) continue;
      if (next.level <= current.level) {
        end = next.start - 1;
        break;
      }
    }
    current.end = end;
  }
}

function buildMarkdownHierarchy(headings: readonly MarkdownHeading[]): MarkdownHeadingNode[] {
  const roots: MarkdownHeadingNode[] = [];
  const stack: MarkdownHeadingNode[] = [];

  for (const heading of headings) {
    const node: MarkdownHeadingNode = { ...heading, children: [] };
    while (stack.length > 0) {
      const last = stack[stack.length - 1];
      if (last === undefined || last.level < node.level) break;
      stack.pop();
    }
    const parent = stack[stack.length - 1];
    if (parent === undefined) roots.push(node);
    else parent.children.push(node);
    stack.push(node);
  }

  return roots;
}

// ---------------------------------------------------------------------------
// Conversion
// ---------------------------------------------------------------------------

function toOutlineEntry(node: MarkdownHeadingNode): OutlineEntry {
  return new OutlineEntry({
    kind: "heading",
    name: node.name,
    exported: false,
    ...(node.children.length > 0
      ? { children: node.children.map((child) => toOutlineEntry(child)) }
      : {}),
  });
}

function buildMarkdownJumpEntry(heading: MarkdownHeading): JumpEntry {
  return new JumpEntry({
    symbol: heading.name,
    kind: "heading",
    start: heading.start,
    end: heading.end,
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function extractMarkdownOutline(source: string): OutlineResult {
  const lines = source.split("\n");
  const headings: MarkdownHeading[] = [];
  let inFence = false;
  let activeFence: { marker: "`" | "~"; length: number } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) continue;
    const lineNumber = i + 1;
    const fence = isFenceLine(line);

    if (inFence) {
      if (activeFence !== null && isFenceClose(line, activeFence.marker, activeFence.length)) {
        inFence = false;
        activeFence = null;
      }
      continue;
    }

    if (fence !== null) {
      inFence = true;
      activeFence = fence;
      continue;
    }

    const atx = parseAtxHeading(line, lineNumber);
    if (atx !== null) {
      headings.push(atx);
      continue;
    }

    const setext = parseSetextHeading(line, lines[i + 1], lineNumber);
    if (setext !== null) {
      headings.push(setext);
      i++;
    }
  }

  finalizeMarkdownRanges(headings, lines.length);
  const hierarchy = buildMarkdownHierarchy(headings);

  return {
    entries: hierarchy.map((node) => toOutlineEntry(node)),
    jumpTable: headings.map((heading) => buildMarkdownJumpEntry(heading)),
  };
}
