// ---------------------------------------------------------------------------
// Real FileSystem for tests that genuinely need disk I/O (e.g. git-based tests).
// Implements the FileSystem port without importing src/adapters/node-fs.
// ---------------------------------------------------------------------------

import * as fs from "node:fs";
import * as fsp from "node:fs/promises";
import type { FileSystem } from "../../src/ports/filesystem.js";

class RealFileSystem implements FileSystem {
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

/**
 * Real filesystem adapter for tests that need actual disk I/O.
 * Use FakeFileSystem for pure unit tests instead.
 */
export const realFs: FileSystem = new RealFileSystem();
