import { describe, expect, it } from "vitest";
import { SymIdCodec } from "../../../src/warp/sym-id-codec.js";

describe("SymIdCodec", () => {
  it("encodes and decodes symbol ids with a file path and symbol path", () => {
    const symId = SymIdCodec.encode("src/warp/index-head.ts", "IndexHead.run");

    expect(symId).toBe("sym:src/warp/index-head.ts:IndexHead.run");
    expect(SymIdCodec.decode(symId)).toEqual({
      filePath: "src/warp/index-head.ts",
      symbolPath: "IndexHead.run",
    });
  });

  it("uses the last separator as the symbol boundary", () => {
    expect(SymIdCodec.decode("sym:src/example.ts:Namespace:method")).toEqual({
      filePath: "src/example.ts:Namespace",
      symbolPath: "method",
    });
  });

  it("escapes delimiter characters when encoding symbol paths", () => {
    const symId = SymIdCodec.encode("src/example.ts", "Namespace:method%done");

    expect(symId).toBe("sym:src/example.ts:Namespace%3Amethod%25done");
    expect(SymIdCodec.decode(symId)).toEqual({
      filePath: "src/example.ts",
      symbolPath: "Namespace:method%done",
    });
  });

  it("builds escaped observer patterns for file and symbol lookups", () => {
    expect(SymIdCodec.filePattern("src/example:fixture.ts")).toBe("sym:src/example%3Afixture.ts:*");
    expect(SymIdCodec.symbolNamePattern("Namespace:method")).toBe("sym:*:Namespace%3Amethod");
  });

  it("rejects non-symbol ids and malformed ids", () => {
    expect(SymIdCodec.decode("file:src/example.ts")).toBeNull();
    expect(SymIdCodec.decode("sym:missingSeparator")).toBeNull();
    expect(SymIdCodec.decode("sym::method")).toBeNull();
    expect(SymIdCodec.decode("sym:src/example.ts:")).toBeNull();
    expect(SymIdCodec.isSymId("file:src/example.ts")).toBe(false);
  });
});
