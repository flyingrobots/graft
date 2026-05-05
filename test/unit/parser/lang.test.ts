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

  it("recognizes Rust extensions", () => {
    expect(detectLang("src/lib.rs")).toBe("rust");
    expect(detectStructuredFormat("src/lib.rs")).toBe("rust");
  });

  it("recognizes GraphQL extensions", () => {
    expect(detectLang("schema.graphql")).toBe("graphql");
    expect(detectLang("src/query.gql")).toBe("graphql");
    expect(detectLang("src/schema.graphqls")).toBe("graphql");
    expect(detectStructuredFormat("src/schema.graphql")).toBe("graphql");
  });

  it("recognizes Python extensions", () => {
    expect(detectLang("app/main.py")).toBe("python");
    expect(detectLang("types/package.pyi")).toBe("python");
    expect(detectStructuredFormat("app/main.py")).toBe("python");
  });

  it("normalizes separators and casing without node:path", () => {
    expect(detectLang("SRC\\COMPONENT.TSX")).toBe("tsx");
    expect(detectLang("src/NESTED\\module.MJS")).toBe("js");
    expect(detectLang("SRC\\LIB.RS")).toBe("rust");
    expect(detectLang("SRC\\SCHEMA.GRAPHQL")).toBe("graphql");
    expect(detectLang("SRC\\SERVICE.PY")).toBe("python");
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
    expect(SUPPORTED_LANGS).toEqual(["ts", "tsx", "js", "rust", "graphql", "python"]);
    expect(SUPPORTED_STRUCTURED_FORMATS).toEqual(["ts", "tsx", "js", "rust", "graphql", "python", "md"]);
  });

  it("provides runtime guards for supported identities", () => {
    expect(isSupportedLang("ts")).toBe(true);
    expect(isSupportedLang("rust")).toBe(true);
    expect(isSupportedLang("graphql")).toBe(true);
    expect(isSupportedLang("python")).toBe(true);
    expect(isSupportedLang("md")).toBe(false);
    expect(isSupportedStructuredFormat("rust")).toBe(true);
    expect(isSupportedStructuredFormat("graphql")).toBe(true);
    expect(isSupportedStructuredFormat("python")).toBe(true);
    expect(isSupportedStructuredFormat("md")).toBe(true);
    expect(isSupportedStructuredFormat("yaml")).toBe(false);
  });
});
