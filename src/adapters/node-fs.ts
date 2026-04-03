// ---------------------------------------------------------------------------
// Node.js filesystem adapter — implements the FileSystem port
// ---------------------------------------------------------------------------

import * as fs from "node:fs";
import * as fsp from "node:fs/promises";
import type { FileSystem } from "../ports/filesystem.js";

export const nodeFs: FileSystem = {
  readFile(path: string, encoding?: "utf-8"): Promise<string | Buffer> {
    if (encoding !== undefined) return fsp.readFile(path, encoding);
    return fsp.readFile(path);
  },
  writeFile: (path, data, encoding) => fsp.writeFile(path, data, encoding),
  appendFile: (path, data, encoding) => fsp.appendFile(path, data, encoding),
  mkdir: async (path, options) => { await fsp.mkdir(path, options); },
  stat: async (path) => {
    const s = await fsp.stat(path);
    return { size: s.size };
  },
  readFileSync: (path, encoding) => fs.readFileSync(path, encoding),
} as FileSystem;
