import { z } from "zod";
import {
  CLI_COMMAND_NAMES,
  type CliCommandName,
  CLI_COMMAND_TO_MCP_TOOL,
  MCP_TOOL_NAMES,
  type McpToolName,
} from "./capabilities.js";

export { CLI_COMMAND_NAMES, MCP_TOOL_NAMES };
export type { CliCommandName, McpToolName } from "./capabilities.js";

export const OUTPUT_SCHEMA_VERSION = "1.0.0" as const;

export interface OutputSchemaMeta {
  readonly id: string;
  readonly version: typeof OUTPUT_SCHEMA_VERSION;
}

const mcpOutputSchemaMeta = Object.freeze(Object.fromEntries(
  MCP_TOOL_NAMES.map((tool) => [tool, Object.freeze({
    id: `graft.mcp.${tool}`,
    version: OUTPUT_SCHEMA_VERSION,
  })]),
) as Record<McpToolName, OutputSchemaMeta>);

const cliOutputSchemaMeta = Object.freeze(Object.fromEntries(
  CLI_COMMAND_NAMES.map((command) => [command, Object.freeze({
    id: `graft.cli.${command}`,
    version: OUTPUT_SCHEMA_VERSION,
  })]),
) as Record<CliCommandName, OutputSchemaMeta>);

function schemaMetaLiteral(meta: OutputSchemaMeta) {
  return z.object({
    id: z.literal(meta.id),
    version: z.literal(meta.version),
  }).strict();
}

const sessionDepthSchema = z.enum(["early", "mid", "late", "unknown"]);
const worldlineLayerSchema = z.enum(["commit_worldline", "ref_view", "workspace_overlay"]);
const repoTransitionKindSchema = z.enum(["checkout", "reset", "merge", "rebase"]);

const actualSchema = z.object({
  lines: z.number().int().nonnegative(),
  bytes: z.number().int().nonnegative(),
}).strict();

const thresholdsSchema = z.object({
  lines: z.number().int().nonnegative(),
  bytes: z.number().int().nonnegative(),
}).strict();

const budgetSchema = z.object({
  total: z.number().int().positive(),
  consumed: z.number().int().nonnegative(),
  remaining: z.number().int().nonnegative(),
  fraction: z.number(),
}).strict();

const tripwireSchema = z.object({
  _brand: z.literal("Tripwire").optional(),
  signal: z.string(),
  recommendation: z.string(),
}).strict();

const outlineEntrySchema: z.ZodType = z.lazy(() => z.object({
  _brand: z.literal("OutlineEntry").optional(),
  kind: z.string(),
  name: z.string(),
  signature: z.string().optional(),
  exported: z.boolean(),
  children: z.array(outlineEntrySchema).optional(),
}).strict());

const jumpEntrySchema = z.object({
  _brand: z.literal("JumpEntry").optional(),
  symbol: z.string(),
  kind: z.string(),
  start: z.number().int().positive(),
  end: z.number().int().positive(),
}).strict();

const outlineDiffSchema: z.ZodType = z.lazy(() => z.object({
  _brand: z.literal("OutlineDiff").optional(),
  added: z.array(diffEntrySchema),
  removed: z.array(diffEntrySchema),
  changed: z.array(diffEntrySchema),
  unchangedCount: z.number().int().nonnegative(),
}).strict());

const diffEntrySchema: z.ZodType = z.lazy(() => z.object({
  _brand: z.literal("DiffEntry").optional(),
  name: z.string(),
  kind: z.string(),
  signature: z.string().optional(),
  oldSignature: z.string().optional(),
  childDiff: outlineDiffSchema.optional(),
}).strict());

const burdenKindSchema = z.enum(["read", "search", "shell", "state", "diagnostic"]);

const burdenBucketSchema = z.object({
  calls: z.number().int().nonnegative(),
  bytesReturned: z.number().int().nonnegative(),
}).strict();

const burdenByKindSchema = z.object({
  read: burdenBucketSchema,
  search: burdenBucketSchema,
  shell: burdenBucketSchema,
  state: burdenBucketSchema,
  diagnostic: burdenBucketSchema,
}).strict();

