import type { FileSystem } from "../ports/filesystem.js";

const MAX_STATE_BYTES = 8192;
export const STATE_FILENAME = "state.md";

export async function stateSave(
  content: string,
  opts: { stateDir: string; statePath: string; fs: FileSystem },
): Promise<{ ok: boolean; reason?: string | undefined }> {
  const bytes = Buffer.byteLength(content, "utf-8");
  if (bytes > MAX_STATE_BYTES) {
    return { ok: false, reason: `State exceeds 8 KB limit (${String(bytes)} bytes)` };
  }

  await opts.fs.mkdir(opts.stateDir, { recursive: true });
  await opts.fs.writeFile(opts.statePath, content, "utf-8");

  return { ok: true };
}

export async function stateLoad(
  opts: { statePath: string; fs: FileSystem },
): Promise<{ content: string | null }> {
  try {
    const content = await opts.fs.readFile(opts.statePath, "utf-8");
    return { content };
  } catch {
    return { content: null };
  }
}
