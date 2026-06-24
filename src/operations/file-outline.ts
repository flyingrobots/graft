import { extractOutlineForFileAsync } from "../parser/outline.js";
import type { OutlineEntry, JumpEntry } from "../parser/types.js";
import type { FileSystem } from "../ports/filesystem.js";
import type { ProseProjectionProvider } from "./colorful-prose-projection.js";

export interface FileOutlineResult {
  path: string;
  outline: OutlineEntry[];
  jumpTable: JumpEntry[];
  partial?: boolean | undefined;
  cacheHit?: boolean | undefined;
  reason?: "UNSUPPORTED_LANGUAGE" | undefined;
  error?: string | undefined;
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

  const result = await extractOutlineForFileAsync(filePath, content);
  if (result === null) {
    const proseProjection = opts.proseProjector?.project({ path: filePath, content }) ?? null;
    if (proseProjection !== null) {
      return {
        path: filePath,
        outline: [...proseProjection.outline],
        jumpTable: [...proseProjection.jumpTable],
        partial: proseProjection.partial,
      };
    }
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
    outline: result.entries,
    jumpTable: result.jumpTable ?? [],
    ...(result.partial === true ? { partial: true } : {}),
  };
}
