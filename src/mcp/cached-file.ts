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
    const lang = detectLang(filePath);
    if (lang !== null) {
      const result = extractOutline(rawContent, lang);
      this.outline = result.entries;
      this.jumpTable = result.jumpTable ?? [];
    } else {
      this.outline = [];
      this.jumpTable = [];
    }
    Object.freeze(this.actual);
    Object.freeze(this);
  }
}
