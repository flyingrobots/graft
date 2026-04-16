import * as path from "node:path";
import type { JsonObject } from "../contracts/json-object.js";
import type { WorkspaceExecutionContext } from "./workspace-router-model.js";
import {
  parseAttributedReadArgs,
  parseFileOutlineObservationResult,
  parseReadRangeObservationResult,
  parseSafeReadObservationResult,
} from "./workspace-read-observation-model.js";

export type AttributedReadToolName = "safe_read" | "file_outline" | "read_range";

export function buildWorkspaceReadObservation(
  execution: WorkspaceExecutionContext,
  toolName: AttributedReadToolName,
  args: JsonObject,
  result: JsonObject,
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
  const parsedArgs = parseAttributedReadArgs(args);
  if (parsedArgs === null) {
    return null;
  }

  const absolutePath = execution.resolvePath(parsedArgs.path);
  const relativePath = path.relative(execution.worktreeRoot, absolutePath);
  const footprintPath = relativePath.startsWith("..") ? absolutePath : relativePath;
  const sourceLayer = execution.repoState.getState().workspaceOverlayId === null
    ? "canonical_structural_truth"
    : "workspace_overlay";

  if (toolName === "safe_read") {
    const parsedResult = parseSafeReadObservationResult(result);
    if (parsedResult === null) {
      return null;
    }
    return {
      surface: "safe_read",
      projection: parsedResult.projection,
      sourceLayer,
      reason: parsedResult.reason ?? "SAFE_READ",
      footprint: {
        paths: [footprintPath],
        symbols: [],
        regions: [],
      },
    };
  }

  if (toolName === "file_outline") {
    const parsedResult = parseFileOutlineObservationResult(result);
    if (parsedResult === null) {
      return null;
    }
    if (typeof parsedResult.error === "string" || parsedResult.reason === "UNSUPPORTED_LANGUAGE") {
      return null;
    }
    return {
      surface: "file_outline",
      projection: "outline",
      sourceLayer,
      reason: parsedResult.reason ?? "FILE_OUTLINE",
      footprint: {
        paths: [footprintPath],
        symbols: [],
        regions: [],
      },
    };
  }

  const parsedResult = parseReadRangeObservationResult(result);
  if (parsedResult === null) {
    return null;
  }
  return {
    surface: "read_range",
    projection: "content",
    sourceLayer,
    reason: parsedResult.reason ?? "READ_RANGE",
    footprint: {
      paths: [footprintPath],
      symbols: [],
      regions: [{
        path: footprintPath,
        startLine: parsedResult.startLine,
        endLine: parsedResult.endLine,
      }],
    },
  };
}
