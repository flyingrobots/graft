import { describe, expect, it } from "vitest";
import {
  qualifiedReferenceAdapterFor,
  registeredQualifiedReferenceLanguages,
} from "../../../src/warp/qualified-reference-language-adapters.js";

describe("qualified reference language-adapter contract", () => {
  it("registers one typed adapter for every supported code language", () => {
    expect(registeredQualifiedReferenceLanguages).toEqual([
      "python", "ts", "tsx", "js", "rust", "go",
    ]);
    for (const language of registeredQualifiedReferenceLanguages) {
      const adapter = qualifiedReferenceAdapterFor(language);
      expect(adapter.languages).toContain(language);
      expect(adapter).toMatchObject({
        resolveBindings: expect.any(Function),
        collectShadows: expect.any(Function),
        accessParts: expect.any(Function),
      });
    }
  });
});
