import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { buildWorkspaceReadObservation } from "../../../src/mcp/workspace-read-observation.js";
import type { WorkspaceExecutionContext } from "../../../src/mcp/workspace-router.js";

function createExecution(workspaceOverlayId: string | null): WorkspaceExecutionContext {
  const worktreeRoot = path.resolve("/tmp/graft-workspace-read-observation");
  return {
    worktreeRoot,
    resolvePath: (relative) => path.join(worktreeRoot, relative),
    repoState: {
      getState() {
        return { workspaceOverlayId };
      },
    },
  } as WorkspaceExecutionContext;
}

describe("workspace read observation", () => {
  it("builds safe_read observations from validated args and result models", () => {
    const observation = buildWorkspaceReadObservation(
      createExecution(null),
      "safe_read",
      { path: "src/app.ts" },
      { projection: "content", reason: "SAFE_READ" },
    );

    expect(observation).toEqual({
      surface: "safe_read",
      projection: "content",
      sourceLayer: "canonical_structural_truth",
      reason: "SAFE_READ",
      footprint: {
        paths: ["src/app.ts"],
        symbols: [],
        regions: [],
      },
    });
  });

  it("ignores unsupported file_outline payloads", () => {
    const observation = buildWorkspaceReadObservation(
      createExecution("overlay-1"),
      "file_outline",
      { path: "src/app.ts" },
      { reason: "UNSUPPORTED_LANGUAGE" },
    );

    expect(observation).toBeNull();
  });

  it("builds read_range observations only when the payload matches the expected model", () => {
    const observation = buildWorkspaceReadObservation(
      createExecution("overlay-1"),
      "read_range",
      { path: "src/app.ts" },
      { content: "hello", startLine: 3, endLine: 5 },
    );

    expect(observation).toEqual({
      surface: "read_range",
      projection: "content",
      sourceLayer: "workspace_overlay",
      reason: "READ_RANGE",
      footprint: {
        paths: ["src/app.ts"],
        symbols: [],
        regions: [{
          path: "src/app.ts",
          startLine: 3,
          endLine: 5,
        }],
      },
    });
  });

  it("returns null when args do not match the attributed-read model", () => {
    const observation = buildWorkspaceReadObservation(
      createExecution(null),
      "safe_read",
      { path: 42 },
      { projection: "content" },
    );

    expect(observation).toBeNull();
  });
});
