import { describe, expect, it } from "vitest";
import packageJson from "../../../package.json";

describe("release package docs", () => {
  it("ships every release-facing doc linked from README", () => {
    expect(packageJson.files).toEqual(expect.arrayContaining([
      "ADVANCED_GUIDE.md",
      "ARCHITECTURE.md",
      "CHANGELOG.md",
      "CODE_OF_CONDUCT.md",
      "GUIDE.md",
      "docs/CLI.md",
      "docs/MCP.md",
      "docs/SETUP.md",
      "README.md",
    ]));
  });
});
