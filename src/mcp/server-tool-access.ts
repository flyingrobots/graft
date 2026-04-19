import type { McpToolResult } from "./receipt.js";
import type { JsonObject } from "../contracts/json-object.js";
import { parseJsonTextObject } from "../adapters/json-text-decoder.js";
import { evaluateMcpPolicy } from "./policy.js";
import { RefusedResult } from "../policy/types.js";
import { OFFLOADED_DAEMON_REPO_TOOL_NAMES, type OffloadedRepoToolName } from "./repo-tool-job.js";
import {
  WorkspaceBindingRequiredError,
  WorkspaceCapabilityDeniedError,
  type WorkspaceStatus,
} from "./workspace-router.js";
import type { ToolContext, ToolDefinition, ToolHandler } from "./context.js";

const daemonAlwaysAvailableTools = new Set<string>([
  "daemon_repos",
  "daemon_status",
  "daemon_sessions",
  "daemon_monitors",
  "monitor_start",
  "monitor_pause",
  "monitor_resume",
  "monitor_stop",
  "workspace_authorize",
  "workspace_authorizations",
  "workspace_revoke",
  "workspace_bind",
  "workspace_status",
  "causal_status",
  "workspace_rebind",
  "explain",
]);

export const repoStateOptionalTools = new Set<string>([
  "daemon_repos",
  "daemon_status",
  "daemon_sessions",
  "daemon_monitors",
  "monitor_start",
  "monitor_pause",
  "monitor_resume",
  "monitor_stop",
  "workspace_authorize",
  "workspace_authorizations",
  "workspace_revoke",
  "workspace_bind",
  "workspace_status",
  "workspace_rebind",
  "explain",
]);

export const daemonScheduledRepoTools = new Set<string>([
  "safe_read",
  "file_outline",
  "changed_since",
  "graft_diff",
  "graft_since",
  "graft_map",
  "code_show",
  "code_find",
  "code_refs",
]);

export const attributedReadTools = new Set<string>([
  "safe_read",
  "file_outline",
  "read_range",
]);

function isOffloadedRepoTool(name: string): name is OffloadedRepoToolName {
  return OFFLOADED_DAEMON_REPO_TOOL_NAMES.includes(name as OffloadedRepoToolName);
}

export function enforceDaemonToolAccess(input: {
  readonly mode: "repo_local" | "daemon";
  readonly name: string;
  readonly isBound: boolean;
  readonly status: WorkspaceStatus;
}): void {
  if (input.mode !== "daemon") return;
  if (daemonAlwaysAvailableTools.has(input.name)) {
    return;
  }
  if (!input.isBound) {
    throw new WorkspaceBindingRequiredError(input.name);
  }
  if (input.name === "run_capture" && input.status.capabilityProfile?.runCapture !== true) {
    throw new WorkspaceCapabilityDeniedError(input.name);
  }
}

export function resolveDaemonOffloadedRepoTool(
  name: string,
  parsed: JsonObject,
  dirty: boolean,
): OffloadedRepoToolName | null {
  if (name === "code_find") {
    return dirty ? "code_find_live" : null;
  }
  if (name === "code_show") {
    return parsed["ref"] === undefined ? "code_show_live" : null;
  }
  return isOffloadedRepoTool(name) ? name : null;
}

export function parseToolPayload(result: McpToolResult): JsonObject | null {
  const textBlock = result.content.find((entry) => entry.type === "text");
  if (textBlock === undefined) {
    return null;
  }
  try {
    return parseJsonTextObject(textBlock.text, "MCP tool result");
  } catch {
    return null;
  }
}

export function wrapWithPolicyCheck(
  toolName: ToolDefinition["name"],
  inner: ToolHandler,
): ToolHandler {
  return async (args: JsonObject, ctx: ToolContext) => {
    const rawPath = args["path"] as string | undefined;
    if (rawPath === undefined) return inner(args, ctx);
    const filePath = ctx.resolvePath(rawPath);
    let content: string;
    try {
      content = await ctx.fs.readFile(filePath, "utf-8");
    } catch {
      return inner(args, ctx);
    }
    const actual = { lines: content.split("\n").length, bytes: Buffer.byteLength(content) };
    const policy = evaluateMcpPolicy(ctx, filePath, actual);
    if (policy instanceof RefusedResult) {
      ctx.metrics.recordRefusal();
      return ctx.respond(toolName, {
        path: filePath,
        projection: "refused",
        reason: policy.reason,
        reasonDetail: policy.reasonDetail,
        next: [...policy.next],
        actual,
      });
    }
    return inner(args, ctx);
  };
}
