import { JumpEntry, OutlineEntry } from "../parser/types.js";
import type { EntryKind } from "../parser/types.js";
import type {
  BufferPoint,
  BufferRange,
  SyntaxClass,
  SyntaxSpan,
} from "./structured-buffer-model.js";

export const COLORFUL_SYNTAX_CONTRACT_VERSION = "colorful.syntax/v1";
export const COLORFUL_VOCABULARY_HASH =
  "sha256:c3709c173d632bd18385b991f63dc3ac09cdba582bc05550f0376db24117bbe1";

type ColorfulTokenKind = "WORD" | "NUMBER" | "PUNCTUATION" | "QUOTE";
type ColorfulLexicalClass = "FUNCTION" | "CONTENT" | "PROPER_NOUN_CANDIDATE";
type ColorfulOutlineKind = "PARAGRAPH" | "SENTENCE";

interface ColorfulByteRange {
  readonly startUtf8: number;
  readonly endUtf8: number;
}

interface ColorfulToken {
  readonly byteRange: ColorfulByteRange;
  readonly tokenKind: ColorfulTokenKind;
  readonly lexicalClass: ColorfulLexicalClass | null;
}

interface ColorfulStructureNode {
  readonly nodeId: string;
  readonly kind: ColorfulOutlineKind;
  readonly byteRange: ColorfulByteRange;
  readonly depth: number;
  readonly childNodeIds: readonly string[];
}

interface ColorfulDocumentAnalysis {
  readonly contractVersion: typeof COLORFUL_SYNTAX_CONTRACT_VERSION;
  readonly vocabularyHash: typeof COLORFUL_VOCABULARY_HASH;
  readonly source: {
    readonly contentHash: string;
    readonly utf8ByteLength: number;
  };
  readonly tokens: readonly ColorfulToken[];
  readonly structure: readonly ColorfulStructureNode[];
}

export interface ProseProjectionInput {
  readonly path: string;
  readonly content: string;
}

export interface ProseProjection {
  readonly format: "prose";
  readonly partial: false;
  readonly syntaxSpans: readonly SyntaxSpan[];
  readonly outline: readonly OutlineEntry[];
  readonly jumpTable: readonly JumpEntry[];
}

export interface ProseProjectionProvider {
  project(input: ProseProjectionInput): ProseProjection | null;
}

export class ColorfulIrProjectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ColorfulIrProjectionError";
  }
}

function fail(message: string): never {
  throw new ColorfulIrProjectionError(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) {
    fail(`${label} must be an object`);
  }
  return value;
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string") {
    fail(`${label} must be a string`);
  }
  return value;
}

function requireInteger(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    fail(`${label} must be an integer`);
  }
  return value;
}

function requireOutlineId(value: unknown, label: string): string {
  const id = requireInteger(value, label);
  if (id < 0) {
    fail(`${label} must be a non-negative integer`);
  }
  return String(id);
}

function requireArray(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value)) {
    fail(`${label} must be an array`);
  }
  return value;
}

function decodeByteRange(value: unknown, label: string): ColorfulByteRange {
  const record = requireRecord(value, label);
  const startUtf8 = requireInteger(record["startUtf8"], `${label}.startUtf8`);
  const endUtf8 = requireInteger(record["endUtf8"], `${label}.endUtf8`);
  if (startUtf8 < 0 || endUtf8 < startUtf8) {
    fail(`${label} must be a valid UTF-8 byte range`);
  }
  return { startUtf8, endUtf8 };
}

function decodeTokenKind(value: unknown, label: string): ColorfulTokenKind {
  const tokenKind = requireString(value, label);
  if (
    tokenKind !== "WORD"
    && tokenKind !== "NUMBER"
    && tokenKind !== "PUNCTUATION"
    && tokenKind !== "QUOTE"
  ) {
    fail(`${label} has unknown token kind ${tokenKind}`);
  }
  return tokenKind;
}

function decodeLexicalClass(value: unknown, label: string): ColorfulLexicalClass | null {
  if (value === null || value === undefined) {
    return null;
  }
  const lexicalClass = requireString(value, label);
  if (
    lexicalClass !== "FUNCTION"
    && lexicalClass !== "CONTENT"
    && lexicalClass !== "PROPER_NOUN_CANDIDATE"
  ) {
    fail(`${label} has unknown lexical class ${lexicalClass}`);
  }
  return lexicalClass;
}

