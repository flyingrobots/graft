import { describe, it, expect } from "vitest";
import { assertToolContext } from "../../../src/mcp/context.js";

function minimalContext(): Record<string, unknown> {
  return {
    projectRoot: "/tmp",
    graftDir: "/tmp/.graft",
    graftignorePatterns: [],
    governor: { recordToolCall: () => undefined },
    cache: {},
    metrics: {},
    fs: {
      readFile: () => Promise.resolve(""),
      readdir: () => Promise.resolve([]),
      writeFile: () => Promise.resolve(),
      appendFile: () => Promise.resolve(),
      mkdir: () => Promise.resolve(),
      stat: () => Promise.resolve({ size: 0 }),
      readFileSync: () => "",
    },
    codec: { encode: () => "{}", decode: () => ({}) },
    process: { run: () => ({}) },
    git: { run: () => Promise.resolve({}) },
    runCapture: {},
    observability: {},
    respond: () => ({ content: [] }),
    resolvePath: (r: string) => r,
    getWarp: () => Promise.resolve({}),
    getRepoState: () => ({}),
    getCausalContext: () => ({}),
    getWorkspaceStatus: () => ({}),
  };
}

describe("assertToolContext", () => {
  it("accepts a minimal complete context", () => {
    expect(() => { assertToolContext(minimalContext()); }).not.toThrow();
  });

  it("rejects null", () => {
    expect(() => { assertToolContext(null); }).toThrow("must be an object");
  });

  it("rejects missing port", () => {
    const ctx = minimalContext();
    delete ctx["fs"];
    expect(() => { assertToolContext(ctx); }).toThrow("missing port: fs");
  });

  it("rejects missing governance property", () => {
    const ctx = minimalContext();
    delete ctx["governor"];
    expect(() => { assertToolContext(ctx); }).toThrow("missing governance property: governor");
  });

  it("rejects missing method", () => {
    const ctx = minimalContext();
    delete ctx["respond"];
    expect(() => { assertToolContext(ctx); }).toThrow("missing method: respond");
  });

  it("rejects non-function method", () => {
    const ctx = minimalContext();
    ctx["respond"] = "not a function";
    expect(() => { assertToolContext(ctx); }).toThrow("missing method: respond (got string)");
  });
});
