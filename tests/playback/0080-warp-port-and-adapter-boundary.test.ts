import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";

const SRC = path.resolve(import.meta.dirname, "../../src");
const WARP_CONTEXT = path.resolve(SRC, "warp/context.ts");
const OPEN_WARP = path.resolve(SRC, "warp/open.ts");
const WARP_POOL = path.resolve(SRC, "mcp/warp-pool.ts");
const MCP_CONTEXT = path.resolve(SRC, "mcp/context.ts");
const OLD_PORT = path.resolve(SRC, "ports/warp.ts");

const PLAYBACK_TEST = path.resolve(
  import.meta.dirname,
  "./0080-warp-port-and-adapter-boundary.test.ts",
);

function read(pathname: string): string {
  return fs.readFileSync(pathname, "utf-8");
}

/**
 * Recursively collect all .ts files under a directory.
 */
function collectTsFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectTsFiles(full));
    } else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".d.ts")) {
      results.push(full);
    }
  }
  return results;
}

describe("0080 warp boundary — git-warp as domain infrastructure", () => {
  it("Has the old WarpHandle port been removed?", () => {
    expect(
      fs.existsSync(OLD_PORT),
      "src/ports/warp.ts should no longer exist",
    ).toBe(false);
  });

  it("Does WarpContext exist as the session-scoped DI bag with strandId routing?", () => {
    const content = read(WARP_CONTEXT);

    expect(content).toContain("export interface WarpContext");
    expect(content).toContain("strandId");
    expect(content).toContain("export async function patchGraph");
    expect(content).toContain("export async function observeGraph");
    expect(content).toContain("export async function materializeGraph");
  });

  it("Do strand routing helpers fail-closed when strandId is set?", () => {
    const content = read(WARP_CONTEXT);

    // All three helpers must guard against non-null strandId
    expect(content).toContain("assertNoStrand");
    expect(content).toMatch(/strand.*not yet supported/i);
  });

  it("Is openWarp() the sole construction adapter — the only file that wires GitGraphAdapter + GitPlumbing?", () => {
    const content = read(OPEN_WARP);

    expect(content).toContain('from "@git-stunts/git-warp"');
    expect(content).toContain("GitGraphAdapter");
    expect(content).toContain("@git-stunts/plumbing");

    // No other source file should import these construction-only types
    const allFiles = collectTsFiles(SRC);
    for (const file of allFiles) {
      if (file === OPEN_WARP) continue;
      // plumbing.d.ts is a type declaration, not app code
      if (file.endsWith("plumbing.d.ts")) continue;
      const source = read(file);
      expect(source).not.toContain(
        "GitGraphAdapter",
        // intentionally no message — vitest shows the file path in the diff
      );
    }
  });

  it("Does no source file import from the old ports/warp.ts path?", () => {
    const allFiles = collectTsFiles(SRC);
    for (const file of allFiles) {
      const source = read(file);
      expect(source).not.toMatch(
        /from\s+["'].*ports\/warp/,
        // intentionally no message — vitest shows the file path in the diff
      );
    }
  });

  it("Does the WarpPool vend WarpApp, not WarpHandle?", () => {
    const content = read(WARP_POOL);

    expect(content).not.toContain("WarpHandle");
    expect(content).toContain("WarpApp");
  });

  it("Does the MCP context expose WarpContext, not WarpHandle?", () => {
    const content = read(MCP_CONTEXT);

    expect(content).not.toContain("WarpHandle");
    expect(content).toContain("WarpContext");
  });

  it("Is there a playback witness that mechanically proves the boundary?", () => {
    expect(fs.existsSync(PLAYBACK_TEST)).toBe(true);
  });
});