function decodeOutlineKind(value: unknown, label: string): ColorfulOutlineKind {
  const kind = requireString(value, label);
  if (kind !== "PARAGRAPH" && kind !== "SENTENCE") {
    fail(`${label} has unknown outline kind ${kind}`);
  }
  return kind;
}

function decodeToken(value: unknown, label: string): ColorfulToken {
  const record = requireRecord(value, label);
  return {
    byteRange: decodeByteRange(record["byteRange"], `${label}.byteRange`),
    tokenKind: decodeTokenKind(record["tokenKind"], `${label}.tokenKind`),
    lexicalClass: decodeLexicalClass(record["lexicalClass"], `${label}.lexicalClass`),
  };
}

function decodeStructureNode(value: unknown, label: string): ColorfulStructureNode {
  const record = requireRecord(value, label);
  return {
    nodeId: requireOutlineId(record["nodeId"], `${label}.nodeId`),
    kind: decodeOutlineKind(record["kind"], `${label}.kind`),
    byteRange: decodeByteRange(record["byteRange"], `${label}.byteRange`),
    depth: requireInteger(record["depth"], `${label}.depth`),
    childNodeIds: requireArray(record["childNodeIds"], `${label}.childNodeIds`).map((entry, index) =>
      requireOutlineId(entry, `${label}.childNodeIds[${String(index)}]`)
    ),
  };
}

function decodeColorfulDocumentAnalysis(value: unknown): ColorfulDocumentAnalysis {
  const record = requireRecord(value, "Colorful IR");
  const contractVersion = requireString(record["contractVersion"], "Colorful IR.contractVersion");
  if (contractVersion !== COLORFUL_SYNTAX_CONTRACT_VERSION) {
    fail(
      `Colorful IR contractVersion ${contractVersion} is not ${COLORFUL_SYNTAX_CONTRACT_VERSION}`,
    );
  }
  const vocabularyHash = requireString(record["vocabularyHash"], "Colorful IR.vocabularyHash");
  if (vocabularyHash !== COLORFUL_VOCABULARY_HASH) {
    fail(
      `Colorful IR vocabularyHash (${vocabularyHash}) does not match this consumer (${COLORFUL_VOCABULARY_HASH})`,
    );
  }

  const source = requireRecord(record["source"], "Colorful IR.source");
  return {
    contractVersion,
    vocabularyHash,
    source: {
      contentHash: requireString(source["contentHash"], "Colorful IR.source.contentHash"),
      utf8ByteLength: requireInteger(source["utf8ByteLength"], "Colorful IR.source.utf8ByteLength"),
    },
    tokens: requireArray(record["tokens"], "Colorful IR.tokens").map((entry, index) =>
      decodeToken(entry, `Colorful IR.tokens[${String(index)}]`)
    ),
    structure: requireArray(record["structure"], "Colorful IR.structure").map((entry, index) =>
      decodeStructureNode(entry, `Colorful IR.structure[${String(index)}]`)
    ),
  };
}

interface ColorfulByteMapper {
  readonly byteToPoint: (byte: number) => BufferPoint;
  readonly hasBoundary: (byte: number) => boolean;
}

function assertRangeWithinSource(
  range: ColorfulByteRange,
  sourceLength: number,
  byteMapper: ColorfulByteMapper,
  label: string,
): void {
  if (range.endUtf8 > sourceLength) {
    fail(`${label} extends past source.utf8ByteLength`);
  }
  if (!byteMapper.hasBoundary(range.startUtf8) || !byteMapper.hasBoundary(range.endUtf8)) {
    fail(`${label} must start and end on UTF-8 character boundaries`);
  }
}

export function isColorfulProsePath(
  filePath: string,
  opts: { readonly includeMarkdown?: boolean | undefined } = {},
): boolean {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".txt") || lower.endsWith(".text")) {
    return true;
  }
  return opts.includeMarkdown === true && (lower.endsWith(".md") || lower.endsWith(".markdown"));
}

export function makeColorfulByteToPoint(source: Uint8Array): (byte: number) => BufferPoint {
  return makeColorfulByteMapper(source).byteToPoint;
}

