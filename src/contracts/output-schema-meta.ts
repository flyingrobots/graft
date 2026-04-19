import { z } from "zod";
import {
  CLI_COMMAND_NAMES,
  type CliCommandName,
  MCP_TOOL_NAMES,
  type McpToolName,
} from "./capabilities.js";

export const OUTPUT_SCHEMA_VERSION = "1.0.0" as const;

export interface OutputSchemaMeta {
  readonly id: string;
  readonly version: typeof OUTPUT_SCHEMA_VERSION;
}

export const mcpOutputSchemaMeta = Object.freeze(Object.fromEntries(
  MCP_TOOL_NAMES.map((tool) => [tool, Object.freeze({
    id: `graft.mcp.${tool}`,
    version: OUTPUT_SCHEMA_VERSION,
  })]),
) as Record<McpToolName, OutputSchemaMeta>);

export const cliOutputSchemaMeta = Object.freeze(Object.fromEntries(
  CLI_COMMAND_NAMES.map((command) => [command, Object.freeze({
    id: `graft.cli.${command}`,
    version: OUTPUT_SCHEMA_VERSION,
  })]),
) as Record<CliCommandName, OutputSchemaMeta>);

export function schemaMetaLiteral(meta: OutputSchemaMeta) {
  return z.object({
    id: z.literal(meta.id),
    version: z.literal(meta.version),
  }).strict();
}

export type CliPeerCommandName =
  | "read_safe"
  | "read_outline"
  | "read_range"
  | "read_changed"
  | "struct_diff"
  | "struct_since"
  | "struct_map"
  | "symbol_show"
  | "symbol_find"
  | "diag_doctor"
  | "diag_activity"
  | "diag_explain"
  | "diag_stats"
  | "diag_capture";

export interface McpCommonFields {
  readonly _schema: OutputSchemaMeta;
  readonly _receipt: Record<string, unknown>;
  readonly tripwire?: readonly Record<string, unknown>[] | undefined;
}

export interface CliCommonFields {
  readonly _schema: OutputSchemaMeta;
}

export interface CliPeerCommonFields extends CliCommonFields {
  readonly _receipt: Record<string, unknown>;
  readonly tripwire?: readonly Record<string, unknown>[] | undefined;
}

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

export function withMcpCommon(
  tool: McpToolName,
  schema: z.ZodType,
  receiptSchema: z.ZodType,
  tripwireSchema: z.ZodType,
): z.ZodType {
  return extendWithCommonFields(schema, {
    _schema: schemaMetaLiteral(mcpOutputSchemaMeta[tool]),
    _receipt: receiptSchema,
    tripwire: z.array(tripwireSchema).optional(),
  });
}

export function withCliCommon(
  command: CliCommandName,
  schema: z.ZodType,
): z.ZodType {
  return extendWithCommonFields(schema, {
    _schema: schemaMetaLiteral(cliOutputSchemaMeta[command]),
  });
}

export function withCliPeerCommon(
  command: CliCommandName,
  schema: z.ZodType,
  receiptSchema: z.ZodType,
  tripwireSchema: z.ZodType,
): z.ZodType {
  return extendWithCommonFields(schema, {
    _schema: schemaMetaLiteral(cliOutputSchemaMeta[command]),
    _receipt: receiptSchema,
    tripwire: z.array(tripwireSchema).optional(),
  });
}
