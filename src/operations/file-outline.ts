import { extractOutlineForFileAsync } from "../parser/outline.js";
import type { OutlineEntry, JumpEntry } from "../parser/types.js";
import type { ObservedFile } from "./workspace-read-view.js";
import type { ProseProjection, ProseProjectionProvider } from "./colorful-prose-projection.js";

export interface FileOutlineResult {
  path: string;
  outline: OutlineEntry[];
  jumpTable: JumpEntry[];
  partial?: boolean | undefined;
  cacheHit?: boolean | undefined;
  actual?: { lines: number; bytes: number } | undefined;
  reason?: "UNSUPPORTED_LANGUAGE" | "INVALID_UTF8" | "UNADMITTED_PATH" | "NOT_FOUND" | undefined;
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

/**
 * Extracts an outline from bytes already observed.
 *
 * Takes the observation rather than a filesystem so the symbols returned are
 * necessarily the symbols of the bytes the caller evaluated and cached.
 */
export async function fileOutline(
  file: ObservedFile,
  opts: { proseProjector?: ProseProjectionProvider | undefined } = {},
): Promise<FileOutlineResult> {
  const filePath = file.path;
  if (file.utf8 === null) {
    return {
      path: filePath,
      outline: [],
      jumpTable: [],
      reason: "INVALID_UTF8",
      error: "File is not valid UTF-8",
    };
  }
  const content = file.utf8;

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