function makeColorfulByteMapper(source: Uint8Array): ColorfulByteMapper {
  const bytes = Buffer.from(source);
  const pointByBoundary = new Map<number, BufferPoint>();
  const boundaries: number[] = [];

  const addBoundary = (byte: number, row: number, column: number): void => {
    if (!pointByBoundary.has(byte)) {
      boundaries.push(byte);
    }
    pointByBoundary.set(byte, { row, column });
  };

  let byteOffset = 0;
  let row = 0;
  let column = 0;
  addBoundary(byteOffset, row, column);

  const scalars = Array.from(bytes.toString("utf8"));
  for (let index = 0; index < scalars.length; index += 1) {
    const scalar = scalars[index] ?? "";
    byteOffset += Buffer.byteLength(scalar, "utf8");

    if (scalar === "\r" && scalars[index + 1] === "\n") {
      column += 1;
      addBoundary(byteOffset, row, column);
      index += 1;
      byteOffset += 1;
      row += 1;
      column = 0;
      addBoundary(byteOffset, row, column);
      continue;
    }

    if (scalar === "\r" || scalar === "\n") {
      row += 1;
      column = 0;
      addBoundary(byteOffset, row, column);
      continue;
    }

    column += 1;
    addBoundary(byteOffset, row, column);
  }

  const byteToPoint = (byte: number): BufferPoint => {
    const offset = Math.max(0, Math.min(byte, bytes.length));
    const exact = pointByBoundary.get(offset);
    if (exact !== undefined) {
      return exact;
    }

    let low = 0;
    let high = boundaries.length - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const boundary = boundaries[mid] ?? 0;
      if (boundary <= offset) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    return pointByBoundary.get(boundaries[Math.max(high, 0)] ?? 0) ?? { row: 0, column: 0 };
  };

  return {
    byteToPoint,
    hasBoundary(byte) {
      return pointByBoundary.has(byte);
    },
  };
}

function rangeForByteRange(byteRange: ColorfulByteRange, byteToPoint: (byte: number) => BufferPoint): BufferRange {
  return {
    start: byteToPoint(byteRange.startUtf8),
    end: byteToPoint(byteRange.endUtf8),
  };
}

function lineRangeForByteRange(byteRange: ColorfulByteRange, byteToPoint: (byte: number) => BufferPoint): {
  readonly start: number;
  readonly end: number;
} {
  const start = byteToPoint(byteRange.startUtf8).row + 1;
  const inclusiveEndByte = byteRange.endUtf8 > byteRange.startUtf8
    ? byteRange.endUtf8 - 1
    : byteRange.endUtf8;
  const end = Math.max(start, byteToPoint(inclusiveEndByte).row + 1);
  return { start, end };
}

function tokenClass(token: ColorfulToken): SyntaxClass | null {
  switch (token.tokenKind) {
    case "WORD":
      if (token.lexicalClass === "FUNCTION") {
        return "keyword";
      }
      if (token.lexicalClass === "PROPER_NOUN_CANDIDATE") {
        return "type";
      }
      return null;
    case "NUMBER":
      return "number";
    case "QUOTE":
      return "string";
    case "PUNCTUATION":
      return null;
  }
}

function sliceSourceText(source: Buffer, byteRange: ColorfulByteRange): string {
  return source.subarray(byteRange.startUtf8, byteRange.endUtf8).toString("utf8");
}

function compactSnippet(text: string): string {
  const compact = text.replace(/\s+/gu, " ").trim();
  const scalars = Array.from(compact);
  if (scalars.length <= 80) {
    return compact;
  }
  return `${scalars.slice(0, 77).join("")}...`;
}

function proseEntryKind(kind: ColorfulOutlineKind): EntryKind {
  return kind === "PARAGRAPH" ? "paragraph" : "sentence";
}

function proseLabel(kind: ColorfulOutlineKind): string {
  return kind === "PARAGRAPH" ? "Paragraph" : "Sentence";
}

