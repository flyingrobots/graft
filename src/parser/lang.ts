import * as path from "node:path";

export type SupportedLang = "ts" | "js";

/**
 * Detect the tree-sitter language from a file extension.
 * Returns null for unsupported file types.
 */
export function detectLang(filePath: string): SupportedLang | null {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".ts" || ext === ".tsx" || ext === ".mts" || ext === ".cts") return "ts";
  if (ext === ".js" || ext === ".jsx" || ext === ".mjs" || ext === ".cjs") return "js";
  return null;
}
