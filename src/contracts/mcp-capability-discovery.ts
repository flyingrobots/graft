import { z } from "zod";

import {
  CAPABILITY_REGISTRY,
  MCP_TOOL_NAMES,
} from "./capabilities.js";
import type { McpToolName } from "./capabilities.js";

/** Fixed conceptual order for the bounded MCP capability map. */
export const MCP_CAPABILITY_FAMILIES = [
  "session",
  "workspace",
  "read",
  "code",
  "history",
  "review",
  "diagnostic",
] as const;

export type McpCapabilityFamily = typeof MCP_CAPABILITY_FAMILIES[number];
export type McpCapabilitySessionMode = "repo_local" | "daemon";

export const MCP_CAPABILITY_DISCOVERY_BASIS = "registered_surface" as const;
export const MCP_CAPABILITY_SUMMARY_REASON = "CAPABILITY_SUMMARY" as const;
export const MCP_CAPABILITY_FAMILY_DETAIL_REASON = "CAPABILITY_FAMILY_DETAIL" as const;
export const MCP_CAPABILITY_SUMMARY_MAX_BYTES = 2_048;
export const MCP_CAPABILITY_FAMILY_DETAIL_MAX_BYTES = 4_096;

/** Tools registered only by the daemon control plane. */
export const MCP_DAEMON_ONLY_TOOLS = [
  "daemon_repos",
  "daemon_status",
  "daemon_sessions",
  "daemon_monitors",
  "monitor_start",
  "monitor_pause",
  "monitor_resume",
  "monitor_nudge",
  "monitor_stop",
  "workspace_authorize",
  "workspace_authorizations",
  "workspace_revoke",
  "workspace_bind",
  "workspace_rebind",
] as const satisfies readonly McpToolName[];

interface McpCapabilityFamilyDefinition {
  readonly family: McpCapabilityFamily;
  readonly openingCall: McpToolName;
  readonly guidance: string;
  readonly tools: readonly McpToolName[];
}

/**
 * Explicit product taxonomy for registered MCP tools.
 *
 * The runtime registries remain authoritative for registration. Contract tests
 * compare this taxonomy with those registries so a tool cannot silently become
 * undiscoverable or appear in more than one family.
 */
export const MCP_CAPABILITY_FAMILY_DEFINITIONS = [
  {
    family: "session",
    openingCall: "capabilities",
    guidance: "Choose one bounded workflow family, then request only that family's detail.",
    tools: [
      "capabilities",
      "state_save",
      "state_load",
      "set_budget",
      "knowledge_map",
    ],
  },
  {
    family: "workspace",
    openingCall: "workspace_status",
    guidance: "Inspect workspace and binding posture before routed or daemon work.",
    tools: [
      "daemon_repos",
      "daemon_status",
      "daemon_sessions",
      "daemon_monitors",
      "monitor_start",
      "monitor_pause",
      "monitor_resume",
      "monitor_nudge",
      "monitor_stop",
      "workspace_authorize",
      "workspace_authorizations",
      "workspace_revoke",
      "workspace_open",
      "workspace_list_opened",
      "workspace_bind",
      "workspace_status",
      "workspace_rebind",
      "causal_attach",
    ],
  },
  {
    family: "read",
    openingCall: "safe_read",
    guidance: "Start with a policy-bounded read and drill into ranges only when needed.",
    tools: [
      "safe_read",
      "file_outline",
      "read_range",
      "changed_since",
    ],
  },
  {
    family: "code",
    openingCall: "code_find",
    guidance: "Locate a symbol, then focus or inspect references before editing.",
    tools: [
      "graft_edit",
      "code_show",
      "code_find",
      "code_refs",
    ],
  },
  {
    family: "history",
    openingCall: "graft_since",
    guidance: "Start from a named base, then deepen with diff, log, blame, or difficulty.",
    tools: [
      "graft_diff",
      "graft_since",
      "graft_map",
      "graft_churn",
      "graft_exports",
      "graft_log",
      "graft_blame",
      "graft_difficulty",
    ],
  },
  {
    family: "review",
    openingCall: "graft_review",
    guidance: "Review a bounded ref range before focused coverage or dead-symbol checks.",
    tools: [
      "graft_review",
      "graft_test_coverage",
      "graft_dead_symbols",
    ],
  },
  {
    family: "diagnostic",
    openingCall: "doctor",
    guidance: "Start with summary health and request full detail only to investigate.",
    tools: [
      "activity_view",
      "causal_status",
      "run_capture",
      "explain",
      "doctor",
      "stats",
    ],
  },
] as const satisfies readonly McpCapabilityFamilyDefinition[];

export const mcpCapabilityFamilySchema = z.enum(MCP_CAPABILITY_FAMILIES);

const mcpCapabilitySessionModeSchema = z.enum(["repo_local", "daemon"]);

const mcpCapabilityFamilySummarySchema = z.object({
  family: mcpCapabilityFamilySchema,
  openingCall: z.enum(MCP_TOOL_NAMES),
  guidance: z.string().min(1),
  toolCount: z.number().int().nonnegative(),
}).strict();

const mcpCapabilityToolSchema = z.object({
  name: z.enum(MCP_TOOL_NAMES),
  description: z.string().min(1),
}).strict();

export const mcpCapabilitySummaryBodySchema = z.object({
  projection: z.literal("summary"),
  reason: z.literal(MCP_CAPABILITY_SUMMARY_REASON),
  discoveryBasis: z.literal(MCP_CAPABILITY_DISCOVERY_BASIS),
  sessionMode: mcpCapabilitySessionModeSchema,
  registeredToolCount: z.number().int().nonnegative(),
  families: z.array(mcpCapabilityFamilySummarySchema).length(MCP_CAPABILITY_FAMILIES.length),
}).strict();