function buildProseOutline(
  source: Buffer,
  structure: readonly ColorfulStructureNode[],
  byteToPoint: (byte: number) => BufferPoint,
): { readonly outline: readonly OutlineEntry[]; readonly jumpTable: readonly JumpEntry[] } {
  const byId = new Map<string, ColorfulStructureNode>();
  const childIds = new Set<string>();
  for (const node of structure) {
    if (byId.has(node.nodeId)) {
      fail(`Colorful IR.structure has duplicate nodeId ${node.nodeId}`);
    }
    byId.set(node.nodeId, node);
    for (const childId of node.childNodeIds) {
      childIds.add(childId);
    }
  }

  const ordinals = new Map<string, number>();
  const counts: Record<ColorfulOutlineKind, number> = { PARAGRAPH: 0, SENTENCE: 0 };
  for (const node of structure) {
    counts[node.kind] += 1;
    ordinals.set(node.nodeId, counts[node.kind]);
  }

  const jumpTable = structure.map((node) => {
    const ordinal = ordinals.get(node.nodeId) ?? 1;
    const name = `${proseLabel(node.kind)} ${String(ordinal)}`;
    const lineRange = lineRangeForByteRange(node.byteRange, byteToPoint);
    return new JumpEntry({
      symbol: name,
      kind: proseEntryKind(node.kind),
      start: lineRange.start,
      end: lineRange.end,
    });
  });

  const buildEntry = (node: ColorfulStructureNode, path: ReadonlySet<string>): OutlineEntry => {
    if (path.has(node.nodeId)) {
      fail(`Colorful IR.structure contains a cycle at ${node.nodeId}`);
    }
    const nextPath = new Set(path);
    nextPath.add(node.nodeId);
    const children = node.childNodeIds.map((childId) => {
      const child = byId.get(childId);
      if (child === undefined) {
        fail(`Colorful IR.structure references missing child ${childId}`);
      }
      return buildEntry(child, nextPath);
    });
    const ordinal = ordinals.get(node.nodeId) ?? 1;
    const signature = compactSnippet(sliceSourceText(source, node.byteRange));
    return new OutlineEntry({
      kind: proseEntryKind(node.kind),
      name: `${proseLabel(node.kind)} ${String(ordinal)}`,
      exported: false,
      ...(signature.length > 0 ? { signature } : {}),
      ...(children.length > 0 ? { children } : {}),
    });
  };

  const roots = structure.filter((node) => !childIds.has(node.nodeId));
  return {
    outline: roots.map((node) => buildEntry(node, new Set())),
    jumpTable,
  };
}

export function projectColorfulIr(input: {
  readonly path: string;
  readonly source: Uint8Array;
  readonly sourceHash: string;
  readonly ir: unknown;
}): ProseProjection {
  const source = Buffer.from(input.source);
  const document = decodeColorfulDocumentAnalysis(input.ir);
  if (document.source.contentHash !== input.sourceHash) {
    fail(
      `source does not match IR contentHash (expected ${document.source.contentHash}, got ${input.sourceHash})`,
    );
  }
  if (document.source.utf8ByteLength !== source.byteLength) {
    fail(
      `source length ${String(source.byteLength)} does not match IR source.utf8ByteLength ${String(document.source.utf8ByteLength)}`,
    );
  }

  const byteMapper = makeColorfulByteMapper(source);
  const byteToPoint = byteMapper.byteToPoint;
  for (const [index, token] of document.tokens.entries()) {
    assertRangeWithinSource(
      token.byteRange,
      source.byteLength,
      byteMapper,
      `Colorful IR.tokens[${String(index)}].byteRange`,
    );
  }
  for (const [index, node] of document.structure.entries()) {
    assertRangeWithinSource(
      node.byteRange,
      source.byteLength,
      byteMapper,
      `Colorful IR.structure[${String(index)}].byteRange`,
    );
  }

  const syntaxSpans = document.tokens.flatMap((token) => {
    const className = tokenClass(token);
    if (className === null || token.byteRange.startUtf8 === token.byteRange.endUtf8) {
      return [];
    }
    return [{
      className,
      range: rangeForByteRange(token.byteRange, byteToPoint),
      text: sliceSourceText(source, token.byteRange),
    }];
  });
  const outline = buildProseOutline(source, document.structure, byteToPoint);
  return {
    format: "prose",
    partial: false,
    syntaxSpans,
    outline: outline.outline,
    jumpTable: outline.jumpTable,
  };
}
