import { z } from "zod";
import {
  CLI_COMMAND_NAMES,
  CLI_COMMAND_TO_MCP_TOOL,
  MCP_TOOL_NAMES,
  type CliCommandName,
  type McpToolName,
} from "./capabilities.js";
import { cliOutputBodySchemas } from "./output-schema-cli.js";
import { activityViewSchema, receiptSchema, tripwireSchema } from "./output-schema-fragments.js";
import {
  OUTPUT_SCHEMA_VERSION,
  type CliPeerCommandName,
  type OutputSchemaMeta,
  cliOutputSchemaMeta,
  mcpOutputSchemaMeta,
  schemaMetaLiteral,
  withCliCommon,
  withCliPeerCommon,
  withMcpCommon,
} from "./output-schema-meta.js";
import { mcpOutputBodySchemas } from "./output-schema-mcp.js";

export { CLI_COMMAND_NAMES, MCP_TOOL_NAMES, OUTPUT_SCHEMA_VERSION };
export type {
  CliPeerCommandName,
  OutputSchemaMeta,
} from "./output-schema-meta.js";
export type { CliCommandName, McpToolName } from "./capabilities.js";

export const MCP_OUTPUT_SCHEMAS = {
  safe_read: withMcpCommon("safe_read", mcpOutputBodySchemas.safe_read, receiptSchema, tripwireSchema),
  file_outline: withMcpCommon("file_outline", mcpOutputBodySchemas.file_outline, receiptSchema, tripwireSchema),
  read_range: withMcpCommon("read_range", mcpOutputBodySchemas.read_range, receiptSchema, tripwireSchema),
  changed_since: withMcpCommon("changed_since", mcpOutputBodySchemas.changed_since, receiptSchema, tripwireSchema),
  graft_diff: withMcpCommon("graft_diff", mcpOutputBodySchemas.graft_diff, receiptSchema, tripwireSchema),
  graft_since: withMcpCommon("graft_since", mcpOutputBodySchemas.graft_since, receiptSchema, tripwireSchema),
  graft_map: withMcpCommon("graft_map", mcpOutputBodySchemas.graft_map, receiptSchema, tripwireSchema),
  code_show: withMcpCommon("code_show", mcpOutputBodySchemas.code_show, receiptSchema, tripwireSchema),
  code_find: withMcpCommon("code_find", mcpOutputBodySchemas.code_find, receiptSchema, tripwireSchema),
  code_refs: withMcpCommon("code_refs", mcpOutputBodySchemas.code_refs, receiptSchema, tripwireSchema),
  daemon_repos: withMcpCommon("daemon_repos", mcpOutputBodySchemas.daemon_repos, receiptSchema, tripwireSchema),
  daemon_status: withMcpCommon("daemon_status", mcpOutputBodySchemas.daemon_status, receiptSchema, tripwireSchema),
  daemon_sessions: withMcpCommon("daemon_sessions", mcpOutputBodySchemas.daemon_sessions, receiptSchema, tripwireSchema),
  daemon_monitors: withMcpCommon("daemon_monitors", mcpOutputBodySchemas.daemon_monitors, receiptSchema, tripwireSchema),
  monitor_start: withMcpCommon("monitor_start", mcpOutputBodySchemas.monitor_start, receiptSchema, tripwireSchema),
  monitor_pause: withMcpCommon("monitor_pause", mcpOutputBodySchemas.monitor_pause, receiptSchema, tripwireSchema),
  monitor_resume: withMcpCommon("monitor_resume", mcpOutputBodySchemas.monitor_resume, receiptSchema, tripwireSchema),
  monitor_stop: withMcpCommon("monitor_stop", mcpOutputBodySchemas.monitor_stop, receiptSchema, tripwireSchema),
  workspace_authorize: withMcpCommon("workspace_authorize", mcpOutputBodySchemas.workspace_authorize, receiptSchema, tripwireSchema),
  workspace_authorizations: withMcpCommon(
    "workspace_authorizations",
    mcpOutputBodySchemas.workspace_authorizations,
    receiptSchema,
    tripwireSchema,
  ),
  workspace_revoke: withMcpCommon("workspace_revoke", mcpOutputBodySchemas.workspace_revoke, receiptSchema, tripwireSchema),
  workspace_bind: withMcpCommon("workspace_bind", mcpOutputBodySchemas.workspace_bind, receiptSchema, tripwireSchema),
  workspace_status: withMcpCommon("workspace_status", mcpOutputBodySchemas.workspace_status, receiptSchema, tripwireSchema),
  activity_view: withMcpCommon("activity_view", mcpOutputBodySchemas.activity_view, receiptSchema, tripwireSchema),
  causal_status: withMcpCommon("causal_status", mcpOutputBodySchemas.causal_status, receiptSchema, tripwireSchema),
  causal_attach: withMcpCommon("causal_attach", mcpOutputBodySchemas.causal_attach, receiptSchema, tripwireSchema),
  workspace_rebind: withMcpCommon("workspace_rebind", mcpOutputBodySchemas.workspace_rebind, receiptSchema, tripwireSchema),
  run_capture: withMcpCommon("run_capture", mcpOutputBodySchemas.run_capture, receiptSchema, tripwireSchema),
  state_save: withMcpCommon("state_save", mcpOutputBodySchemas.state_save, receiptSchema, tripwireSchema),
  state_load: withMcpCommon("state_load", mcpOutputBodySchemas.state_load, receiptSchema, tripwireSchema),
  set_budget: withMcpCommon("set_budget", mcpOutputBodySchemas.set_budget, receiptSchema, tripwireSchema),
  explain: withMcpCommon("explain", mcpOutputBodySchemas.explain, receiptSchema, tripwireSchema),
  doctor: withMcpCommon("doctor", mcpOutputBodySchemas.doctor, receiptSchema, tripwireSchema),
  stats: withMcpCommon("stats", mcpOutputBodySchemas.stats, receiptSchema, tripwireSchema),
} satisfies Record<McpToolName, z.ZodType>;

