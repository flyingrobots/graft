import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { RotatingNdjsonLog } from "../../../src/adapters/rotating-ndjson-log.js";
import { CanonicalJsonCodec } from "../../../src/adapters/canonical-json.js";
import { nodeFs } from "../../../src/adapters/node-fs.js";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const codec = new CanonicalJsonCodec();

describe("RotatingNdjsonLog", () => {
  let tmpDir: string;
  let logPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-rotating-log-"));
    logPath = path.join(tmpDir, "test.ndjson");
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("appends entries as NDJSON lines", async () => {
    const log = new RotatingNdjsonLog({ fs: nodeFs, codec, logPath });
    await log.append({ a: 1 });
    await log.append({ b: 2 });

    const lines = fs.readFileSync(logPath, "utf-8").trimEnd().split("\n");
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0]!)).toEqual({ a: 1 });
    expect(JSON.parse(lines[1]!)).toEqual({ b: 2 });
  });

  it("rotates when file exceeds maxBytes", async () => {
    const log = new RotatingNdjsonLog({
      fs: nodeFs,
      codec,
      logPath,
      maxBytes: 100,
    });

    // Write enough small entries to exceed 100 bytes
    for (let i = 0; i < 20; i++) {
      await log.append({ i, pad: "data" });
    }

    const content = fs.readFileSync(logPath, "utf-8");
    expect(Buffer.byteLength(content, "utf-8")).toBeLessThanOrEqual(100);
    // Should have kept some entries (not all 20)
    const lines = content.trimEnd().split("\n");
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.length).toBeLessThan(20);
  });

  it("does not erase log when a single oversized entry exceeds maxBytes", async () => {
    const maxBytes = 50;
    const log = new RotatingNdjsonLog({
      fs: nodeFs,
      codec,
      logPath,
      maxBytes,
    });

    // Write one entry that is larger than maxBytes
    const bigPayload = "x".repeat(maxBytes * 2);
    await log.append({ big: bigPayload });

    const contentAfterBig = fs.readFileSync(logPath, "utf-8");
    const linesAfterBig = contentAfterBig.trimEnd().split("\n");
    expect(linesAfterBig).toHaveLength(1);
    expect(JSON.parse(linesAfterBig[0]!)).toEqual({ big: bigPayload });

    // Append another small entry — the oversized entry must survive rotation
    await log.append({ small: true });

    const contentAfterSmall = fs.readFileSync(logPath, "utf-8");
    const linesAfterSmall = contentAfterSmall.trimEnd().split("\n");
    // Log must not be empty — at minimum the small entry should be present
    expect(linesAfterSmall.length).toBeGreaterThan(0);
    // The content must not be just whitespace
    expect(contentAfterSmall.trim().length).toBeGreaterThan(0);
  });
});
