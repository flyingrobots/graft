import { detectStructuredFormat } from "./lang.js";
import type { SupportedStructuredFormat } from "./lang.js";
import type { OutlineResult } from "./types.js";
import {
  type ParsedTree,
  parseStructuredTree,
  parseStructuredTreeAsync,
} from "./runtime.js";
import { extractMarkdownOutline } from "./markdown.js";
import { getExtractor } from "./extractors/index.js";

// ---------------------------------------------------------------------------
// Main extraction
// ---------------------------------------------------------------------------

/**
 * Extract a structural outline from source code.
 *
 * @param source - The source code text.
 * @param lang - Structured format identifier. Defaults to `"ts"`.
 * @returns An {@link OutlineResult} with entries, jump table, and partial flag.
 */
export function extractOutline(
  source: string,
  lang: SupportedStructuredFormat = "ts",
): OutlineResult {
  if (lang === "md") {
    return extractMarkdownOutline(source);
  }
  
  const parsed = parseStructuredTree(lang, source);
  try {
    return extractOutlineFromParsedTree(parsed);
  } finally {
    parsed.delete();
  }
}

export function extractOutlineFromParsedTree(parsed: ParsedTree): OutlineResult {
  const lang = parsed.format;
  const extractor = getExtractor(lang);
  const result: OutlineResult = extractor.extract(parsed.root);
  if (parsed.root.hasError()) {
    result.partial = true;
  }
  return result;
}

export async function extractOutlineAsync(
  source: string,
  lang: SupportedStructuredFormat = "ts",
): Promise<OutlineResult> {
  if (lang === "md") {
    return extractMarkdownOutline(source);
  }
  
  const parsed = await parseStructuredTreeAsync(lang, source);
  try {
    return extractOutlineFromParsedTree(parsed);
  } finally {
    parsed.delete();
  }
}

export function extractOutlineForFile(
  filePath: string,
  source: string,
): OutlineResult | null {
  const lang = detectStructuredFormat(filePath);
  if (lang === null) {
    return null;
  }

  return extractOutline(source, lang);
}

export async function extractOutlineForFileAsync(
  filePath: string,
  source: string,
): Promise<OutlineResult | null> {
  const lang = detectStructuredFormat(filePath);
  if (lang === null) {
    return null;
  }

  return extractOutlineAsync(source, lang);
}
