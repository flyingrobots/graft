import { z } from "zod";
import {
  MCP_TOOL_NAMES,
  type McpToolName,
} from "./capabilities.js";
import { MCP_OUTPUT_SCHEMAS } from "./output-schemas.js";

/** Maximum aggregate size of Graft's advertised MCP output schemas. */
export const MCP_DISCOVERY_OUTPUT_SCHEMA_MAX_TOTAL_BYTES = 65_536;

/** Maximum size of one advertised MCP output schema. */
export const MCP_DISCOVERY_OUTPUT_SCHEMA_MAX_TOOL_BYTES = 8_192;

/**
 * MCP discovery requires an object-root output schema. Graft's canonical
 * schemas are intentionally stricter and may use object unions, so discovery
 * receives a deterministic, bounded projection of those contracts.
 */
type DiscoveryShape = Record<string, z.ZodType>;

export type McpDiscoveryOutputSchema = z.ZodObject;

interface ProjectedField {
  readonly schema: z.ZodType;
  readonly optional: boolean;
}

const receiptPostureSchema = z.looseObject({
  mode: z.enum(["compact", "full"]),
});

function compareCodePoints(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function stableJson(value: unknown): string {
  if (value === undefined) {
    throw new Error("MCP discovery schema contained a non-JSON value");
  }
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableJson(entry)).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => compareCodePoints(left, right));
  return `{${entries.map(([key, entry]) => {
    return `${JSON.stringify(key)}:${stableJson(entry)}`;
  }).join(",")}}`;
}

function schemaFingerprint(schema: z.ZodType): string {
  return stableJson(z.toJSONSchema(schema));
}

function mergeProjectedFields(fields: readonly ProjectedField[]): ProjectedField {
  if (fields.length === 0) {
    throw new Error("Cannot merge an empty MCP discovery field set");
  }

  const uniqueSchemas = new Map<string, z.ZodType>();
  for (const field of fields) {
    uniqueSchemas.set(schemaFingerprint(field.schema), field.schema);
  }
  const schemas = [...uniqueSchemas.entries()]
    .sort(([left], [right]) => compareCodePoints(left, right))
    .map(([, schema]) => schema);
  const first = schemas[0];
  if (first === undefined) {
    throw new Error("Cannot merge an empty MCP discovery schema set");
  }
  const second = schemas[1];
  const schema = second === undefined
    ? first
    : z.union([first, second, ...schemas.slice(2)]);

  return {
    schema,
    optional: fields.some((field) => field.optional),
  };
}

function projectField(
  fieldName: string,
  schema: z.ZodType,
  activeSchemas = new Set<z.ZodType>(),
): ProjectedField {
  if (activeSchemas.has(schema)) {
    throw new Error(`Recursive top-level MCP output field is unsupported: ${fieldName}`);
  }
  activeSchemas.add(schema);
  try {
    if (schema instanceof z.ZodOptional) {
      const projected = projectField(
        fieldName,
        schema.unwrap() as z.ZodType,
        activeSchemas,
      );
      return { schema: projected.schema, optional: true };
    }
    if (schema instanceof z.ZodNullable) {
      const projected = projectField(
        fieldName,
        schema.unwrap() as z.ZodType,
        activeSchemas,
      );
      return {
        schema: projected.schema.nullable(),
        optional: projected.optional,
      };
    }
    if (schema instanceof z.ZodLazy) {
      return projectField(fieldName, schema.unwrap() as z.ZodType, activeSchemas);
    }

    // Schema identity is the versioned link back to the exact contract.
    if (fieldName === "_schema") {
      return { schema, optional: false };
    }
    // Receipt internals remain available in the canonical schema. Discovery
    // advertises only the two public projection modes to preserve its budget.
    if (fieldName === "_receipt") {
      return { schema: receiptPostureSchema, optional: false };
    }

    if (schema instanceof z.ZodUnion) {
      return mergeProjectedFields(
        schema.options.map((option) => {
          return projectField(fieldName, option as z.ZodType, activeSchemas);
        }),
      );
    }
    if (schema instanceof z.ZodObject) {
      return { schema: z.looseObject({}), optional: false };
    }
    if (schema instanceof z.ZodArray) {
      return { schema: z.array(z.unknown()), optional: false };
    }
    if (schema instanceof z.ZodRecord) {
      return { schema: z.record(z.string(), z.unknown()), optional: false };
    }
    if (
      schema instanceof z.ZodString
      || schema instanceof z.ZodNumber
      || schema instanceof z.ZodBoolean
      || schema instanceof z.ZodEnum
      || schema instanceof z.ZodLiteral
    ) {
      return { schema, optional: false };
    }

    throw new Error(
      `Unsupported top-level MCP output field schema for ${fieldName}: ${schema.constructor.name}`,
    );
  } finally {
    activeSchemas.delete(schema);
  }
}

function rootObjectVariants(tool: McpToolName, schema: z.ZodType): readonly z.ZodObject[] {
  if (schema instanceof z.ZodObject) {
    return [schema];
  }
  if (schema instanceof z.ZodUnion) {
    return schema.options.map((option) => {
      if (!(option instanceof z.ZodObject)) {
        throw new Error(`MCP output schema ${tool} has a non-object union variant`);
      }
      return option;
    });
  }
  throw new Error(`MCP output schema ${tool} must be an object or an object union`);
}

/** @internal Exported so contract tests can prove construction-order invariance. */
export function buildMcpDiscoveryOutputSchema(
  tool: McpToolName,
  canonicalSchema: z.ZodType,
): McpDiscoveryOutputSchema {
  const variants = rootObjectVariants(tool, canonicalSchema);
  const fieldNames = [...new Set(variants.flatMap((variant) => Object.keys(variant.shape)))]
    .sort(compareCodePoints);
  const shape: DiscoveryShape = {};

  for (const fieldName of fieldNames) {
    const presentFields = variants.flatMap((variant) => {
      const variantShape = variant.shape as Record<string, unknown>;
      if (!Object.hasOwn(variantShape, fieldName)) {
        return [];
      }
      const fieldSchema: unknown = variantShape[fieldName];
      if (fieldSchema === undefined) {
        throw new Error(`MCP output schema ${tool} has an undefined field: ${fieldName}`);
      }
      return [projectField(fieldName, fieldSchema as z.ZodType)];
    });
    const projected = mergeProjectedFields(presentFields);
    const optional = presentFields.length < variants.length || projected.optional;
    shape[fieldName] = optional ? projected.schema.optional() : projected.schema;
  }

  return z.object(shape).strict();
}

export const MCP_DISCOVERY_OUTPUT_SCHEMAS = Object.freeze(Object.fromEntries(
  MCP_TOOL_NAMES.map((tool) => [
    tool,
    buildMcpDiscoveryOutputSchema(tool, MCP_OUTPUT_SCHEMAS[tool]),
  ]),
) as Record<McpToolName, McpDiscoveryOutputSchema>);

export function getMcpDiscoveryOutputSchema(
  tool: McpToolName,
): McpDiscoveryOutputSchema {
  return MCP_DISCOVERY_OUTPUT_SCHEMAS[tool];
}
