// SPDX-License-Identifier: Apache-2.0
// © James Ross Ω FLYING•ROBOTS <https://github.com/flyingrobots>

import { describe, expect, it } from "vitest";
import { observedBytes } from "../../helpers/observed.js";

describe("observed test helpers", () => {
  it("rejects valid UTF-8 when constructing an invalid-text observation", () => {
    expect(() => observedBytes("valid.ts", new TextEncoder().encode("export const valid = true;\n"))).toThrow();
  });

  it("preserves bytes that cannot be decoded as UTF-8", () => {
    const bytes = Uint8Array.from([0xc3, 0x28]);

    expect(observedBytes("invalid.ts", bytes)).toEqual({
      path: "invalid.ts",
      bytes,
      utf8: null,
    });
  });
});
