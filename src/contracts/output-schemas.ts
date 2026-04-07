import { z } from "zod";

export const OUTPUT_SCHEMA_VERSION = "1.0.0" as const;

export const MCP_TOOL_NAMES = [
  "safe_read",
  "file_outline",
  "read_range",
  "changed_since",
  "graft_diff",
  "graft_since",
  "graft_map",
  "code_show",
  "code_find",
  "run_capture",
  "state_save",
  "state_load",
  "set_budget",
  "explain",
  "doctor",
  "stats",
] as const;

export type McpToolName = typeof MCP_TOOL_NAMES[number];

export const CLI_COMMAND_NAMES = ["init", "index"] as const;

export type CliCommandName = typeof CLI_COMMAND_NAMES[number];

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

const receiptSchema = z.object({
  sessionId: z.string(),
  seq: z.number().int().positive(),
  ts: z.string(),
  tool: z.string(),
  projection: z.string(),
  reason: z.string(),
  fileBytes: z.number().int().nonnegative().nullable(),
  returnedBytes: z.number().int().nonnegative(),
  cumulative: z.object({
    reads: z.number().int().nonnegative(),
    outlines: z.number().int().nonnegative(),
    refusals: z.number().int().nonnegative(),
    cacheHits: z.number().int().nonnegative(),
    bytesReturned: z.number().int().nonnegative(),
    bytesAvoided: z.number().int().nonnegative(),
  }).strict(),
  budget: budgetSchema.optional(),
  compressionRatio: z.number().nullable().optional(),
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

function withMcpCommon(
  tool: McpToolName,
  schema: z.ZodObject,
): z.ZodObject {
  return schema.extend({
    _schema: schemaMetaLiteral(mcpOutputSchemaMeta[tool]),
    _receipt: receiptSchema,
    tripwire: z.array(tripwireSchema).optional(),
  }).strict();
}

function withCliCommon(
  command: CliCommandName,
  schema: z.ZodObject,
): z.ZodObject {
  return schema.extend({
    _schema: schemaMetaLiteral(cliOutputSchemaMeta[command]),
  }).strict();
}

export const MCP_OUTPUT_SCHEMAS: Record<McpToolName, z.ZodType> = {
  safe_read: withMcpCommon("safe_read", z.object({
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
  }).strict()),
  file_outline: withMcpCommon("file_outline", z.object({
    path: z.string(),
    outline: z.array(outlineEntrySchema),
    jumpTable: z.array(jumpEntrySchema),
    partial: z.boolean().optional(),
    reason: z.string().optional(),
    error: z.string().optional(),
    cacheHit: z.boolean().optional(),
  }).strict()).or(withMcpCommon("file_outline", z.object({
    path: z.string(),
    projection: z.literal("refused"),
    reason: z.string(),
    reasonDetail: z.string().optional(),
    next: z.array(z.string()).optional(),
    actual: actualSchema.optional(),
  }).strict())),
  read_range: withMcpCommon("read_range", z.object({
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
  }).strict()),
  changed_since: withMcpCommon("changed_since", z.object({
    status: z.enum(["file_not_found", "refused", "unsupported", "unchanged", "no_previous_observation"]).optional(),
    reason: z.string().optional(),
    diff: outlineDiffSchema.optional(),
    consumed: z.boolean().optional(),
  }).strict()),
  graft_diff: withMcpCommon("graft_diff", z.object({
    base: z.string(),
    head: z.string(),
    files: z.array(fileDiffSchema),
    refused: z.array(structuralRefusalSchema).optional(),
    layer: worldlineLayerSchema,
  }).strict()),
  graft_since: withMcpCommon("graft_since", z.object({
    base: z.string(),
    head: z.string(),
    files: z.array(fileDiffSchema),
    refused: z.array(structuralRefusalSchema).optional(),
    summary: z.string(),
    layer: z.literal("ref_view"),
  }).strict()),
  graft_map: withMcpCommon("graft_map", z.object({
    directory: z.string(),
    files: z.array(mapFileSchema),
    refused: z.array(structuralRefusalSchema).optional(),
    summary: z.string(),
  }).strict()),
  code_show: withMcpCommon("code_show", z.object({
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
  }).strict()),
  code_find: withMcpCommon("code_find", z.object({
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
  }).strict()),
  run_capture: withMcpCommon("run_capture", z.object({
    output: z.string(),
    totalLines: z.number().int().nonnegative(),
    tailedLines: z.number().int().nonnegative(),
    logPath: z.string().nullable().optional(),
    truncated: z.boolean(),
    error: z.string().optional(),
    stderr: z.string().optional(),
    policyBoundary: policyBoundarySchema,
  }).strict()),
  state_save: withMcpCommon("state_save", z.object({
    ok: z.boolean(),
    reason: z.string().optional(),
  }).strict()),
  state_load: withMcpCommon("state_load", z.object({
    content: z.string().nullable(),
  }).strict()),
  set_budget: withMcpCommon("set_budget", z.object({
    budget: budgetSchema.nullable(),
  }).strict()),
  explain: withMcpCommon("explain", z.object({
    code: z.string(),
    meaning: z.string().optional(),
    action: z.string().optional(),
    error: z.string().optional(),
    knownCodes: z.string().optional(),
  }).strict()),
  doctor: withMcpCommon("doctor", z.object({
    projectRoot: z.string(),
    parserHealthy: z.boolean(),
    thresholds: thresholdsSchema,
    sessionDepth: z.enum(["early", "mid", "late"]),
    totalMessages: z.number().int().nonnegative(),
    checkoutEpoch: z.number().int().nonnegative(),
    lastTransition: repoTransitionSchema.nullable(),
    workspaceOverlay: workspaceOverlaySummarySchema.nullable(),
  }).strict()),
  stats: withMcpCommon("stats", z.object({
    totalReads: z.number().int().nonnegative(),
    totalOutlines: z.number().int().nonnegative(),
    totalRefusals: z.number().int().nonnegative(),
    totalCacheHits: z.number().int().nonnegative(),
    totalBytesAvoidedByCache: z.number().int().nonnegative(),
  }).strict()),
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
      args: z.tuple([z.literal("-y"), z.literal("@flyingrobots/graft")]),
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

export function getMcpOutputJsonSchema(tool: McpToolName): unknown {
  return z.toJSONSchema(MCP_OUTPUT_SCHEMAS[tool]);
}

export function getCliOutputJsonSchema(command: CliCommandName): unknown {
  return z.toJSONSchema(CLI_OUTPUT_SCHEMAS[command]);
}

export const RECEIPT_SCHEMA = receiptSchema;
export const RECEIPT_JSON_SCHEMA = z.toJSONSchema(receiptSchema);
