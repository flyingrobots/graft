import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { MCP_OUTPUT_SCHEMAS } from "../../../src/contracts/output-schemas.js";
import type { McpToolResult } from "../../../src/mcp/server.js";
import { createIsolatedServer, parse } from "../../helpers/mcp.js";
import { cleanupTestRepo, createTestRepo, git } from "../../helpers/git.js";

const cleanups: (() => void)[] = [];

afterEach(() => {
  while (cleanups.length > 0) {
    cleanups.pop()!();
  }
});

function textOf(result: McpToolResult): string {
  const content = result.content.find((item) => item.type === "text");
  if (content?.type !== "text") {
    throw new Error("expected MCP text content");
  }
  return content.text;
}

function containsKey(value: unknown, key: string): boolean {
  if (Array.isArray(value)) {
    return value.some((entry) => containsKey(entry, key));
  }
  if (value === null || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return Object.hasOwn(record, key)
    || Object.values(record).some((entry) => containsKey(entry, key));
}

function createLongPathRepo(): string {
  const repoDir = createTestRepo(`graft-diagnostic-${"x".repeat(96)}-`);
  cleanups.push(() => {
    cleanupTestRepo(repoDir);
  });
  fs.writeFileSync(path.join(repoDir, "app.ts"), "export const value = 0;\n");
  git(repoDir, "add -A");
  git(repoDir, "commit -m init");
  return repoDir;
}

describe("mcp: summary-first diagnostics", () => {
  it("returns a bounded doctor summary with explicit readiness uncertainty", async () => {
    const repoDir = createLongPathRepo();
    const isolated = createIsolatedServer({
      projectRoot: repoDir,
      graftDir: path.join(repoDir, ".graft"),
    });
    cleanups.push(() => {
      isolated.cleanup();
    });

    const result = await isolated.server.callTool("doctor", {});
    const parsed = parse(result);

    expect(Buffer.byteLength(textOf(result), "utf8")).toBeLessThan(2_048);
    expect(parsed["_receipt"]).toMatchObject({ mode: "compact" });
    expect(parsed["health"]).toBe("degraded");
    expect(parsed["workspace"]).toEqual(expect.objectContaining({
      sessionMode: "repo_local",
      bindState: "bound",
      repoId: expect.any(String),
      worktreeId: expect.any(String),
    }));
    expect(parsed["history"]).toEqual({
      structural: {
        readiness: "unknown",
        reason: "not_observed",
      },
      local: {
        readiness: "ready",
        active: true,
      },
    });
    expect(parsed["degradedReasons"]).toEqual(expect.arrayContaining([
      "structural_history_readiness_unknown",
      "target_repo_hooks_absent",
    ]));
    expect(parsed["recommendedNextAction"]).toBe("continue_active_causal_workspace");

    expect(() => MCP_OUTPUT_SCHEMAS.doctor.parse(parsed)).not.toThrow();

    const summaryWithProjectRoot = {
      ...parsed,
      projectRoot: repoDir,
    };
    expect(() => MCP_OUTPUT_SCHEMAS.doctor.parse(summaryWithProjectRoot)).toThrow(ZodError);

    const summaryWithSludge = {
      ...parsed,
      sludge: {},
    };
    expect(() => MCP_OUTPUT_SCHEMAS.doctor.parse(summaryWithSludge)).toThrow(ZodError);

    for (const fullOnlyField of [
      "projectRoot",
      "thresholds",
      "burdenSummary",
      "runtimeObservability",
      "causalContext",
      "workspaceOverlayFooting",
      "persistedLocalHistory",
    ]) {
      expect(parsed).not.toHaveProperty(fullOnlyField);
    }
  });

  it("restores exhaustive doctor evidence only for full detail or a sludge scan", async () => {
    const repoDir = createLongPathRepo();
    fs.mkdirSync(path.join(repoDir, "src"), { recursive: true });
    fs.writeFileSync(path.join(repoDir, "src", "sloppy.ts"), [
      "/** @typedef {{ name: string }} UserShape */",
      "/** @type {UserShape} */",
      "const first = {};",
      "/** @type {UserShape} */",
      "const second = {};",
      "/** @type {UserShape} */",
      "const third = {};",
      "type UserShape = { name: string };",
      "",
    ].join("\n"));
    const isolated = createIsolatedServer({
      projectRoot: repoDir,
      graftDir: path.join(repoDir, ".graft"),
    });
    cleanups.push(() => {
      isolated.cleanup();
    });

    const full = parse(await isolated.server.callTool("doctor", { detail: "full" }));
    expect(full["projectRoot"]).toBe(repoDir);
    expect(full["runtimeObservability"]).toBeDefined();
    expect(full["persistedLocalHistory"]).toBeDefined();
    expect(full).not.toHaveProperty("health");
    expect(() => MCP_OUTPUT_SCHEMAS.doctor.parse(full)).not.toThrow();

    const fullMissingParserHealth = structuredClone(full);
    delete fullMissingParserHealth["parserHealthy"];
    expect(() => MCP_OUTPUT_SCHEMAS.doctor.parse(fullMissingParserHealth)).toThrow(ZodError);

    const sludge = parse(await isolated.server.callTool("doctor", {
      detail: "summary",
      sludge: true,
      path: "src",
    }));
    expect(sludge["projectRoot"]).toBe(repoDir);
    expect(sludge["sludge"]).toBeDefined();
    expect(sludge).not.toHaveProperty("health");
    expect(() => MCP_OUTPUT_SCHEMAS.doctor.parse(sludge)).not.toThrow();
  });

  it("returns a bounded activity summary without event bodies and preserves window truth", async () => {
    const repoDir = createLongPathRepo();
    const longRefSegment = "x".repeat(180);
    const longRef = [
      longRefSegment,
      longRefSegment,
      longRefSegment,
      longRefSegment,
    ].join("/");
    git(repoDir, `checkout -b ${longRef}`);
    const isolated = createIsolatedServer({
      projectRoot: repoDir,
      graftDir: path.join(repoDir, ".graft"),
    });
    cleanups.push(() => {
      isolated.cleanup();
    });

    for (let index = 1; index <= 3; index += 1) {
      fs.writeFileSync(
        path.join(repoDir, "app.ts"),
        `export const value = ${String(index)};\n`,
      );
      await isolated.server.callTool("safe_read", { path: "app.ts" });
    }

    const summaryResult = await isolated.server.callTool("activity_view", { limit: 2 });
    const summary = parse(summaryResult);
    const summaryWindow = summary["activityWindow"] as {
      returned: number;
      totalMatchingItems: number;
      truncated: boolean;
      itemDetailAvailable: boolean;
      groups: { groupKind: string; count: number; summary: string }[];
    };

    expect(Buffer.byteLength(textOf(summaryResult), "utf8")).toBeLessThan(2_048);
    expect(summary["_receipt"]).toMatchObject({ mode: "compact" });
    expect(summary["truthClass"]).toBe("artifact_history");
    expect(summary["anchor"]).toEqual(expect.objectContaining({
      posture: "head_commit",
      headRef: expect.stringContaining("…"),
      headRefTruncated: true,
    }));
    expect(summary).not.toHaveProperty("activeCausalWorkspace");
    expect(containsKey(summary, "items")).toBe(false);
    expect(summaryWindow.returned).toBe(2);
    expect(summaryWindow.totalMatchingItems).toBeGreaterThan(2);
    expect(summaryWindow.truncated).toBe(true);
    expect(summaryWindow.itemDetailAvailable).toBe(true);
    expect(summaryWindow.groups.reduce((total, group) => total + group.count, 0)).toBe(
      summaryWindow.returned,
    );
    expect(summaryWindow.groups).toEqual(expect.arrayContaining([
      expect.objectContaining({
        groupKind: "read",
        summary: expect.stringContaining("reads across"),
      }),
    ]));
    expect(() => MCP_OUTPUT_SCHEMAS.activity_view.parse(summary)).not.toThrow();

    const summaryWithOversizedUtf8 = structuredClone(summary);
    const summaryGroups = (summaryWithOversizedUtf8["activityWindow"] as {
      groups: { summary: string }[];
    }).groups;
    expect(summaryGroups.length).toBeGreaterThan(0);
    summaryGroups[0]!.summary = "😀".repeat(60);
    expect(() => MCP_OUTPUT_SCHEMAS.activity_view.parse(summaryWithOversizedUtf8)).toThrow(
      ZodError,
    );

    const full = parse(await isolated.server.callTool("activity_view", {
      detail: "full",
      limit: 2,
    }));
    const fullWindow = full["activityWindow"] as {
      returned: number;
      totalMatchingItems: number;
      truncated: boolean;
      groups: { items: Record<string, unknown>[] }[];
    };
    expect(full["activeCausalWorkspace"]).toBeDefined();
    expect((full["anchor"] as { headRef: string }).headRef.length).toBeGreaterThan(64);
    expect(full["anchor"]).not.toHaveProperty("headRefTruncated");
    expect(containsKey(full, "items")).toBe(true);
    expect(fullWindow.returned).toBe(summaryWindow.returned);
    expect(fullWindow.totalMatchingItems).toBe(summaryWindow.totalMatchingItems);
    expect(fullWindow.truncated).toBe(summaryWindow.truncated);
    expect(() => MCP_OUTPUT_SCHEMAS.activity_view.parse(full)).not.toThrow();

    const summaryWithActiveWorkspace = {
      ...summary,
      activeCausalWorkspace: full["activeCausalWorkspace"],
    };
    expect(() => MCP_OUTPUT_SCHEMAS.activity_view.parse(summaryWithActiveWorkspace)).toThrow(
      ZodError,
    );

    const fullMissingGroupItems = structuredClone(full);
    const groups = (fullMissingGroupItems["activityWindow"] as {
      groups: Record<string, unknown>[];
    }).groups;
    expect(groups.length).toBeGreaterThan(0);
    delete groups[0]!["items"];
    expect(() => MCP_OUTPUT_SCHEMAS.activity_view.parse(fullMissingGroupItems)).toThrow(
      ZodError,
    );

  });

  it("bounds a four-kind activity summary including a late-session tripwire", {
    timeout: 20_000,
  }, async () => {
    const repoDir = createLongPathRepo();
    const longRefSegment = "x".repeat(180);
    const longRef = [
      longRefSegment,
      longRefSegment,
      longRefSegment,
      longRefSegment,
    ].join("/");
    git(repoDir, `checkout -b ${longRef}`);
    const isolated = createIsolatedServer({
      projectRoot: repoDir,
      graftDir: path.join(repoDir, ".graft"),
    });
    cleanups.push(() => {
      isolated.cleanup();
    });

    git(repoDir, "checkout -b aggregate-bound");
    await isolated.server.callTool("doctor", { detail: "full" });
    git(repoDir, `checkout ${longRef}`);
    await isolated.server.callTool("doctor", { detail: "full" });
    await isolated.server.callTool("safe_read", { path: "app.ts" });
    fs.writeFileSync(path.join(repoDir, "staged.ts"), "export const staged = true;\n");
    git(repoDir, "add staged.ts");
    await isolated.server.callTool("doctor", { detail: "full" });
    isolated.server.injectSessionMessages(501);
    isolated.server.injectSessionToolCalls([
      ...Array.from({ length: 81 }, () => "injected"),
      ...Array.from({ length: 31 }, () => ["Edit", "Bash"]).flat(),
    ]);

    const result = await isolated.server.callTool("activity_view", { limit: 50 });
    const parsed = parse(result);
    const groups = (parsed["activityWindow"] as {
      groups: { groupKind: string }[];
    }).groups;
    expect(groups.map((group) => group.groupKind)).toEqual([
      "transition",
      "stage",
      "continuity",
      "read",
    ]);
    expect(parsed["tripwire"]).toEqual(expect.arrayContaining([
      expect.objectContaining({ signal: "SESSION_LONG" }),
      expect.objectContaining({ signal: "EDIT_BASH_LOOP" }),
      expect.objectContaining({ signal: "RUNAWAY_TOOLS" }),
    ]));
    expect(Buffer.byteLength(textOf(result), "utf8")).toBeLessThan(2_048);
  });

  it("rejects unsupported diagnostic detail policies", async () => {
    const repoDir = createLongPathRepo();
    const isolated = createIsolatedServer({
      projectRoot: repoDir,
      graftDir: path.join(repoDir, ".graft"),
    });
    cleanups.push(() => {
      isolated.cleanup();
    });

    await expect(
      isolated.server.callTool("doctor", { detail: "everything" }),
    ).rejects.toBeInstanceOf(ZodError);
    await expect(
      isolated.server.callTool("activity_view", { detail: "everything" }),
    ).rejects.toBeInstanceOf(ZodError);
  });
});
