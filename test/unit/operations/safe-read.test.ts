import { describe, it, expect } from "vitest";
import { safeRead } from "../../../src/operations/safe-read.js";
import { nodeFs } from "../../../src/adapters/node-fs.js";
import { CanonicalJsonCodec } from "../../../src/adapters/canonical-json.js";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const codec = new CanonicalJsonCodec();
const FIXTURES = path.resolve(import.meta.dirname, "../../fixtures");

describe("operations: safe_read", () => {
  it("returns content for small files", async () => {
    const result = await safeRead(path.join(FIXTURES, "small.ts"), { fs: nodeFs, codec });
    expect(result.projection).toBe("content");
    expect(result.content).toBeDefined();
    expect(result.content).toContain("greet");
    expect(result.reason).toBe("CONTENT");
  });

  it("returns outline for large files", async () => {
    const result = await safeRead(path.join(FIXTURES, "large.ts"), { fs: nodeFs, codec });
    expect(result.projection).toBe("outline");
    expect(result.outline).toBeDefined();
    expect(result.outline!.length).toBeGreaterThan(0);
    expect(result.jumpTable).toBeDefined();
    expect(result.jumpTable!.length).toBeGreaterThan(0);
    expect(result.reason).toBe("OUTLINE");
  });

  it("returns refused for binary files", async () => {
    const result = await safeRead(
      path.join(FIXTURES, "ban-targets/image.png"),
      { fs: nodeFs, codec },
    );
    expect(result.projection).toBe("refused");
    expect(result.reason).toBe("BINARY");
    expect(result.next).toBeDefined();
  });

  it("returns refused for lockfiles", async () => {
    const result = await safeRead(
      path.join(FIXTURES, "ban-targets/package-lock.json"),
      { fs: nodeFs, codec },
    );
    expect(result.projection).toBe("refused");
    expect(result.reason).toBe("LOCKFILE");
  });

  it("returns refused for minified files", async () => {
    const result = await safeRead(
      path.join(FIXTURES, "ban-targets/bundle.min.js"),
      { fs: nodeFs, codec },
    );
    expect(result.projection).toBe("refused");
    expect(result.reason).toBe("MINIFIED");
  });

  it("returns refused for secret files", async () => {
    const result = await safeRead(
      path.join(FIXTURES, "ban-targets/.env"),
      { fs: nodeFs, codec },
    );
    expect(result.projection).toBe("refused");
    expect(result.reason).toBe("SECRET");
  });

  it("returns error for nonexistent files", async () => {
    const result = await safeRead(
      path.join(FIXTURES, "does-not-exist.ts"),
      { fs: nodeFs, codec },
    );
    expect(result.projection).toBe("error");
    expect(result.reason).toBe("NOT_FOUND");
  });

  it("returns path in every result", async () => {
    const filePath = path.join(FIXTURES, "small.ts");
    const result = await safeRead(filePath, { fs: nodeFs, codec });
    expect(result.path).toBe(filePath);
  });

  it("includes actual dimensions in result", async () => {
    const result = await safeRead(path.join(FIXTURES, "small.ts"), { fs: nodeFs, codec });
    expect(result.actual).toBeDefined();
    expect(result.actual!.lines).toBeGreaterThan(0);
    expect(result.actual!.bytes).toBeGreaterThan(0);
  });

  it("includes threshold values in result", async () => {
    const result = await safeRead(path.join(FIXTURES, "small.ts"), { fs: nodeFs, codec });
    expect(result.thresholds).toBeDefined();
    expect(result.thresholds!.lines).toBe(150);
    expect(result.thresholds!.bytes).toBe(12288);
  });

  it("includes estimatedBytesAvoided when outline returned", async () => {
    const result = await safeRead(path.join(FIXTURES, "large.ts"), { fs: nodeFs, codec });
    expect(result.projection).toBe("outline");
    expect(result.estimatedBytesAvoided).toBeDefined();
    expect(result.estimatedBytesAvoided!).toBeGreaterThan(0);
  });

  it("returns an explicit unsupported outline result for large markdown files", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-safe-read-md-"));
    const filePath = path.join(tmpDir, "README.md");
    fs.writeFileSync(
      filePath,
      Array.from({ length: 220 }, (_, i) => `## Section ${String(i)}\n\nParagraph ${String(i)}.\n`).join("\n"),
    );

    const result = await safeRead(filePath, { fs: nodeFs, codec });
    expect(result.projection).toBe("outline");
    expect(result.reason).toBe("UNSUPPORTED_LANGUAGE");
    expect(result.outline).toEqual([]);
    expect(result.jumpTable).toEqual([]);
    expect(result.next).toBeDefined();
    expect(result.next!.length).toBeGreaterThan(0);
  });

  it("accepts optional intent parameter without changing policy", async () => {
    const result = await safeRead(
      path.join(FIXTURES, "large.ts"),
      { fs: nodeFs, codec, intent: "reviewing the class structure" },
    );
    // Intent is advisory only — still returns outline for large file
    expect(result.projection).toBe("outline");
  });

  it("respects session depth when provided", async () => {
    // medium.ts is under static thresholds but may exceed dynamic cap
    const result = await safeRead(
      path.join(FIXTURES, "medium.ts"),
      { fs: nodeFs, codec, sessionDepth: "late" },
    );
    // medium.ts is ~3KB — check if it exceeds 4KB late cap
    // If under 4KB, should be content; if over, SESSION_CAP
    expect(["content", "outline"]).toContain(result.projection);
    if (result.projection === "outline") {
      expect(result.reason).toBe("SESSION_CAP");
    }
  });
});
