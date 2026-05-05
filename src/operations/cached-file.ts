import { extractOutlineForFileAsync } from "../parser/outline.js";
import { detectStructuredFormat } from "../parser/lang.js";
import type { SupportedStructuredFormat } from "../parser/lang.js";
import type { OutlineEntry, JumpEntry } from "../parser/types.js";
import { hashContent } from "./observation-cache.js";

export interface CachedFileOutline {
  readonly outline: readonly OutlineEntry[];
  readonly jumpTable: readonly JumpEntry[];
}

/**
 * Immutable snapshot of a file read. Built once from a single read,
 * shared by all consumers (cache, policy, outline extraction) to eliminate
 * TOCTOU races where the file changes between reads.
 */
export class CachedFile {
  /** @internal */
  private readonly _brand = "CachedFile" as const;
  readonly path: string;
  readonly rawContent: string;
  readonly hash: string;
  readonly lang: SupportedStructuredFormat | null;
  readonly supportsOutline: boolean;
  readonly actual: { readonly lines: number; readonly bytes: number };
  #outline: CachedFileOutline | null = null;

  constructor(filePath: string, rawContent: string) {
    this.path = filePath;
    this.rawContent = rawContent;
    this.hash = hashContent(rawContent);
    this.actual = {
      lines: rawContent.split("\n").length,
      bytes: Buffer.byteLength(rawContent),
    };
    this.lang = detectStructuredFormat(filePath);
    this.supportsOutline = this.lang !== null;
    Object.freeze(this.actual);
    Object.freeze(this);
  }

  async outlineSnapshot(): Promise<CachedFileOutline> {
    if (this.#outline !== null) {
      return this.#outline;
    }
    if (!this.supportsOutline) {
      this.#outline = { outline: [], jumpTable: [] };
      return this.#outline;
    }

    const result = await extractOutlineForFileAsync(this.path, this.rawContent);
    this.#outline = {
      outline: result?.entries ?? [],
      jumpTable: result?.jumpTable ?? [],
    };
    return this.#outline;
  }
}
