import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { cleanupTestRepo, createTestRepo, git } from "../../helpers/git.js";
import { createServerInRepo, parse } from "../../helpers/mcp.js";

describe("mcp: graft_review cold WARP", () => {
  it("preserves breaking-change impact counts without a pre-indexed WARP graph", async () => {
    const repoDir = createTestRepo("graft-review-cold-warp-");
    try {
      fs.mkdirSync(path.join(repoDir, "src"), { recursive: true });
      fs.writeFileSync(
        path.join(repoDir, "src", "api.ts"),
        "export function buildThing(input: string): string { return input; }\n",
      );
      fs.writeFileSync(
        path.join(repoDir, "src", "consumer.ts"),
        [
          "import { buildThing } from \"./api\";",
          "export const value = buildThing(\"x\");",
          "",
        ].join("\n"),
      );
      git(repoDir, "add -A");
      git(repoDir, "commit -m base");
      const base = git(repoDir, "rev-parse HEAD");

      fs.writeFileSync(
        path.join(repoDir, "src", "api.ts"),
        [
          "export function buildThing(",
          "  input: string,",
          "  opts: { trim: boolean },",
          "): string {",
          "  return opts.trim ? input.trim() : input;",
          "}",
          "",
        ].join("\n"),
      );
      git(repoDir, "add -A");
      git(repoDir, "commit -m head");
      const head = git(repoDir, "rev-parse HEAD");

      const server = createServerInRepo(repoDir);
      const result = parse(await server.callTool("graft_review", { base, head }));

      expect(result["breakingChanges"]).toContainEqual(expect.objectContaining({
        symbol: "buildThing",
        changeType: "signature_changed",
        impactedFiles: 1,
        impactedFilePaths: ["src/consumer.ts"],
      }));
    } finally {
      cleanupTestRepo(repoDir);
    }
  });
});
