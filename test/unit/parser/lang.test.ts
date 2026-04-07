import { describe, it, expect } from "vitest";
import { detectLang } from "../../../src/parser/lang.js";

describe("parser: detectLang", () => {
  it("recognizes TypeScript-family extensions", () => {
    expect(detectLang("src/index.ts")).toBe("ts");
    expect(detectLang("src/component.tsx")).toBe("ts");
    expect(detectLang("src/module.mts")).toBe("ts");
    expect(detectLang("src/module.cts")).toBe("ts");
  });

  it("recognizes JavaScript-family extensions", () => {
    expect(detectLang("src/index.js")).toBe("js");
    expect(detectLang("src/component.jsx")).toBe("js");
    expect(detectLang("src/module.mjs")).toBe("js");
    expect(detectLang("src/module.cjs")).toBe("js");
  });

  it("returns null for unsupported file types", () => {
    expect(detectLang("README.md")).toBeNull();
    expect(detectLang("config.yaml")).toBeNull();
  });
});