export const mcpCapabilityFamilyDetailBodySchema = z.object({
  projection: z.literal("family_detail"),
  reason: z.literal(MCP_CAPABILITY_FAMILY_DETAIL_REASON),
  discoveryBasis: z.literal(MCP_CAPABILITY_DISCOVERY_BASIS),
  sessionMode: mcpCapabilitySessionModeSchema,
  registeredToolCount: z.number().int().nonnegative(),
  family: mcpCapabilityFamilySchema,
  openingCall: z.enum(MCP_TOOL_NAMES),
  guidance: z.string().min(1),
  toolCount: z.number().int().nonnegative(),
  tools: z.array(mcpCapabilityToolSchema),
}).strict();

/** Shared strict body contract for both MCP output-schema registries. */
export const mcpCapabilityDiscoveryBodySchema = z.discriminatedUnion("projection", [
  mcpCapabilitySummaryBodySchema,
  mcpCapabilityFamilyDetailBodySchema,
]);

export type McpCapabilitySummaryBody = z.infer<typeof mcpCapabilitySummaryBodySchema>;
export type McpCapabilityFamilyDetailBody = z.infer<typeof mcpCapabilityFamilyDetailBodySchema>;
export type McpCapabilityDiscoveryBody = z.infer<typeof mcpCapabilityDiscoveryBodySchema>;

export interface BuildMcpCapabilityDiscoveryInput {
  readonly sessionMode: McpCapabilitySessionMode;
  readonly family?: McpCapabilityFamily | undefined;
}

function compareCodePoints(left: string, right: string): number {
  const leftPoints = Array.from(left, (value) => value.codePointAt(0) ?? 0);
  const rightPoints = Array.from(right, (value) => value.codePointAt(0) ?? 0);
  const commonLength = Math.min(leftPoints.length, rightPoints.length);

  for (let index = 0; index < commonLength; index += 1) {
    const difference = (leftPoints[index] ?? 0) - (rightPoints[index] ?? 0);
    if (difference !== 0) return difference;
  }

  return leftPoints.length - rightPoints.length;
}

const daemonOnlyToolSet = new Set<McpToolName>(MCP_DAEMON_ONLY_TOOLS);

function isRegisteredInMode(tool: McpToolName, sessionMode: McpCapabilitySessionMode): boolean {
  return sessionMode === "daemon" || !daemonOnlyToolSet.has(tool);
}

function registeredTools(
  definition: McpCapabilityFamilyDefinition,
  sessionMode: McpCapabilitySessionMode,
): readonly McpToolName[] {
  return definition.tools.filter((tool) => isRegisteredInMode(tool, sessionMode));
}

function orderedTools(
  definition: McpCapabilityFamilyDefinition,
  sessionMode: McpCapabilitySessionMode,
): readonly McpToolName[] {
  const available = registeredTools(definition, sessionMode);
  if (!available.includes(definition.openingCall)) {
    throw new Error(
      `Capability-family opening call ${definition.openingCall} is not registered in ${sessionMode} mode.`,
    );
  }
  const remainder = available
    .filter((tool) => tool !== definition.openingCall)
    .sort(compareCodePoints);
  return [definition.openingCall, ...remainder];
}

function descriptionFor(tool: McpToolName): string {
  const matches = CAPABILITY_REGISTRY.filter((capability) => capability.mcpTool === tool);
  const [match] = matches;
  if (matches.length !== 1 || match === undefined) {
    throw new Error(`Expected exactly one capability-registry description for MCP tool ${tool}.`);
  }
  return match.description;
}

function registeredToolCount(sessionMode: McpCapabilitySessionMode): number {
  return MCP_CAPABILITY_FAMILY_DEFINITIONS.reduce(
    (count, definition) => count + registeredTools(definition, sessionMode).length,
    0,
  );
}

/** Build the bounded summary or one explicitly selected family detail. */
export function buildMcpCapabilityDiscovery(
  input: BuildMcpCapabilityDiscoveryInput,
): McpCapabilityDiscoveryBody {
  const total = registeredToolCount(input.sessionMode);

  if (input.family === undefined) {
    return {
      projection: "summary",
      reason: MCP_CAPABILITY_SUMMARY_REASON,
      discoveryBasis: MCP_CAPABILITY_DISCOVERY_BASIS,
      sessionMode: input.sessionMode,
      registeredToolCount: total,
      families: MCP_CAPABILITY_FAMILY_DEFINITIONS.map((definition) => ({
        family: definition.family,
        openingCall: definition.openingCall,
        guidance: definition.guidance,
        toolCount: registeredTools(definition, input.sessionMode).length,
      })),
    };
  }

  const definition = MCP_CAPABILITY_FAMILY_DEFINITIONS.find(
    (candidate) => candidate.family === input.family,
  );
  if (definition === undefined) {
    throw new Error(`Unknown MCP capability family: ${input.family}`);
  }
  const tools = orderedTools(definition, input.sessionMode);

  return {
    projection: "family_detail",
    reason: MCP_CAPABILITY_FAMILY_DETAIL_REASON,
    discoveryBasis: MCP_CAPABILITY_DISCOVERY_BASIS,
    sessionMode: input.sessionMode,
    registeredToolCount: total,
    family: definition.family,
    openingCall: definition.openingCall,
    guidance: definition.guidance,
    toolCount: tools.length,
    tools: tools.map((name) => ({
      name,
      description: descriptionFor(name),
    })),
  };
}
