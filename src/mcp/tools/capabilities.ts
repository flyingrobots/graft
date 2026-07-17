import {
  buildMcpCapabilityDiscovery,
  mcpCapabilityFamilySchema,
  type McpCapabilityFamily,
} from "../../contracts/mcp-capability-discovery.js";
import type { ToolDefinition, ToolHandler } from "../context.js";

export const capabilitiesTool: ToolDefinition = {
  name: "capabilities",
  description:
    "Discover Graft's registered MCP surface as bounded workflow families. " +
    "Select one family for bounded tool names and guidance.",
  schema: {
    family: mcpCapabilityFamilySchema.optional(),
  },
  createHandler(): ToolHandler {
    return (args, ctx) => {
      const family = args["family"] as McpCapabilityFamily | undefined;
      const sessionMode = ctx.getWorkspaceStatus().sessionMode;
      const response = buildMcpCapabilityDiscovery({
        sessionMode,
        ...(family === undefined ? {} : { family }),
      });
      return ctx.respond("capabilities", response);
    };
  },
};