export const DIAG_ACTIVITY_CLI_SCHEMA = activityViewSchema.extend({
  _schema: schemaMetaLiteral(cliOutputSchemaMeta.diag_activity),
  _receipt: receiptSchema,
  tripwire: z.array(tripwireSchema).optional(),
}).strict();

export const CLI_OUTPUT_SCHEMAS = {
  init: withCliCommon("init", cliOutputBodySchemas.init),
  index: withCliCommon("index", cliOutputBodySchemas.index),
  migrate_local_history: withCliCommon("migrate_local_history", cliOutputBodySchemas.migrate_local_history),
  read_safe: withCliPeerCommon("read_safe", cliOutputBodySchemas.read_safe, receiptSchema, tripwireSchema),
  read_outline: withCliPeerCommon("read_outline", cliOutputBodySchemas.read_outline, receiptSchema, tripwireSchema),
  read_range: withCliPeerCommon("read_range", cliOutputBodySchemas.read_range, receiptSchema, tripwireSchema),
  read_changed: withCliPeerCommon("read_changed", cliOutputBodySchemas.read_changed, receiptSchema, tripwireSchema),
  struct_diff: withCliPeerCommon("struct_diff", cliOutputBodySchemas.struct_diff, receiptSchema, tripwireSchema),
  struct_since: withCliPeerCommon("struct_since", cliOutputBodySchemas.struct_since, receiptSchema, tripwireSchema),
  struct_map: withCliPeerCommon("struct_map", cliOutputBodySchemas.struct_map, receiptSchema, tripwireSchema),
  symbol_show: withCliPeerCommon("symbol_show", cliOutputBodySchemas.symbol_show, receiptSchema, tripwireSchema),
  symbol_find: withCliPeerCommon("symbol_find", cliOutputBodySchemas.symbol_find, receiptSchema, tripwireSchema),
  diag_doctor: withCliPeerCommon("diag_doctor", cliOutputBodySchemas.diag_doctor, receiptSchema, tripwireSchema),
  diag_activity: DIAG_ACTIVITY_CLI_SCHEMA,
  diag_local_history_dag: withCliCommon("diag_local_history_dag", cliOutputBodySchemas.diag_local_history_dag),
  diag_explain: withCliPeerCommon("diag_explain", cliOutputBodySchemas.diag_explain, receiptSchema, tripwireSchema),
  diag_stats: withCliPeerCommon("diag_stats", cliOutputBodySchemas.diag_stats, receiptSchema, tripwireSchema),
  diag_capture: withCliPeerCommon("diag_capture", cliOutputBodySchemas.diag_capture, receiptSchema, tripwireSchema),
} satisfies Record<CliCommandName, z.ZodType>;

