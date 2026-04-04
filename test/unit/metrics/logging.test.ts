import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { MetricsLogger } from "../../../src/metrics/logger.js";
import type { DecisionEntry } from "../../../src/metrics/types.js";
import { nodeFs } from "../../../src/adapters/node-fs.js";
import { CanonicalJsonCodec } from "../../../src/adapters/canonical-json.js";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const codec = new CanonicalJsonCodec();

describe("metrics: NDJSON decision logging", () => {
  let tmpDir: string;
  let logPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-metrics-"));
    logPath = path.join(tmpDir, "decisions.ndjson");
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("writes a decision entry as NDJSON", async () => {
    const logger = new MetricsLogger(logPath, { fs: nodeFs, codec });
    await logger.log({
      command: "safe_read",
      path: "src/file.ts",
      projection: "content",
      reason: "CONTENT",
      lines: 50,
      bytes: 2000,
    });

    const content = fs.readFileSync(logPath, "utf-8");
    const entry = JSON.parse(content.trim()) as DecisionEntry;
    expect(entry.command).toBe("safe_read");
    expect(entry.projection).toBe("content");
    expect(entry.ts).toBeDefined();
  });

  it("appends multiple entries (one per line)", async () => {
    const logger = new MetricsLogger(logPath, { fs: nodeFs, codec });
    await logger.log({
      command: "safe_read",
      path: "a.ts",
      projection: "content",
      reason: "CONTENT",
      lines: 10,
      bytes: 500,
    });
    await logger.log({
      command: "safe_read",
      path: "b.ts",
      projection: "outline",
      reason: "OUTLINE",
      lines: 200,
      bytes: 15000,
    });

    const lines = fs.readFileSync(logPath, "utf-8").trim().split("\n");
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0]!)).toHaveProperty("path", "a.ts");
    expect(JSON.parse(lines[1]!)).toHaveProperty("path", "b.ts");
  });

  it("includes timestamp in every entry", async () => {
    const logger = new MetricsLogger(logPath, { fs: nodeFs, codec });
    await logger.log({
      command: "file_outline",
      path: "x.ts",
      projection: "outline",
      reason: "OUTLINE",
      lines: 100,
      bytes: 5000,
    });

    const content = fs.readFileSync(logPath, "utf-8");
    const entry = JSON.parse(content.trim()) as DecisionEntry;
    expect(entry.ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("includes estimatedBytesAvoided when provided", async () => {
    const logger = new MetricsLogger(logPath, { fs: nodeFs, codec });
    await logger.log({
      command: "safe_read",
      path: "big.ts",
      projection: "outline",
      reason: "OUTLINE",
      lines: 500,
      bytes: 40000,
      estimatedBytesAvoided: 38000,
    });

    const content = fs.readFileSync(logPath, "utf-8");
    const entry = JSON.parse(content.trim()) as DecisionEntry;
    expect(entry.estimatedBytesAvoided).toBe(38000);
  });

  it("includes tripwire field when provided", async () => {
    const logger = new MetricsLogger(logPath, { fs: nodeFs, codec });
    await logger.log({
      command: "safe_read",
      path: "late.ts",
      projection: "outline",
      reason: "SESSION_CAP",
      lines: 100,
      bytes: 8000,
      sessionDepth: "late",
      tripwire: "LATE_LARGE_READ",
    });

    const content = fs.readFileSync(logPath, "utf-8");
    const entry = JSON.parse(content.trim()) as DecisionEntry;
    expect(entry.tripwire).toBe("LATE_LARGE_READ");
    expect(entry.sessionDepth).toBe("late");
  });

  it("creates log directory if it doesn't exist", async () => {
    const deepPath = path.join(tmpDir, "nested", "deep", "decisions.ndjson");
    const logger = new MetricsLogger(deepPath, { fs: nodeFs, codec });
    await logger.log({
      command: "safe_read",
      path: "a.ts",
      projection: "content",
      reason: "CONTENT",
      lines: 10,
      bytes: 500,
    });
    expect(fs.existsSync(deepPath)).toBe(true);
  });

  describe("retention", () => {
    it("rotates log when exceeding 1 MB", async () => {
      const logger = new MetricsLogger(logPath, { fs: nodeFs, codec, maxBytes: 1024 });
      // Write enough to exceed 1 KB (scaled down for test)
      for (let i = 0; i < 20; i++) {
        await logger.log({
          command: "safe_read",
          path: `file${String(i)}.ts`,
          projection: "content",
          reason: "CONTENT",
          lines: 10,
          bytes: 500,
        });
      }
      // After rotation, log should be under the limit
      const stat = fs.statSync(logPath);
      expect(stat.size).toBeLessThan(1024);
    });
  });
});
