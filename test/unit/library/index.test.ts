import { afterEach, describe, expect, it } from "vitest";
import packageJson from "../../../package.json";
import {
  GRAFT_VERSION,
  MCP_TOOL_NAMES,
  callGraftTool,
  createProjectionBundle,
  createGraftServer,
  createRepoLocalGraft,
  createRepoWorkspace,
  createStructuredBuffer,
  startDaemonServer,
  startStdioServer,
} from "../../../src/index.js";
import { cleanupTestRepo, createCommittedTestRepo } from "../../helpers/git.js";

describe("public library API", () => {
  let repoDir: string | null = null;

  afterEach(() => {
    if (repoDir !== null) {
      cleanupTestRepo(repoDir);
      repoDir = null;
    }
  });

  it("creates a repo-local graft instance with sensible defaults", async () => {
    repoDir = createCommittedTestRepo("graft-library-", {
      "app.ts": "export const ready = true;\n",
    });

    const graft = createRepoLocalGraft({ cwd: repoDir });
    expect(graft.getRegisteredTools()).toContain("safe_read");

    const result = await callGraftTool(graft, "safe_read", { path: "app.ts" });
    expect(result.projection).toBe("content");
    expect(result._schema).toEqual(
      expect.objectContaining({ id: "graft.mcp.safe_read" }),
    );
  });

  it("exports stable top-level metadata and capability names", () => {
    expect(GRAFT_VERSION).toBe(packageJson.version);
    expect(MCP_TOOL_NAMES).toContain("safe_read");
    expect(MCP_TOOL_NAMES).toContain("doctor");
  });

  it("exports direct, bridge, and host surfaces from the root package", () => {
    expect(typeof createRepoWorkspace).toBe("function");
    expect(typeof createStructuredBuffer).toBe("function");
    expect(typeof createProjectionBundle).toBe("function");
    expect(typeof createRepoLocalGraft).toBe("function");
    expect(typeof callGraftTool).toBe("function");
    expect(typeof createGraftServer).toBe("function");
    expect(typeof startStdioServer).toBe("function");
    expect(typeof startDaemonServer).toBe("function");
  });

  it("creates a coherent warm projection bundle from dirty editor content", () => {
    const basis = { kind: "editor_head" as const, headId: "head-42", tick: 17 };
    const bundle = createProjectionBundle(
      "src/view.tsx",
      "export const ready = <div>Hello</div>;\n",
      {
        basis,
        viewport: {
          start: { row: 0, column: 0 },
          end: { row: 0, column: 80 },
        },
      },
    );

    expect(bundle.basis).toEqual(basis);
    expect(bundle.parseStatus.status).toBe("full");
    expect(bundle.syntax.basis).toEqual(basis);
    expect(bundle.outline.basis).toEqual(basis);
    expect(bundle.folds.basis).toEqual(basis);
    expect(bundle.diagnostics.basis).toEqual(basis);
  });
});
