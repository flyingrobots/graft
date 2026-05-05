import type { SyntaxNode as TSNode } from "web-tree-sitter";
import { OutlineEntry, JumpEntry } from "../types.js";

export const MAX_SIGNATURE_LENGTH = 199;

/** Compact object-literal default values: `= { ... }` becomes `= {…}`. */
export function compactObjectDefaults(sig: string): string {
  return sig.replace(/=\s*\{[^}]*\}/g, "= {…}");
}

/** Truncate a signature to fit within MAX_SIGNATURE_LENGTH. */
export function boundSignature(raw: string): string {
  let sig = compactObjectDefaults(raw);
  if (sig.length >= MAX_SIGNATURE_LENGTH) {
    sig = sig.slice(0, MAX_SIGNATURE_LENGTH - 1) + "…";
  }
  return sig;
}

export function buildJumpEntry(
  name: string,
  kind: string,
  node: TSNode,
): JumpEntry {
  return new JumpEntry({
    symbol: name,
    kind,
    start: node.startPosition.row + 1,
    end: node.endPosition.row + 1,
  });
}

export interface ExtractorResult {
  entries: OutlineEntry[];
  jumpTable: JumpEntry[];
}

export interface LanguageExtractor {
  extract(root: TSNode): ExtractorResult;
}