const receiptSchema = z.object({
  sessionId: z.string(),
  traceId: z.string(),
  seq: z.number().int().positive(),
  ts: z.string(),
  tool: z.string(),
  projection: z.string(),
  reason: z.string(),
  latencyMs: z.number().int().nonnegative(),
  fileBytes: z.number().int().nonnegative().nullable(),
  returnedBytes: z.number().int().nonnegative(),
  burden: z.object({
    kind: burdenKindSchema,
    nonRead: z.boolean(),
  }).strict(),
  cumulative: z.object({
    reads: z.number().int().nonnegative(),
    outlines: z.number().int().nonnegative(),
    refusals: z.number().int().nonnegative(),
    cacheHits: z.number().int().nonnegative(),
    bytesReturned: z.number().int().nonnegative(),
    bytesAvoided: z.number().int().nonnegative(),
    nonReadBytesReturned: z.number().int().nonnegative(),
    burdenByKind: burdenByKindSchema,
  }).strict(),
  budget: budgetSchema.optional(),
  compressionRatio: z.number().nullable().optional(),
}).strict();

const runtimeObservabilitySchema = z.object({
  enabled: z.boolean(),
  logPath: z.string(),
  maxBytes: z.number().int().positive(),
  logPolicy: z.literal("metadata_only"),
}).strict();

const precisionSymbolMatchSchema = z.object({
  name: z.string(),
  kind: z.string(),
  path: z.string(),
  signature: z.string().optional(),
  exported: z.boolean(),
  startLine: z.number().int().positive().optional(),
  endLine: z.number().int().positive().optional(),
}).strict();

const codeRefsMatchSchema = z.object({
  path: z.string(),
  line: z.number().int().positive(),
  column: z.number().int().positive().optional(),
  preview: z.string(),
}).strict();

const codeRefsProvenanceSchema = z.object({
  engine: z.enum(["ripgrep", "grep"]),
  pattern: z.string(),
  approximate: z.literal(true),
  filesSearched: z.number().int().nonnegative(),
}).strict();

const structuralRefusalSchema = z.object({
  path: z.string(),
  reason: z.string(),
  reasonDetail: z.string(),
  next: z.array(z.string()),
  actual: actualSchema,
}).strict();

const mapFileSchema = z.object({
  path: z.string(),
  lang: z.string(),
  symbols: z.array(z.object({
    name: z.string(),
    kind: z.string(),
    signature: z.string().optional(),
    exported: z.boolean(),
    startLine: z.number().int().positive().optional(),
    endLine: z.number().int().positive().optional(),
  }).strict()),
}).strict();

const fileDiffSchema = z.object({
  path: z.string(),
  status: z.enum(["modified", "added", "deleted"]),
  summary: z.string(),
  diff: outlineDiffSchema,
}).strict();

const repoTransitionSchema = z.object({
  kind: repoTransitionKindSchema,
  fromRef: z.string().nullable(),
  toRef: z.string().nullable(),
  fromCommit: z.string().nullable(),
  toCommit: z.string().nullable(),
  evidence: z.object({
    reflogSubject: z.string().nullable(),
  }).strict(),
}).strict();

const workspaceOverlaySummarySchema = z.object({
  dirty: z.literal(true),
  totalPaths: z.number().int().nonnegative(),
  stagedPaths: z.number().int().nonnegative(),
  changedPaths: z.number().int().nonnegative(),
  untrackedPaths: z.number().int().nonnegative(),
  actorGuess: z.literal("unknown"),
  confidence: z.literal("low"),
  evidence: z.object({
    source: z.literal("git status --porcelain"),
    reflogSubject: z.string().nullable(),
    sample: z.array(z.string()),
  }).strict(),
}).strict();

const policyBoundarySchema = z.object({
  kind: z.literal("shell_escape_hatch"),
  boundedReadContract: z.literal(false),
  policyEnforced: z.literal(false),
}).strict();

const burdenSummarySchema = z.object({
  totalBytesReturned: z.number().int().nonnegative(),
  totalNonReadBytesReturned: z.number().int().nonnegative(),
  topKind: burdenKindSchema.nullable(),
  topBytesReturned: z.number().int().nonnegative(),
  topCalls: z.number().int().nonnegative(),
}).strict();

const workspaceCapabilityProfileSchema = z.object({
  boundedReads: z.boolean(),
  structuralTools: z.boolean(),
  precisionTools: z.boolean(),
  stateBookmarks: z.boolean(),
  runtimeLogs: z.literal("session_local_only"),
  runCapture: z.boolean(),
}).strict();

const workspaceStatusSchema = z.object({
  sessionMode: z.enum(["repo_local", "daemon"]),
  bindState: z.enum(["bound", "unbound"]),
  repoId: z.string().nullable(),
  worktreeId: z.string().nullable(),
  worktreeRoot: z.string().nullable(),
  gitCommonDir: z.string().nullable(),
  graftDir: z.string().nullable(),
  capabilityProfile: workspaceCapabilityProfileSchema.nullable(),
}).strict();