export function getMcpOutputSchemaMeta(tool: McpToolName): OutputSchemaMeta {
  return mcpOutputSchemaMeta[tool];
}

export function getCliOutputSchemaMeta(command: CliCommandName): OutputSchemaMeta {
  return cliOutputSchemaMeta[command];
}

export function getMcpOutputSchema(tool: McpToolName): z.ZodType {
  return MCP_OUTPUT_SCHEMAS[tool];
}

export function getCliOutputSchema(command: CliCommandName): z.ZodType {
  return CLI_OUTPUT_SCHEMAS[command];
}

interface McpCommonFields {
  readonly _schema: OutputSchemaMeta;
  readonly _receipt: z.infer<typeof receiptSchema>;
  readonly tripwire?: readonly z.infer<typeof tripwireSchema>[] | undefined;
}

interface CliCommonFields {
  readonly _schema: OutputSchemaMeta;
}

interface CliPeerCommonFields extends CliCommonFields {
  readonly _receipt: z.infer<typeof receiptSchema>;
  readonly tripwire?: readonly z.infer<typeof tripwireSchema>[] | undefined;
}

export type McpOutputMap = {
  [K in McpToolName]: z.infer<(typeof mcpOutputBodySchemas)[K]> & McpCommonFields;
};

export type McpOutputFor<K extends McpToolName> = McpOutputMap[K];

export type CliOutputMap = {
  [K in CliCommandName]: z.infer<(typeof cliOutputBodySchemas)[K]> & (
    K extends CliPeerCommandName ? CliPeerCommonFields : CliCommonFields
  );
};

export type CliOutputFor<K extends CliCommandName> = CliOutputMap[K];

export function attachMcpSchemaMeta<T extends object>(
  tool: McpToolName,
  data: T,
): T & { _schema: OutputSchemaMeta } {
  return { ...data, _schema: getMcpOutputSchemaMeta(tool) };
}

export function attachCliSchemaMeta<T extends object>(
  command: CliCommandName,
  data: T,
): T & { _schema: OutputSchemaMeta } {
  return { ...data, _schema: getCliOutputSchemaMeta(command) };
}

export function validateCliOutput<K extends CliCommandName>(
  command: K,
  data: unknown,
): CliOutputFor<K> {
  return CLI_OUTPUT_SCHEMAS[command].parse(data) as CliOutputFor<K>;
}

export function cliCommandMcpTool(command: CliCommandName): McpToolName | null {
  return CLI_COMMAND_TO_MCP_TOOL[command] ?? null;
}

export function getMcpOutputJsonSchema(tool: McpToolName): unknown {
  return z.toJSONSchema(MCP_OUTPUT_SCHEMAS[tool]);
}

export function getCliOutputJsonSchema(command: CliCommandName): unknown {
  return z.toJSONSchema(CLI_OUTPUT_SCHEMAS[command]);
}

export const RECEIPT_SCHEMA = receiptSchema;
export const RECEIPT_JSON_SCHEMA = z.toJSONSchema(receiptSchema);
