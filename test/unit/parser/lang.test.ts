import { describe, it, expect } from "vitest";
import {
  SUPPORTED_LANGS,
  SUPPORTED_STRUCTURED_FORMATS,
  detectLang,
  detectStructuredFormat,
  isSupportedLang,
  isSupportedStructuredFormat,
} from "../../../src/parser/lang.js";

describe("parser: detectLang", () => {
  it("recognizes TypeScript-family extensions", () => {
    expect(detectLang("src/index.ts")).toBe("ts");
    expect(detectLang("src/component.tsx")).toBe("tsx");
    expect(detectLang("src/module.mts")).toBe("ts");
    expect(detectLang("src/module.cts")).toBe("ts");
  });

  it("recognizes JavaScript-family extensions", () => {
    expect(detectLang("src/index.js")).toBe("js");
    expect(detectLang("src/component.jsx")).toBe("tsx");
    expect(detectLang("src/module.mjs")).toBe("js");
    expect(detectLang("src/module.cjs")).toBe("js");
  });

  it("normalizes separators and casing without node:path", () => {
    expect(detectLang("SRC\\COMPONENT.TSX")).toBe("tsx");
    expect(detectLang("src/NESTED\\module.MJS")).toBe("js");
  });

  it("returns null for unsupported file types", () => {
    expect(detectLang("README.md")).toBeNull();
    expect(detectLang("config.yaml")).toBeNull();
  });
});

describe("parser: detectStructuredFormat", () => {
  it("recognizes markdown as a structured document format", () => {
    expect(detectStructuredFormat("README.md")).toBe("md");
  });

  it("returns null for unsupported structured formats", () => {
    expect(detectStructuredFormat("config.yaml")).toBeNull();
  });
});

describe("parser: supported format identity", () => {
  it("exports explicit supported language identities", () => {
    expect(SUPPORTED_LANGS).toEqual(["ts", "tsx", "js"]);
    expect(SUPPORTED_STRUCTURED_FORMATS).toEqual(["ts", "tsx", "js", "md"]);
  });

  it("provides runtime guards for supported identities", () => {
    expect(isSupportedLang("ts")).toBe(true);
    expect(isSupportedLang("md")).toBe(false);
    expect(isSupportedStructuredFormat("md")).toBe(true);
    expect(isSupportedStructuredFormat("yaml")).toBe(false);
  });
});