const workspaceActionSchema = workspaceStatusSchema.extend({
  ok: z.boolean(),
  action: z.enum(["bind", "rebind"]),
  freshSessionSlice: z.boolean(),
  errorCode: z.string().optional(),
  error: z.string().optional(),
}).strict();

const authorizedWorkspaceSchema = z.object({
  repoId: z.string(),
  worktreeId: z.string(),
  worktreeRoot: z.string(),
  gitCommonDir: z.string(),
  capabilityProfile: workspaceCapabilityProfileSchema,
  authorizedAt: z.string(),
  lastBoundAt: z.string().nullable(),
  activeSessions: z.number().int().nonnegative(),
}).strict();

const workspaceAuthorizeSchema = z.object({
  ok: z.boolean(),
  changed: z.boolean(),
  authorization: authorizedWorkspaceSchema.optional(),
  errorCode: z.string().optional(),
  error: z.string().optional(),
}).strict();

const workspaceRevokeSchema = z.object({
  ok: z.boolean(),
  revoked: z.boolean(),
  repoId: z.string().nullable().optional(),
  worktreeId: z.string().nullable().optional(),
  worktreeRoot: z.string().nullable().optional(),
  activeSessions: z.number().int().nonnegative().optional(),
  errorCode: z.string().optional(),
  error: z.string().optional(),
}).strict();

const daemonSessionSchema = z.object({
  sessionId: z.string(),
  sessionMode: z.literal("daemon"),
  bindState: z.enum(["bound", "unbound"]),
  repoId: z.string().nullable(),
  worktreeId: z.string().nullable(),
  worktreeRoot: z.string().nullable(),
  capabilityProfile: workspaceCapabilityProfileSchema.nullable(),
  startedAt: z.string(),
  lastActivityAt: z.string(),
}).strict();

const daemonStatusSchema = z.object({
  ok: z.literal(true),
  sessionMode: z.literal("daemon"),
  transport: z.enum(["unix_socket", "named_pipe"]),
  sameUserOnly: z.literal(true),
  socketPath: z.string(),
  mcpPath: z.string(),
  healthPath: z.string(),
  activeSessions: z.number().int().nonnegative(),
  boundSessions: z.number().int().nonnegative(),
  unboundSessions: z.number().int().nonnegative(),
  activeWarpRepos: z.number().int().nonnegative(),
  authorizedWorkspaces: z.number().int().nonnegative(),
  authorizedRepos: z.number().int().nonnegative(),
  workspaceBindRequiresAuthorization: z.literal(true),
  defaultCapabilityProfile: workspaceCapabilityProfileSchema,
  startedAt: z.string(),
}).strict();

function extendWithCommonFields(
  schema: z.ZodType,
  common: z.ZodRawShape,
): z.ZodType {
  if (schema instanceof z.ZodObject) {
    return schema.extend(common).strict();
  }
  if (schema instanceof z.ZodUnion) {
    return z.union(schema.options.map((option) => {
      if (!(option instanceof z.ZodObject)) {
        throw new Error("Output schema unions must be composed of objects");
      }
      return option.extend(common).strict();
    }) as [z.ZodObject, z.ZodObject, ...z.ZodObject[]]);
  }
  throw new Error("Output schemas must be objects or unions of objects");
}

function withMcpCommon(
  tool: McpToolName,
  schema: z.ZodType,
): z.ZodType {
  return extendWithCommonFields(schema, {
    _schema: schemaMetaLiteral(mcpOutputSchemaMeta[tool]),
    _receipt: receiptSchema,
    tripwire: z.array(tripwireSchema).optional(),
  });
}

function withCliCommon(
  command: CliCommandName,
  schema: z.ZodType,
): z.ZodType {
  return extendWithCommonFields(schema, {
    _schema: schemaMetaLiteral(cliOutputSchemaMeta[command]),
  });
}

function withCliPeerCommon(
  command: CliCommandName,
  schema: z.ZodType,
): z.ZodType {
  return extendWithCommonFields(schema, {
    _schema: schemaMetaLiteral(cliOutputSchemaMeta[command]),
    _receipt: receiptSchema,
    tripwire: z.array(tripwireSchema).optional(),
  });
}

