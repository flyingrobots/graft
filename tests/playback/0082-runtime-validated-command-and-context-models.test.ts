import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { parseGraftToolPayload } from "../../src/api/tool-bridge.js";
import { parseToolPayload } from "../../src/mcp/server-tool-access.js";
import { buildWorkspaceReadObservation } from "../../src/mcp/workspace-read-observation.js";
import type { WorkspaceExecutionContext } from "../../src/mcp/workspace-router.js";
import type { McpToolResult } from "../../src/mcp/server.js";

const JSON_OBJECT_CONTRACT = path.resolve(import.meta.dirname, "../../src/contracts/json-object.ts");
const API_TOOL_BRIDGE = path.resolve(import.meta.dirname, "../../src/api/tool-bridge.ts");
const MCP_TOOL_ACCESS = path.resolve(import.meta.dirname, "../../src/mcp/server-tool-access.ts");
const READ_OBSERVATION = path.resolve(import.meta.dirname, "../../src/mcp/workspace-read-observation.ts");
const READ_OBSERVATION_MODEL = path.resolve(
  import.meta.dirname,
  "../../src/mcp/workspace-read-observation-model.ts",
);

function read(pathname: string): string {
  return fs.readFileSync(pathname, "utf-8");
}

function createTextResult(text: string): McpToolResult {
  return {
    content: [{ type: "text", text }],
  };
}

function createExecution(workspaceOverlayId: string | null): WorkspaceExecutionContext {
  const worktreeRoot = path.resolve("/tmp/graft-0082");
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

describe("0082 runtime validated command and context models", () => {
  it("Can a reviewer point to explicit runtime models for parsed tool payloads and attributed read observations instead of reading those boundaries as `JSON.parse(...) as Record<string, unknown>` plus manual property checks?", () => {
    expect(fs.existsSync(JSON_OBJECT_CONTRACT)).toBe(true);
    expect(fs.existsSync(READ_OBSERVATION_MODEL)).toBe(true);

    expect(read(API_TOOL_BRIDGE)).toContain("../contracts/json-object.js");
    expect(read(MCP_TOOL_ACCESS)).toContain("../contracts/json-object.js");
    expect(read(READ_OBSERVATION)).toContain("./workspace-read-observation-model.js");
  });

  it("Do API and MCP tool payload parsing fail lawfully when the result is not a JSON object, instead of silently accepting non-object payloads or relying on structural casts?", () => {
    expect(() => parseGraftToolPayload(createTextResult('["not","an","object"]'))).toThrow(
      "Graft tool result was not a JSON object",
    );
    expect(parseToolPayload(createTextResult('["not","an","object"]'))).toBeNull();
  });

  it("Does the attributed-read observation seam accept only validated args/result shapes while preserving the same safe-read, file-outline, and read-range behavior under the existing targeted test slices?", () => {
    const safeRead = buildWorkspaceReadObservation(
      createExecution(null),
      "safe_read",
      { path: "src/app.ts" },
      { projection: "content", reason: "SAFE_READ" },
    );
    const fileOutline = buildWorkspaceReadObservation(
      createExecution("overlay-1"),
      "file_outline",
      { path: "src/app.ts" },
      { reason: "UNSUPPORTED_LANGUAGE" },
    );
    const readRange = buildWorkspaceReadObservation(
      createExecution("overlay-1"),
      "read_range",
      { path: "src/app.ts" },
      { content: "hello", startLine: 3, endLine: 5 },
    );
    const invalid = buildWorkspaceReadObservation(
      createExecution(null),
      "safe_read",
      { path: 42 },
      { projection: "content" },
    );

    expect(safeRead?.projection).toBe("content");
    expect(fileOutline).toBeNull();
    expect(readRange?.footprint.regions[0]).toEqual({
      path: "src/app.ts",
      startLine: 3,
      endLine: 5,
    });
    expect(invalid).toBeNull();
  });
});
