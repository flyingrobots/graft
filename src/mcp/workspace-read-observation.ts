import * as path from "node:path";
import type { WorkspaceExecutionContext } from "./workspace-router-model.js";

export type AttributedReadToolName = "safe_read" | "file_outline" | "read_range";

export function buildWorkspaceReadObservation(
  execution: WorkspaceExecutionContext,
  toolName: AttributedReadToolName,
  args: Record<string, unknown>,
  result: Record<string, unknown>,
): {
  readonly surface: string;
  readonly projection: string;
  readonly sourceLayer: "canonical_structural_truth" | "workspace_overlay";
  readonly reason: string;
  readonly footprint: {
    readonly paths: string[];
    readonly symbols: string[];
    readonly regions: {
      readonly path: string;
      readonly startLine: number;
      readonly endLine: number;
    }[];
  };
} | null {
  const rawPath = args["path"];
  if (typeof rawPath !== "string") {
    return null;
  }

  const absolutePath = execution.resolvePath(rawPath);
  const relativePath = path.relative(execution.worktreeRoot, absolutePath);
  const footprintPath = relativePath.startsWith("..") ? absolutePath : relativePath;
  const sourceLayer = execution.repoState.getState().workspaceOverlayId === null
    ? "canonical_structural_truth"
    : "workspace_overlay";

  if (toolName === "safe_read") {
    const projection = result["projection"];
    if (
      projection !== "content" &&
      projection !== "outline" &&
      projection !== "cache_hit" &&
      projection !== "diff"
    ) {
      return null;
    }
    return {
      surface: "safe_read",
      projection,
      sourceLayer,
      reason: typeof result["reason"] === "string" ? result["reason"] : "SAFE_READ",
      footprint: {
        paths: [footprintPath],
        symbols: [],
        regions: [],
      },
    };
  }

  if (toolName === "file_outline") {
    if (typeof result["error"] === "string" || result["reason"] === "UNSUPPORTED_LANGUAGE") {
      return null;
    }
    return {
      surface: "file_outline",
      projection: "outline",
      sourceLayer,
      reason: typeof result["reason"] === "string" ? result["reason"] : "FILE_OUTLINE",
      footprint: {
        paths: [footprintPath],
        symbols: [],
        regions: [],
      },
    };
  }

  const startLine = result["startLine"];
  const endLine = result["endLine"];
  if (
    typeof result["content"] !== "string" ||
    typeof startLine !== "number" ||
    typeof endLine !== "number"
  ) {
    return null;
  }
  return {
    surface: "read_range",
    projection: "content",
    sourceLayer,
    reason: typeof result["reason"] === "string" ? result["reason"] : "READ_RANGE",
    footprint: {
      paths: [footprintPath],
      symbols: [],
      regions: [{
        path: footprintPath,
        startLine,
        endLine,
      }],
    },
  };
}
