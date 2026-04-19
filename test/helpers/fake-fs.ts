// ---------------------------------------------------------------------------
// In-memory FileSystem test double — implements the FileSystem port
// ---------------------------------------------------------------------------

import type { FileSystem } from "../../src/ports/filesystem.js";

/**
 * Async-only in-memory filesystem for unit tests.
 * Accepts a record of path -> content. Any path not in the record
 * throws "not found" on read/stat, exactly like a real fs would for
 * missing files.
 */
export class FakeFileSystem implements FileSystem {
  constructor(private readonly files: Readonly<Record<string, string>>) {}

  readFile(path: string, encoding: "utf-8"): Promise<string>;
  readFile(path: string): Promise<Buffer>;
  async readFile(path: string, encoding?: "utf-8"): Promise<string | Buffer> {
    const content = this.files[path];
    if (content === undefined) throw new Error("not found");
    await Promise.resolve();
    return encoding === "utf-8" ? content : Buffer.from(content, "utf-8");
  }

  async readdir(): Promise<string[]> {
    await Promise.resolve();
    throw new Error("FakeFileSystem.readdir not implemented");
  }

  async writeFile(): Promise<void> {
    await Promise.resolve();
    throw new Error("FakeFileSystem.writeFile not implemented");
  }

  async appendFile(): Promise<void> {
    await Promise.resolve();
    throw new Error("FakeFileSystem.appendFile not implemented");
  }

  async mkdir(): Promise<void> {
    await Promise.resolve();
    throw new Error("FakeFileSystem.mkdir not implemented");
  }

  async stat(path: string): Promise<{ size: number }> {
    const content = this.files[path];
    if (content === undefined) throw new Error("not found");
    await Promise.resolve();
    return { size: Buffer.byteLength(content, "utf-8") };
  }

  readFileSync(): string {
    throw new Error("readFileSync should not be used in unit tests");
  }
}
