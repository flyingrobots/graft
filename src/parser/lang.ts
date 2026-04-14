import * as path from "node:path";

export type SupportedLang = "ts" | "tsx" | "js";
export type SupportedStructuredFormat = SupportedLang | "md";

/**
 * Detect the tree-sitter language from a file extension.
 * Returns null for unsupported file types.
 */
export function detectLang(filePath: string): SupportedLang | null {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".ts" || ext === ".mts" || ext === ".cts") return "ts";
  if (ext === ".tsx" || ext === ".jsx") return "tsx";
  if (ext === ".js" || ext === ".mjs" || ext === ".cjs") return "js";
  return null;
}

/**
 * Detect the supported structured format for bounded read surfaces.
 * Returns null for file types that still have no explicit extractor.
 */
export function detectStructuredFormat(filePath: string): SupportedStructuredFormat | null {
  const lang = detectLang(filePath);
  if (lang !== null) return lang;

  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".md") return "md";
  return null;
}