const mcpOutputBodySchemas: Record<McpToolName, z.ZodType> = {
  safe_read: z.object({
    path: z.string(),
    projection: z.enum(["content", "outline", "refused", "error", "cache_hit", "diff"]),
    reason: z.string(),
    actual: actualSchema.optional(),
    thresholds: thresholdsSchema.optional(),
    sessionDepth: sessionDepthSchema.optional(),
    content: z.string().optional(),
    outline: z.array(outlineEntrySchema).optional(),
    jumpTable: z.array(jumpEntrySchema).optional(),
    estimatedBytesAvoided: z.number().int().nonnegative().optional(),
    next: z.array(z.string()).optional(),
    reasonDetail: z.string().optional(),
    readCount: z.number().int().nonnegative().optional(),
    lastReadAt: z.string().optional(),
    diff: outlineDiffSchema.optional(),
  }).strict(),
  file_outline: z.union([
    z.object({
      path: z.string(),
      outline: z.array(outlineEntrySchema),
      jumpTable: z.array(jumpEntrySchema),
      partial: z.boolean().optional(),
      reason: z.string().optional(),
      error: z.string().optional(),
      cacheHit: z.boolean().optional(),
    }).strict(),
    z.object({
      path: z.string(),
      projection: z.literal("refused"),
      reason: z.string(),
      reasonDetail: z.string().optional(),
      next: z.array(z.string()).optional(),
      actual: actualSchema.optional(),
    }).strict(),
  ]),
  read_range: z.object({
    path: z.string(),
    content: z.string().optional(),
    startLine: z.number().int().positive().optional(),
    endLine: z.number().int().positive().optional(),
    reason: z.string().optional(),
    truncated: z.boolean().optional(),
    clipped: z.boolean().optional(),
    projection: z.literal("refused").optional(),
    reasonDetail: z.string().optional(),
    next: z.array(z.string()).optional(),
    actual: actualSchema.optional(),
  }).strict(),
  changed_since: z.object({
    status: z.enum(["file_not_found", "refused", "unsupported", "unchanged", "no_previous_observation"]).optional(),
    reason: z.string().optional(),
    diff: outlineDiffSchema.optional(),
    consumed: z.boolean().optional(),
  }).strict(),
  graft_diff: z.object({
    base: z.string(),
    head: z.string(),
    files: z.array(fileDiffSchema),
    refused: z.array(structuralRefusalSchema).optional(),
    layer: worldlineLayerSchema,
  }).strict(),
  graft_since: z.object({
    base: z.string(),
    head: z.string(),
    files: z.array(fileDiffSchema),
    refused: z.array(structuralRefusalSchema).optional(),
    summary: z.string(),
    layer: z.literal("ref_view"),
  }).strict(),
  graft_map: z.object({
    directory: z.string(),
    files: z.array(mapFileSchema),
    refused: z.array(structuralRefusalSchema).optional(),
    summary: z.string(),
  }).strict(),
  code_show: z.object({
    symbol: z.string().optional(),
    kind: z.string().optional(),
    signature: z.string().optional(),
    path: z.string().optional(),
    exported: z.boolean().optional(),
    startLine: z.number().int().positive().optional(),
    endLine: z.number().int().positive().optional(),
    content: z.string().optional(),
    truncated: z.boolean().optional(),
    clipped: z.boolean().optional(),
    source: z.enum(["warp", "live"]),
    layer: worldlineLayerSchema,
    ambiguous: z.boolean().optional(),
    matches: z.array(precisionSymbolMatchSchema).optional(),
    error: z.string().optional(),
    projection: z.literal("refused").optional(),
    reason: z.string().optional(),
    reasonDetail: z.string().optional(),
    next: z.array(z.string()).optional(),
    actual: actualSchema.optional(),
  }).strict(),
  code_find: z.object({
    query: z.string(),
    kind: z.string().nullable(),
    matches: z.array(precisionSymbolMatchSchema).optional(),
    total: z.number().int().nonnegative().optional(),
    path: z.string().optional(),
    projection: z.literal("refused").optional(),
    reason: z.string().optional(),
    reasonDetail: z.string().optional(),
    next: z.array(z.string()).optional(),
    actual: actualSchema.optional(),
    source: z.enum(["warp", "live"]),
    layer: worldlineLayerSchema,
  }).strict(),
  code_refs: z.object({
    query: z.string(),
    mode: z.enum(["text", "import", "call", "property"]),
    scope: z.string(),
    matches: z.array(codeRefsMatchSchema).optional(),
    total: z.number().int().nonnegative().optional(),
    path: z.string().optional(),
    projection: z.literal("refused").optional(),
    reason: z.string().optional(),
    reasonDetail: z.string().optional(),
    next: z.array(z.string()).optional(),
    actual: actualSchema.optional(),
    source: z.literal("text_fallback"),
    provenance: codeRefsProvenanceSchema,
    layer: worldlineLayerSchema,
  }).strict(),
  daemon_status: daemonStatusSchema,
  daemon_sessions: z.object({
    sessions: z.array(daemonSessionSchema),
  }).strict(),
  workspace_authorize: workspaceAuthorizeSchema,
  workspace_authorizations: z.object({
    workspaces: z.array(authorizedWorkspaceSchema),
  }).strict(),
  workspace_revoke: workspaceRevokeSchema,
  workspace_bind: workspaceActionSchema.extend({
    action: z.literal("bind"),
  }).strict(),
  workspace_status: workspaceStatusSchema,
  workspace_rebind: workspaceActionSchema.extend({
    action: z.literal("rebind"),
  }).strict(),
  run_capture: z.object({
    output: z.string(),
    totalLines: z.number().int().nonnegative(),
    tailedLines: z.number().int().nonnegative(),
    logPath: z.string().nullable().optional(),
    logRedactions: z.number().int().nonnegative().optional(),
    logPersistenceEnabled: z.boolean().optional(),
    truncated: z.boolean(),
    disabled: z.boolean().optional(),
    error: z.string().optional(),
    stderr: z.string().optional(),
    policyBoundary: policyBoundarySchema,
  }).strict(),
  state_save: z.object({
    ok: z.boolean(),
    reason: z.string().optional(),
  }).strict(),
  state_load: z.object({
    content: z.string().nullable(),
  }).strict(),
  set_budget: z.object({
    budget: budgetSchema.nullable(),
  }).strict(),
  explain: z.object({
    code: z.string(),
    meaning: z.string().optional(),
    action: z.string().optional(),
    error: z.string().optional(),
    knownCodes: z.string().optional(),
  }).strict(),
  doctor: z.object({
    projectRoot: z.string(),
    parserHealthy: z.boolean(),
    thresholds: thresholdsSchema,
    sessionDepth: z.enum(["early", "mid", "late"]),
    totalMessages: z.number().int().nonnegative(),
    burdenSummary: burdenSummarySchema,
    runtimeObservability: runtimeObservabilitySchema,
    checkoutEpoch: z.number().int().nonnegative(),
    lastTransition: repoTransitionSchema.nullable(),
    workspaceOverlay: workspaceOverlaySummarySchema.nullable(),
  }).strict(),
  stats: z.object({
    totalReads: z.number().int().nonnegative(),
    totalOutlines: z.number().int().nonnegative(),
    totalRefusals: z.number().int().nonnegative(),
    totalCacheHits: z.number().int().nonnegative(),
    totalBytesReturned: z.number().int().nonnegative(),
    totalBytesAvoidedByCache: z.number().int().nonnegative(),
    totalNonReadBytesReturned: z.number().int().nonnegative(),
    burdenByKind: burdenByKindSchema,
  }).strict(),
};

