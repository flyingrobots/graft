// ---------------------------------------------------------------------------
// Node.js filesystem adapter — implements the FileSystem port
// ---------------------------------------------------------------------------

import * as fs from "node:fs";
import * as fsp from "node:fs/promises";
import type { FileSystem } from "../ports/filesystem.js";

class NodeFileSystem implements FileSystem {
  readFile(path: string, encoding: "utf-8"): Promise<string>;
  readFile(path: string): Promise<Buffer>;
  readFile(path: string, encoding?: "utf-8"): Promise<string | Buffer> {
    if (encoding !== undefined) return fsp.readFile(path, encoding);
    return fsp.readFile(path);
  }

  readdir(path: string): Promise<string[]> {
    return fsp.readdir(path);
  }

  writeFile(path: string, data: string, encoding: "utf-8"): Promise<void> {
    return fsp.writeFile(path, data, encoding);
  }

  appendFile(path: string, data: string, encoding: "utf-8"): Promise<void> {
    return fsp.appendFile(path, data, encoding);
  }

  async mkdir(path: string, options: { recursive: true }): Promise<void> {
    await fsp.mkdir(path, options);
  }

  async stat(path: string): Promise<{ size: number }> {
    const s = await fsp.stat(path);
    return { size: s.size };
  }

  readFileSync(path: string, encoding: "utf-8"): string {
    return fs.readFileSync(path, encoding);
  }
}

export const nodeFs: FileSystem = new NodeFileSystem();
