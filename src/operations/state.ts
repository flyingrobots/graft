import { readFile, writeFile, mkdir } from "node:fs/promises";
import * as path from "node:path";

const MAX_STATE_BYTES = 8192;
const STATE_FILENAME = "state.md";

export async function stateSave(
  content: string,
  opts: { graftDir: string },
): Promise<{ ok: boolean; reason?: string | undefined }> {
  const bytes = Buffer.byteLength(content, "utf-8");
  if (bytes > MAX_STATE_BYTES) {
    return { ok: false, reason: `State exceeds 8 KB limit (${String(bytes)} bytes)` };
  }

  const filePath = path.join(opts.graftDir, STATE_FILENAME);
  await mkdir(opts.graftDir, { recursive: true });
  await writeFile(filePath, content, "utf-8");

  return { ok: true };
}

export async function stateLoad(
  opts: { graftDir: string },
): Promise<{ content: string | null }> {
  const filePath = path.join(opts.graftDir, STATE_FILENAME);
  try {
    const content = await readFile(filePath, "utf-8");
    return { content };
  } catch {
    return { content: null };
  }
}
