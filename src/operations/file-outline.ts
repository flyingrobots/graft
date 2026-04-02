import { readFile } from "node:fs/promises";
import { extractOutline } from "../parser/outline.js";
import type { OutlineEntry, JumpEntry } from "../parser/types.js";

export interface FileOutlineResult {
  path: string;
  outline: OutlineEntry[];
  jumpTable: JumpEntry[];
  partial?: boolean | undefined;
  error?: string | undefined;
}

export async function fileOutline(filePath: string): Promise<FileOutlineResult> {
  let content: string;
  try {
    content = await readFile(filePath, "utf-8");
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
