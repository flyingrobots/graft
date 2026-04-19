import { describe, it, expect } from "vitest";
import { assertFileSystem, assertJsonCodec } from "../../../src/ports/guards.js";
import { nodeFs } from "../../../src/adapters/node-fs.js";
import { CanonicalJsonCodec } from "../../../src/adapters/canonical-json.js";

describe("ports: assertFileSystem", () => {
  it("accepts the real node-fs adapter", () => {
    expect(() => { assertFileSystem(nodeFs); }).not.toThrow();
  });

  it("accepts a complete mock", () => {
    const mock = {
      readFile: () => Promise.resolve(""),
      readdir: () => Promise.resolve([]),
      writeFile: () => Promise.resolve(),
      appendFile: () => Promise.resolve(),
      mkdir: () => Promise.resolve(),
      stat: () => Promise.resolve({ size: 0 }),
      readFileSync: () => "",
    };
    expect(() => { assertFileSystem(mock); }).not.toThrow();
  });

  it("rejects null", () => {
    expect(() => { assertFileSystem(null); }).toThrow("must be an object (got null)");
  });

  it("rejects a non-object", () => {
    expect(() => { assertFileSystem("nope"); }).toThrow(
      "must be an object (got string)",
    );
  });

  it("rejects an object missing a method", () => {
    const partial = {
      readFile: () => Promise.resolve(""),
      readdir: () => Promise.resolve([]),
      // writeFile intentionally missing
      appendFile: () => Promise.resolve(),
      mkdir: () => Promise.resolve(),
      stat: () => Promise.resolve({ size: 0 }),
      readFileSync: () => "",
    };
    expect(() => { assertFileSystem(partial); }).toThrow(
      "FileSystem adapter missing method: writeFile",
    );
  });

  it("rejects an object with a non-function property where a method is expected", () => {
    const broken = {
      readFile: "not a function",
      readdir: () => Promise.resolve([]),
      writeFile: () => Promise.resolve(),
      appendFile: () => Promise.resolve(),
      mkdir: () => Promise.resolve(),
      stat: () => Promise.resolve({ size: 0 }),
      readFileSync: () => "",
    };
    expect(() => { assertFileSystem(broken); }).toThrow(
      "FileSystem adapter missing method: readFile (got string)",
    );
  });
});

describe("ports: assertJsonCodec", () => {
  it("accepts the real canonical-json adapter", () => {
    expect(() => { assertJsonCodec(new CanonicalJsonCodec()); }).not.toThrow();
  });

  it("accepts a complete mock", () => {
    const mock = {
      encode: () => "{}",
      decode: () => ({}),
    };
    expect(() => { assertJsonCodec(mock); }).not.toThrow();
  });

  it("rejects null", () => {
    expect(() => { assertJsonCodec(null); }).toThrow("must be an object (got null)");
  });

  it("rejects an object missing encode", () => {
    expect(() => { assertJsonCodec({ decode: () => ({}) }); }).toThrow(
      "JsonCodec adapter missing method: encode",
    );
  });

  it("rejects an object missing decode", () => {
    expect(() => { assertJsonCodec({ encode: () => "{}" }); }).toThrow(
      "JsonCodec adapter missing method: decode",
    );
  });
});
