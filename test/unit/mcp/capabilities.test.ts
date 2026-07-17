import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { capabilitiesTool } from "../../../src/mcp/tools/capabilities.js";
import type { ToolContext } from "../../../src/mcp/context.js";
import { repoStateOptionalTools } from "../../../src/mcp/server-tool-access.js";

interface CapturedResponse {
  readonly tool: string;
  readonly data: Record<string, unknown>;
}

function createContext(sessionMode: "repo_local" | "daemon"): {
  readonly ctx: ToolContext;
  readonly responses: CapturedResponse[];
} {
  const responses: CapturedResponse[] = [];
  const ctx = {
    getWorkspaceStatus: () => ({ sessionMode }),
    respond: (tool: string, data: Record<string, unknown>) => {
      responses.push({ tool, data });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  } as unknown as ToolContext;
  return { ctx, responses };
}

describe("mcp: capabilities", () => {
  it("returns the bounded registered-family summary for the active runtime", async () => {
    const { ctx, responses } = createContext("repo_local");

    await capabilitiesTool.createHandler()({}, ctx);

    expect(responses).toHaveLength(1);
    expect(responses[0]!.tool).toBe("capabilities");
    expect(responses[0]!.data).toMatchObject({
      projection: "summary",
      reason: "CAPABILITY_SUMMARY",
      discoveryBasis: "registered_surface",
      sessionMode: "repo_local",
      registeredToolCount: 34,
    });

    const families = responses[0]!.data["families"] as Record<string, unknown>[];
    expect(families.map((family) => family["family"])).toEqual([
      "session",
      "workspace",
      "read",
      "code",
      "history",
      "review",
      "diagnostic",
    ]);
    expect(families).toEqual(expect.arrayContaining([
      expect.objectContaining({
        family: "read",
        openingCall: "safe_read",
        toolCount: 4,
      }),
    ]));
    expect(families.every((family) => !("tools" in family))).toBe(true);
  });

  it("returns only the explicitly selected family detail", async () => {
    const { ctx, responses } = createContext("daemon");

    await capabilitiesTool.createHandler()({ family: "read" }, ctx);

    expect(responses).toHaveLength(1);
    expect(responses[0]!.tool).toBe("capabilities");
    expect(responses[0]!.data).toMatchObject({
      projection: "family_detail",
      reason: "CAPABILITY_FAMILY_DETAIL",
      discoveryBasis: "registered_surface",
      sessionMode: "daemon",
      registeredToolCount: 48,
      family: "read",
      openingCall: "safe_read",
      toolCount: 4,
    });
    expect(responses[0]!.data).not.toHaveProperty("families");

    const tools = responses[0]!.data["tools"] as Record<string, unknown>[];
    expect(tools.map((tool) => tool["name"])).toEqual([
      "safe_read",
      "changed_since",
      "file_outline",
      "read_range",
    ]);
    expect(tools.every((tool) => typeof tool["description"] === "string")).toBe(true);
  });

  it("publishes one optional strict family selector", () => {
    const familySchema = capabilitiesTool.schema?.["family"];
    expect(familySchema).toBeDefined();
    expect(familySchema!.parse(undefined)).toBeUndefined();
    expect(familySchema!.parse("history")).toBe("history");
    expect(() => familySchema!.parse("everything")).toThrow(ZodError);
  });

  it("does not require repository-state observation for discovery", () => {
    expect(repoStateOptionalTools.has("capabilities")).toBe(true);
  });
});
