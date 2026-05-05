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

  it("rejects non-symbol ids and malformed ids", () => {
    expect(SymIdCodec.decode("file:src/example.ts")).toBeNull();
    expect(SymIdCodec.decode("sym:missingSeparator")).toBeNull();
    expect(SymIdCodec.isSymId("file:src/example.ts")).toBe(false);
  });
});
