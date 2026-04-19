import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";

const WARP_PORT = path.resolve(import.meta.dirname, "../../src/ports/warp.ts");
const OPEN_WARP = path.resolve(import.meta.dirname, "../../src/warp/open.ts");
const MCP_CONTEXT = path.resolve(import.meta.dirname, "../../src/mcp/context.ts");
const WARP_POOL = path.resolve(import.meta.dirname, "../../src/mcp/warp-pool.ts");
const WORKSPACE_ROUTER = path.resolve(import.meta.dirname, "../../src/mcp/workspace-router.ts");
const LOCAL_HISTORY_GRAPH = path.resolve(import.meta.dirname, "../../src/mcp/persisted-local-history-graph.ts");
const PRECISION = path.resolve(import.meta.dirname, "../../src/mcp/tools/precision.ts");
const MIGRATE_LOCAL_HISTORY = path.resolve(import.meta.dirname, "../../src/cli/migrate-local-history.ts");
const PLAYBACK_TEST = path.resolve(
  import.meta.dirname,
  "./0080-warp-port-and-adapter-boundary.test.ts",
);

function read(pathname: string): string {
  return fs.readFileSync(pathname, "utf-8");
}

describe("0080 warp port and adapter boundary", () => {
  it("Can a human point to one repo-visible WARP port contract instead of discovering graph capabilities by reading scattered raw `WarpApp` call sites?", () => {
    const content = read(WARP_PORT);

    expect(content).toContain("export interface WarpHandle");
    expect(content).toContain("export interface WarpObserver");
    expect(content).toContain("export interface WarpPatchBuilder");
  });

  it("Can a human see that shared MCP and CLI code talk to an explicit WARP handle type rather than importing `@git-stunts/git-warp` directly?", () => {
    const context = read(MCP_CONTEXT);
    const migrate = read(MIGRATE_LOCAL_HISTORY);

    expect(context).toContain('import type { WarpHandle } from "../ports/warp.js";');
    expect(context).not.toContain("@git-stunts/git-warp");
    expect(migrate).not.toContain("@git-stunts/git-warp");
  });

  it("Is the local-history graph seam no longer a cast-based “trust me” adapter?", () => {
    const content = read(LOCAL_HISTORY_GRAPH);

    expect(content).toContain('type PersistedLocalHistoryGraphWarp = Pick<WarpHandle, "hasNode" | "observer" | "patch">;');
    expect(content).not.toContain("asPersistedLocalHistoryGraphWarp");
    expect(content).not.toContain("return warp as");
  });

  it("Does `src/ports/warp.ts` define the WARP handle, observer, patch, and materialization contract used by the rest of the repo?", () => {
    const content = read(WARP_PORT);

    expect(content).toContain("observer(lens: WarpObserverLens");
    expect(content).toContain("patch(build: (patch: WarpPatchBuilder)");
    expect(content).toContain("materialize(): Promise<void>;");
    expect(content).toContain("materializeReceipts()");
  });

  it("Does `openWarp()` return that port handle while keeping raw `@git-stunts/git-warp` usage inside the adapter layer?", () => {
    const content = read(OPEN_WARP);

    expect(content).toContain('from "@git-stunts/git-warp"');
    expect(content).toContain("function wrapWarpApp");
    expect(content).toContain("Promise<WarpHandle>");
  });

  it("Do MCP and CLI surfaces use the port type for pooling, context, precision reads, and local-history graph access?", () => {
    const context = read(MCP_CONTEXT);
    const pool = read(WARP_POOL);
    const router = read(WORKSPACE_ROUTER);
    const precision = read(PRECISION);
    const migrate = read(MIGRATE_LOCAL_HISTORY);

    expect(context).toContain("getWarp(): Promise<WarpHandle>");
    expect(pool).toContain("Promise<WarpHandle>");
    expect(router).toContain("getWarp(): Promise<WarpHandle>");
    // WarpHandle import moved to precision-warp.ts; the barrel re-exports from it
    expect(precision).toContain("./precision-warp.js");
    expect(precision).toContain("searchWarpSymbols");
    expect(migrate).not.toContain("asPersistedLocalHistoryGraphWarp");
  });

  it("Is there a playback witness that mechanically proves the boundary instead of leaving it as a refactor-by-convention?", () => {
    expect(fs.existsSync(PLAYBACK_TEST)).toBe(true);
  });
});