export const MCP_OUTPUT_SCHEMAS: Record<McpToolName, z.ZodType> = {
  safe_read: withMcpCommon("safe_read", mcpOutputBodySchemas.safe_read),
  file_outline: withMcpCommon("file_outline", mcpOutputBodySchemas.file_outline),
  read_range: withMcpCommon("read_range", mcpOutputBodySchemas.read_range),
  changed_since: withMcpCommon("changed_since", mcpOutputBodySchemas.changed_since),
  graft_diff: withMcpCommon("graft_diff", mcpOutputBodySchemas.graft_diff),
  graft_since: withMcpCommon("graft_since", mcpOutputBodySchemas.graft_since),
  graft_map: withMcpCommon("graft_map", mcpOutputBodySchemas.graft_map),
  code_show: withMcpCommon("code_show", mcpOutputBodySchemas.code_show),
  code_find: withMcpCommon("code_find", mcpOutputBodySchemas.code_find),
  code_refs: withMcpCommon("code_refs", mcpOutputBodySchemas.code_refs),
  daemon_status: withMcpCommon("daemon_status", mcpOutputBodySchemas.daemon_status),
  daemon_sessions: withMcpCommon("daemon_sessions", mcpOutputBodySchemas.daemon_sessions),
  workspace_authorize: withMcpCommon("workspace_authorize", mcpOutputBodySchemas.workspace_authorize),
  workspace_authorizations: withMcpCommon(
    "workspace_authorizations",
    mcpOutputBodySchemas.workspace_authorizations,
  ),
  workspace_revoke: withMcpCommon("workspace_revoke", mcpOutputBodySchemas.workspace_revoke),
  workspace_bind: withMcpCommon("workspace_bind", mcpOutputBodySchemas.workspace_bind),
  workspace_status: withMcpCommon("workspace_status", mcpOutputBodySchemas.workspace_status),
  workspace_rebind: withMcpCommon("workspace_rebind", mcpOutputBodySchemas.workspace_rebind),
  run_capture: withMcpCommon("run_capture", mcpOutputBodySchemas.run_capture),
  state_save: withMcpCommon("state_save", mcpOutputBodySchemas.state_save),
  state_load: withMcpCommon("state_load", mcpOutputBodySchemas.state_load),
  set_budget: withMcpCommon("set_budget", mcpOutputBodySchemas.set_budget),
  explain: withMcpCommon("explain", mcpOutputBodySchemas.explain),
  doctor: withMcpCommon("doctor", mcpOutputBodySchemas.doctor),
  stats: withMcpCommon("stats", mcpOutputBodySchemas.stats),
};

