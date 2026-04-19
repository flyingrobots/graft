import { afterEach, describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { nodeFs } from "../../../src/adapters/node-fs.js";
import { assertFileSystem } from "../../../src/ports/guards.js";

let tmpDir: string | null = null;

function makeTmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-port-fs-"));
  tmpDir = dir;
  return dir;
}

afterEach(() => {
  if (tmpDir !== null) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    tmpDir = null;
  }
});

describe("ports: FileSystem contract (nodeFs)", () => {
  it("passes the runtime guard", () => {
    assertFileSystem(nodeFs);
  });

  it("writeFile + readFile round-trip (utf-8)", async () => {
    const dir = makeTmpDir();
    const filePath = path.join(dir, "test.txt");
    await nodeFs.writeFile(filePath, "hello world", "utf-8");
    const content = await nodeFs.readFile(filePath, "utf-8");
    expect(content).toBe("hello world");
  });

  it("readFile without encoding returns a Buffer", async () => {
    const dir = makeTmpDir();
    const filePath = path.join(dir, "bin.dat");
    await nodeFs.writeFile(filePath, "bytes", "utf-8");
    const buf = await nodeFs.readFile(filePath);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.toString("utf-8")).toBe("bytes");
  });

  it("readFileSync returns string", async () => {
    const dir = makeTmpDir();
    const filePath = path.join(dir, "sync.txt");
    await nodeFs.writeFile(filePath, "sync content", "utf-8");
    const content = nodeFs.readFileSync(filePath, "utf-8");
    expect(content).toBe("sync content");
  });

  it("readdir lists directory entries", async () => {
    const dir = makeTmpDir();
    await nodeFs.writeFile(path.join(dir, "a.ts"), "", "utf-8");
    await nodeFs.writeFile(path.join(dir, "b.ts"), "", "utf-8");
    const entries = await nodeFs.readdir(dir);
    expect(entries.sort()).toEqual(["a.ts", "b.ts"]);
  });

  it("appendFile adds to existing content", async () => {
    const dir = makeTmpDir();
    const filePath = path.join(dir, "log.txt");
    await nodeFs.writeFile(filePath, "line1\n", "utf-8");
    await nodeFs.appendFile(filePath, "line2\n", "utf-8");
    const content = await nodeFs.readFile(filePath, "utf-8");
    expect(content).toBe("line1\nline2\n");
  });

  it("mkdir creates nested directories", async () => {
    const dir = makeTmpDir();
    const nested = path.join(dir, "a", "b", "c");
    await nodeFs.mkdir(nested, { recursive: true });
    const stat = fs.statSync(nested);
    expect(stat.isDirectory()).toBe(true);
  });

  it("stat returns size", async () => {
    const dir = makeTmpDir();
    const filePath = path.join(dir, "sized.txt");
    const content = "hello";
    await nodeFs.writeFile(filePath, content, "utf-8");
    const result = await nodeFs.stat(filePath);
    expect(result.size).toBe(Buffer.byteLength(content, "utf-8"));
  });

  it("readFile rejects for missing files", async () => {
    await expect(nodeFs.readFile("/nonexistent/path.txt", "utf-8")).rejects.toThrow();
  });

  it("stat rejects for missing files", async () => {
    await expect(nodeFs.stat("/nonexistent/path.txt")).rejects.toThrow();
  });
});
