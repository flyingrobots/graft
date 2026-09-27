/**
 * Claims files over MCP (docs/design/CORE_claims-source-files.md).
 *
 * Promise: Graft serves claims files administratively. `file_outline` gives
 * the claim tree by canonical path, and `code_find` on an artifact id locates
 * the file. Graft refuses the evidence role: no registered tool answers a
 * support or evidence question, and what it serves about a claims file carries
 * no support or truth judgment (Contextual Claims 2 §11.4).
 * Oracle: the design packet's playback questions; the invented fixture below.
 * RED: observed before the claims extractor (the outline was plain JSON keys
 * and `code_find` could not locate the artifact id).
 */
import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { cleanupTestRepo, createTestRepo, git } from "../../helpers/git.js";
import { createServerInRepo, parse } from "../../helpers/mcp.js";

const doc = {
  artifact: { artifactId: "A7", contentHash: "sha256:" + "0".repeat(64) },
  candidates: [
    {
      term: {
        kind: "scope",
        frame: { kind: "speech", speaker: { kind: "named", sourceName: "Rosa" } },
        body: { kind: "atom", claim: { subject: { kind: "anonymous", localId: "venue" }, predicate: "is_booked_for", object: "Friday" } },
      },
      annotations: {},
    },
  ],
};

const JUDGMENT = /\b(supported|supports|asserted|refuted|verified|true|false)\b/i;

function withClaimsRepo(prefix: string, fn: (dir: string) => Promise<void>): Promise<void> {
  const dir = createTestRepo(prefix);
  fs.writeFileSync(path.join(dir, "venue-notes.json"), JSON.stringify(doc, null, 2) + "\n");
  git(dir, "add -A");
  git(dir, "commit -m init");
  return fn(dir).finally(() => {
    cleanupTestRepo(dir);
  });
}

describe("mcp: claims files", () => {
  it("file_outline serves the claim tree by canonical path", () =>
    withClaimsRepo("graft-claims-outline-", async (dir) => {
      const server = createServerInRepo(dir);
      const result = parse(await server.callTool("file_outline", { path: path.join(dir, "venue-notes.json") }));
      const text = JSON.stringify(result["outline"]);
      expect(text).toContain('"A7"');
      expect(text).toContain('"$.body"');
      expect(text).toContain("speech(Rosa)");
      const jumps = result["jumpTable"] as { symbol: string }[];
      expect(jumps.map((j) => j.symbol)).toContain("$.body");
    }));

  it("code_find on an artifact id locates its claims file", () =>
    withClaimsRepo("graft-claims-find-", async (dir) => {
      const server = createServerInRepo(dir);
      const result = parse(await server.callTool("code_find", { query: "A7" }));
      const matches = result["matches"] as { name: string; path: string }[];
      expect(matches.some((m) => m.name === "A7" && m.path.endsWith("venue-notes.json"))).toBe(true);
    }));

  it("refuses the evidence role: no support or evidence tool, and no judgment in what it serves", () =>
    withClaimsRepo("graft-claims-refuse-", async (dir) => {
      const server = createServerInRepo(dir);
      for (const name of server.getRegisteredTools()) {
        expect(name, name).not.toMatch(/support|evidence|judg|verdict|truth/i);
      }
      const outline = parse(await server.callTool("file_outline", { path: path.join(dir, "venue-notes.json") }));
      const signatures = JSON.stringify(outline["outline"]).match(/"signature":"[^"]*"/g) ?? [];
      expect(signatures.length).toBeGreaterThan(0);
      for (const s of signatures) expect(s).not.toMatch(JUDGMENT);
    }));
});
