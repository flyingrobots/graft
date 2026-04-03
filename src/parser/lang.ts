import * as path from "node:path";

/**
 * Detect the tree-sitter language from a file extension.
 * Returns null for unsupported file types.
 */
export function detectLang(filePath: string): "ts" | "js" | null {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".ts" || ext === ".tsx") return "ts";
  if (ext === ".js" || ext === ".jsx") return "js";
  return null;
}
