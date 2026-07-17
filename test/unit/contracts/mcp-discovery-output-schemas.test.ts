import { describe, expect, it } from "vitest";
import { z } from "zod";
import { MCP_TOOL_NAMES } from "../../../src/contracts/capabilities.js";
import {
  MCP_DISCOVERY_OUTPUT_SCHEMA_MAX_TOOL_BYTES,
  MCP_DISCOVERY_OUTPUT_SCHEMA_MAX_TOTAL_BYTES,
  MCP_DISCOVERY_OUTPUT_SCHEMAS,
  buildMcpDiscoveryOutputSchema,
  getMcpDiscoveryOutputSchema,
} from "../../../src/contracts/mcp-discovery-output-schemas.js";
import { MCP_OUTPUT_SCHEMAS } from "../../../src/contracts/output-schemas.js";

function canonicalRootVariants(schema: z.ZodType): readonly z.ZodObject[] {
  if (schema instanceof z.ZodObject) {
    return [schema];
  }
  if (schema instanceof z.ZodUnion) {
    return schema.options.map((option) => {
      if (!(option instanceof z.ZodObject)) {
        throw new Error("expected an object-root canonical schema");
      }
      return option;
    });
  }
  throw new Error("expected an object-root canonical schema");
}

function schemaBytes(schema: z.ZodType): number {
  return Buffer.byteLength(JSON.stringify(z.toJSONSchema(schema)), "utf8");
}

function common(tool: string, receiptMode: "compact" | "full" = "compact") {
  return {
    _schema: { id: `graft.mcp.${tool}`, version: "2.0.0" },
    _receipt: { mode: receiptMode },
  };
}

describe("bounded MCP discovery output schemas", () => {
  it("projects every canonical tool contract to a strict object root", () => {
    expect(Object.keys(MCP_DISCOVERY_OUTPUT_SCHEMAS).sort()).toEqual(
      [...MCP_TOOL_NAMES].sort(),
    );
    for (const tool of MCP_TOOL_NAMES) {
      const schema = getMcpDiscoveryOutputSchema(tool);
      expect(schema).toBeInstanceOf(z.ZodObject);
      const jsonSchema = z.toJSONSchema(schema);
      expect(jsonSchema.type).toBe("object");
      expect(jsonSchema.additionalProperties).toBe(false);
    }
  });

  it("preserves every top-level property in deterministic code-point order", () => {
    for (const tool of MCP_TOOL_NAMES) {
      const canonicalFields = new Set(
        canonicalRootVariants(MCP_OUTPUT_SCHEMAS[tool])
          .flatMap((variant) => Object.keys(variant.shape)),
      );
      const discoveryFields = Object.keys(getMcpDiscoveryOutputSchema(tool).shape);
      expect(discoveryFields).toEqual([...discoveryFields].sort());
      expect(new Set(discoveryFields)).toEqual(canonicalFields);
    }
  });

  it("is invariant to canonical root-union construction order", () => {
    const canonical = MCP_OUTPUT_SCHEMAS.file_outline;
    if (!(canonical instanceof z.ZodUnion)) {
      throw new Error("file_outline must remain an object-root union fixture");
    }
    const [first, second] = canonical.options;
    if (first === undefined || second === undefined) {
      throw new Error("file_outline union fixture requires two variants");
    }
    const reversed = z.union([second, first]);

    const forwardJson = JSON.stringify(z.toJSONSchema(
      buildMcpDiscoveryOutputSchema("file_outline", canonical),
    ));
    const reversedJson = JSON.stringify(z.toJSONSchema(
      buildMcpDiscoveryOutputSchema("file_outline", reversed),
    ));
    expect(reversedJson).toBe(forwardJson);
  });

  it("stays within the aggregate and per-tool discovery budgets", () => {
    let totalBytes = 0;
    for (const tool of MCP_TOOL_NAMES) {
      const bytes = schemaBytes(getMcpDiscoveryOutputSchema(tool));
      expect(bytes, `${tool} discovery schema bytes`).toBeLessThanOrEqual(
        MCP_DISCOVERY_OUTPUT_SCHEMA_MAX_TOOL_BYTES,
      );
      totalBytes += bytes;
    }
    expect(totalBytes).toBeLessThanOrEqual(MCP_DISCOVERY_OUTPUT_SCHEMA_MAX_TOTAL_BYTES);
  });

  it("keeps exact schema identity while exposing both receipt modes", () => {
    const schema = getMcpDiscoveryOutputSchema("safe_read");
    const payload = {
      path: "src/index.ts",
      projection: "content",
      reason: "CONTENT",
      ...common("safe_read"),
    };

    expect(() => schema.parse(payload)).not.toThrow();
    expect(() => schema.parse({
      ...payload,
      _receipt: { mode: "full", cumulative: { reads: 1 } },
    })).not.toThrow();
    expect(() => schema.parse({
      ...payload,
      _schema: { id: "graft.mcp.stats", version: "2.0.0" },
    })).toThrow();
    expect(() => schema.parse({
      ...payload,
      _schema: { ...payload._schema, future: true },
    })).toThrow();
    expect(() => schema.parse({ ...payload, _receipt: { mode: "verbose" } })).toThrow();
    expect(() => schema.parse({ ...payload, _receipt: {} })).toThrow();
  });

  it("flattens canonical union roots without making variant-only fields required", () => {
    const fileOutline = getMcpDiscoveryOutputSchema("file_outline");
    expect(() => fileOutline.parse({
      path: "src/index.ts",
      outline: [{ future: "shape" }],
      jumpTable: [],
      ...common("file_outline"),
    })).not.toThrow();
    expect(() => fileOutline.parse({
      path: "src/index.ts",
      projection: "refused",
      reason: "policy",
      ...common("file_outline", "full"),
    })).not.toThrow();

    const doctor = getMcpDiscoveryOutputSchema("doctor");
    expect(() => doctor.parse({
      recommendedNextAction: "bind_workspace_to_begin_local_history",
      ...common("doctor"),
    })).not.toThrow();
    expect(doctor.shape["health"]).toBeInstanceOf(z.ZodOptional);
    expect(doctor.shape["projectRoot"]).toBeInstanceOf(z.ZodOptional);

    const activity = getMcpDiscoveryOutputSchema("activity_view");
    expect(activity).toBeInstanceOf(z.ZodObject);
    expect(activity.shape["workspace"]).toBeInstanceOf(z.ZodOptional);
    expect(activity.shape["sessionMode"]).toBeInstanceOf(z.ZodOptional);
  });

  it("preserves top-level scalar contracts while leaving deep payloads shallow", () => {
    const safeRead = getMcpDiscoveryOutputSchema("safe_read");
    const payload = {
      path: "src/index.ts",
      projection: "content",
      reason: "CONTENT",
      actual: { deliberately: "shallow" },
      outline: [42, "future-entry"],
      ...common("safe_read"),
    };

    expect(() => safeRead.parse(payload)).not.toThrow();
    expect(() => safeRead.parse({ ...payload, path: 42 })).toThrow();
    expect(() => safeRead.parse({ ...payload, projection: "unknown" })).toThrow();
    expect(() => safeRead.parse({ ...payload, unexpectedTopLevel: true })).toThrow();
  });
});
