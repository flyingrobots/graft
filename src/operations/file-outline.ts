import { extractOutline } from "../parser/outline.js";
import type { OutlineEntry, JumpEntry } from "../parser/types.js";
import type { FileSystem } from "../ports/filesystem.js";

export interface FileOutlineResult {
  [key: string]: unknown;
  path: string;
  outline: OutlineEntry[];
  jumpTable: JumpEntry[];
  partial?: boolean | undefined;
  error?: string | undefined;
}

export async function fileOutline(
  filePath: string,
  opts: { fs: FileSystem },
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

  const result = extractOutline(content);

  return {
    path: filePath,
    outline: result.entries,
    jumpTable: result.jumpTable ?? [],
    ...(result.partial === true ? { partial: true } : {}),
  };
}
