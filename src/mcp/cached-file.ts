import { extractOutline } from "../parser/outline.js";
import { detectLang } from "../parser/lang.js";
import type { OutlineEntry, JumpEntry } from "../parser/types.js";
import { hashContent } from "./cache.js";

/**
 * Immutable snapshot of a file read. Built once from a single readFileSync,
 * shared by all consumers (cache, policy, outline extraction) to eliminate
 * TOCTOU races where the file changes between reads.
 */
export class CachedFile {
  /** @internal */
  private readonly _brand = "CachedFile" as const;
  readonly path: string;
  readonly rawContent: string;
  readonly hash: string;
  readonly outline: readonly OutlineEntry[];
  readonly jumpTable: readonly JumpEntry[];
  readonly actual: { readonly lines: number; readonly bytes: number };

  constructor(filePath: string, rawContent: string) {
    this.path = filePath;
    this.rawContent = rawContent;
    this.hash = hashContent(rawContent);
    this.actual = {
      lines: rawContent.split("\n").length,
      bytes: Buffer.byteLength(rawContent),
    };
    // Fallback to "ts" parser for unknown extensions — TS/JS parser handles
    // .mjs, .cjs, and other JS-family files that detectLang doesn't cover.
    const lang = detectLang(filePath) ?? "ts";
    const result = extractOutline(rawContent, lang);
    this.outline = result.entries;
    this.jumpTable = result.jumpTable ?? [];
    Object.freeze(this.actual);
    Object.freeze(this);
  }
}