const initActionSchema = z.object({
  action: z.enum(["exists", "create", "append"]),
  label: z.string(),
  detail: z.string().optional(),
}).strict();

const hooksConfigSchema = z.object({
  hooks: z.object({
    PreToolUse: z.array(z.object({
      matcher: z.literal("Read"),
      hooks: z.array(z.object({
        type: z.literal("command"),
        command: z.string(),
      }).strict()),
    }).strict()),
    PostToolUse: z.array(z.object({
      matcher: z.literal("Read"),
      hooks: z.array(z.object({
        type: z.literal("command"),
        command: z.string(),
      }).strict()),
    }).strict()),
  }).strict(),
}).strict();

const suggestedMcpServerSchema = z.object({
  mcpServers: z.object({
    graft: z.object({
      command: z.literal("npx"),
      args: z.tuple([z.literal("-y"), z.literal("@flyingrobots/graft"), z.literal("serve")]),
    }).strict(),
  }).strict(),
}).strict();

export const CLI_OUTPUT_SCHEMAS: Record<CliCommandName, z.ZodType> = {
  init: withCliCommon("init", z.object({
    ok: z.boolean(),
    cwd: z.string(),
    actions: z.array(initActionSchema).optional(),
    hooksConfig: hooksConfigSchema.optional(),
    suggestedMcpServer: suggestedMcpServerSchema.optional(),
    error: z.string().optional(),
  }).strict()),
  index: withCliCommon("index", z.object({
    ok: z.boolean(),
    cwd: z.string(),
    from: z.string().nullable(),
    commitsIndexed: z.number().int().nonnegative().optional(),
    patchesWritten: z.number().int().nonnegative().optional(),
    error: z.string().optional(),
  }).strict()),
  read_safe: withCliPeerCommon("read_safe", mcpOutputBodySchemas.safe_read),
  read_outline: withCliPeerCommon("read_outline", mcpOutputBodySchemas.file_outline),
  read_range: withCliPeerCommon("read_range", mcpOutputBodySchemas.read_range),
  read_changed: withCliPeerCommon("read_changed", mcpOutputBodySchemas.changed_since),
  struct_diff: withCliPeerCommon("struct_diff", mcpOutputBodySchemas.graft_diff),
  struct_since: withCliPeerCommon("struct_since", mcpOutputBodySchemas.graft_since),
  struct_map: withCliPeerCommon("struct_map", mcpOutputBodySchemas.graft_map),
  symbol_show: withCliPeerCommon("symbol_show", mcpOutputBodySchemas.code_show),
  symbol_find: withCliPeerCommon("symbol_find", mcpOutputBodySchemas.code_find),
  diag_doctor: withCliPeerCommon("diag_doctor", mcpOutputBodySchemas.doctor),
  diag_explain: withCliPeerCommon("diag_explain", mcpOutputBodySchemas.explain),
  diag_stats: withCliPeerCommon("diag_stats", mcpOutputBodySchemas.stats),
  diag_capture: withCliPeerCommon("diag_capture", mcpOutputBodySchemas.run_capture),
};

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

export function validateCliOutput(
  command: CliCommandName,
  data: unknown,
): Record<string, unknown> {
  return CLI_OUTPUT_SCHEMAS[command].parse(data) as Record<string, unknown>;
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
