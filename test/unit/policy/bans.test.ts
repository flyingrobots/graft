import { describe, it, expect } from "vitest";
import { evaluatePolicy } from "../../../src/policy/evaluate.js";

describe("policy: ban detection", () => {
  describe("binary files", () => {
    const binaries = [
      "image.png", "photo.jpg", "photo.jpeg", "icon.gif",
      "doc.pdf", "archive.zip", "module.wasm", "data.bin",
      "db.sqlite", "video.mp4", "clip.mov", "favicon.ico",
    ];

    for (const file of binaries) {
      it(`refuses ${file} as BINARY`, () => {
        const result = evaluatePolicy({ path: file, lines: 1, bytes: 100 });
        expect(result.projection).toBe("refused");
        expect(result.reason).toBe("BINARY");
      });
    }
  });

  describe("lockfiles", () => {
    const lockfiles = [
      "package-lock.json", "pnpm-lock.yaml", "yarn.lock",
      "Gemfile.lock", "poetry.lock", "Cargo.lock",
      "composer.lock", "Pipfile.lock",
    ];

    for (const file of lockfiles) {
      it(`refuses ${file} as LOCKFILE`, () => {
        const result = evaluatePolicy({ path: file, lines: 1, bytes: 100 });
        expect(result.projection).toBe("refused");
        expect(result.reason).toBe("LOCKFILE");
      });
    }
  });

  describe("minified files", () => {
    it("refuses *.min.js as MINIFIED", () => {
      const result = evaluatePolicy({ path: "bundle.min.js", lines: 1, bytes: 100 });
      expect(result.projection).toBe("refused");
      expect(result.reason).toBe("MINIFIED");
    });

    it("refuses *.min.css as MINIFIED", () => {
      const result = evaluatePolicy({ path: "styles.min.css", lines: 1, bytes: 100 });
      expect(result.projection).toBe("refused");
      expect(result.reason).toBe("MINIFIED");
    });
  });

  describe("build output", () => {
    const buildPaths = [
      "dist/index.js", "build/app.js", ".next/server.js",
      "out/bundle.js", "target/release/main",
    ];

    for (const file of buildPaths) {
      it(`refuses ${file} as BUILD_OUTPUT`, () => {
        const result = evaluatePolicy({ path: file, lines: 1, bytes: 100 });
        expect(result.projection).toBe("refused");
        expect(result.reason).toBe("BUILD_OUTPUT");
      });
    }

    it("suggests source file in next array for build output", () => {
      const result = evaluatePolicy({ path: "dist/utils.js", lines: 1, bytes: 100 });
      expect(result.next).toBeDefined();
      expect(result.next?.some((s) => s.includes("src/"))).toBe(true);
    });
  });

  describe("secret files", () => {
    const secrets = [
      ".env", ".env.local", ".env.production",
      "server.pem", "private.key",
      "credentials.json", "credentials.yaml",
    ];

    for (const file of secrets) {
      it(`refuses ${file} as SECRET`, () => {
        const result = evaluatePolicy({ path: file, lines: 1, bytes: 100 });
        expect(result.projection).toBe("refused");
        expect(result.reason).toBe("SECRET");
      });
    }
  });

  describe("non-banned files pass through", () => {
    const safe = [
      "src/index.ts", "README.md", "package.json",
      "tsconfig.json", "vitest.config.ts",
    ];

    for (const file of safe) {
      it(`allows ${file}`, () => {
        const result = evaluatePolicy({ path: file, lines: 10, bytes: 500 });
        expect(result.projection).toBe("content");
      });
    }
  });

  it("bans take priority over threshold checks", () => {
    // Even a tiny binary is refused
    const result = evaluatePolicy({ path: "icon.png", lines: 1, bytes: 50 });
    expect(result.projection).toBe("refused");
    expect(result.reason).toBe("BINARY");
  });

  it("includes reason detail for refusals", () => {
    const result = evaluatePolicy({ path: "data.bin", lines: 1, bytes: 100 });
    expect(result.reasonDetail).toBeDefined();
    expect(typeof result.reasonDetail).toBe("string");
    expect(result.reasonDetail!.length).toBeGreaterThan(0);
  });

  it("includes next steps for refusals", () => {
    const result = evaluatePolicy({ path: "image.png", lines: 1, bytes: 100 });
    expect(result.next).toBeDefined();
    expect(result.next!.length).toBeGreaterThan(0);
  });
});
