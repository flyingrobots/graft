import { describe, expect, it } from "vitest";
import packageJson from "../../../package.json";

describe("release package docs", () => {
  it("ships every release-facing doc linked from README", () => {
    expect(packageJson.files).toEqual(expect.arrayContaining([
      "ARCHITECTURE.md",
      "CODE_OF_CONDUCT.md",
      "docs/ADVANCED_GUIDE.md",
      "docs/CLI.md",
      "docs/GUIDE.md",
      "docs/MCP.md",
      "README.md",
      "CHANGELOG.md",
    ]));
  });
});
