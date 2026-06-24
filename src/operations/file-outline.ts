import { extractOutlineForFileAsync } from "../parser/outline.js";
import type { OutlineEntry, JumpEntry } from "../parser/types.js";
import type { FileSystem } from "../ports/filesystem.js";
import type { ProseProjection, ProseProjectionProvider } from "./colorful-prose-projection.js";

export interface FileOutlineResult {
  path: string;
  outline: OutlineEntry[];
  jumpTable: JumpEntry[];
  partial?: boolean | undefined;
  cacheHit?: boolean | undefined;
  reason?: "UNSUPPORTED_LANGUAGE" | undefined;
  error?: string | undefined;
}

export interface ExtractedFileOutline {
  readonly outline: OutlineEntry[];
  readonly jumpTable: JumpEntry[];
  readonly partial?: boolean | undefined;
}

export async function extractOutlineProjectionForContent(
  filePath: string,
  content: string,
  opts: { proseProjector?: ProseProjectionProvider | undefined },
): Promise<ExtractedFileOutline | null> {
  const result = await extractOutlineForFileAsync(filePath, content);
  if (result !== null) {
    return {
      outline: result.entries,
      jumpTable: result.jumpTable ?? [],
      ...(result.partial === true ? { partial: true } : {}),
    };
  }

  let proseProjection: ProseProjection | null;
  try {
    proseProjection = opts.proseProjector?.project({ path: filePath, content }) ?? null;
  } catch {
    return null;
  }
  if (proseProjection === null) {
    return null;
  }

  return {
    outline: [...proseProjection.outline],
    jumpTable: [...proseProjection.jumpTable],
  };
}

export async function fileOutline(
  filePath: string,
  opts: { fs: FileSystem; proseProjector?: ProseProjectionProvider | undefined },
): Promise<FileOutlineResult> {
  let content: string;
  try {
    content = await opts.fs.readFile(filePath, "utf-8");
  } catch {
    return {
      path: filePath,
      outline: [],
      jumpTable: [],
      error: "File not found",
    };
  }

  const result = await extractOutlineProjectionForContent(filePath, content, {
    proseProjector: opts.proseProjector,
  });
  if (result === null) {
    return {
      path: filePath,
      outline: [],
      jumpTable: [],
      reason: "UNSUPPORTED_LANGUAGE",
      error: "Unsupported file type: no parser-backed outline available",
    };
  }

  return {
    path: filePath,
    outline: result.outline,
    jumpTable: result.jumpTable,
    ...(result.partial === true ? { partial: true } : {}),
  };
}
