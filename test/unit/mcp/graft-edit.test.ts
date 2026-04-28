import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { ALL_TOOL_REGISTRY, TOOL_REGISTRY } from "../../../src/mcp/server.js";
import { MCP_OUTPUT_SCHEMAS } from "../../../src/contracts/output-schemas.js";
import type { ToolDefinition } from "../../../src/mcp/context.js";
import { createTestRepo } from "../../helpers/git.js";
import { createServerInRepo, parse } from "../../helpers/mcp.js";

const cleanups: string[] = [];

afterEach(() => {
  while (cleanups.length > 0) {
    const target = cleanups.pop()!;
    fs.rmSync(target, { recursive: true, force: true });
  }
});

function createRepo(files: Record<string, string>, graftignore?: string): string {
  const repoDir = createTestRepo("graft-edit-");
  cleanups.push(repoDir);
  if (graftignore !== undefined) {
    fs.writeFileSync(path.join(repoDir, ".graftignore"), graftignore);
  }
  for (const [relativePath, content] of Object.entries(files)) {
    const absolutePath = path.join(repoDir, relativePath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, content);
  }
  return repoDir;
}

function readRepoFile(repoDir: string, relativePath: string): string {
  return fs.readFileSync(path.join(repoDir, relativePath), "utf-8");
}

function graftEditDefinition(): ToolDefinition {
  const tool = ALL_TOOL_REGISTRY.find((candidate) => candidate.name === "graft_edit");
  expect(tool, "graft_edit should be registered as an MCP tool").toBeDefined();
  return tool!;
}

async function callGraftEdit(
  repoDir: string,
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const server = createServerInRepo(repoDir);
  return parse(await server.callTool("graft_edit", args));
}

interface RuntimeEvent {
  readonly event: string;
  readonly traceId?: string;
  readonly tool?: string;
  readonly footprint?: {
    readonly paths?: readonly string[];
  };
}

function readRuntimeLog(repoDir: string): RuntimeEvent[] {
  const logPath = path.join(repoDir, ".graft", "logs", "mcp-runtime.ndjson");
  return fs.readFileSync(logPath, "utf-8")
    .trim()
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as RuntimeEvent);
}

describe("mcp: graft_edit RED contract", () => {
  it("registers graft_edit in the MCP tool registry", () => {
    expect(TOOL_REGISTRY.map((tool) => tool.name)).toContain("graft_edit");
    expect(ALL_TOOL_REGISTRY.map((tool) => tool.name)).toContain("graft_edit");
  });

  it("accepts path, old_string, and new_string as strict input", () => {
    const tool = graftEditDefinition();
    expect(tool.schema).toBeDefined();
    const inputSchema = z.object(tool.schema!).strict();

    expect(() =>
      inputSchema.parse({
        path: "src/app.ts",
        old_string: "hello",
        new_string: "goodbye",
      })
    ).not.toThrow();

    expect(() =>
      inputSchema.parse({
        path: "src/app.ts",
        old_string: "hello",
      })
    ).toThrow();

    expect(() =>
      inputSchema.parse({
        path: "src/app.ts",
        old_string: "hello",
        new_string: "goodbye",
        extra: true,
      })
    ).toThrow();
  });

  it("succeeds only on an exact single old_string match", async () => {
    const repoDir = createRepo({
      "src/app.ts": "export const greeting = 'hello';\n",
    });

    const result = await callGraftEdit(repoDir, {
      path: "src/app.ts",
      old_string: "greeting = 'hello'",
      new_string: "greeting = 'goodbye'",
    });

    expect(result).toMatchObject({
      path: path.join(repoDir, "src/app.ts"),
      operation: "replace",
      status: "edited",
      changed: true,
      matches: 1,
      replacements: 1,
    });
    expect(readRepoFile(repoDir, "src/app.ts")).toBe("export const greeting = 'goodbye';\n");
  });

  it("refuses a missing old_string without changing the file", async () => {
    const repoDir = createRepo({
      "src/app.ts": "export const greeting = 'hello';\n",
    });

    const result = await callGraftEdit(repoDir, {
      path: "src/app.ts",
      old_string: "does not exist",
      new_string: "replacement",
    });

    expect(result).toMatchObject({
      path: path.join(repoDir, "src/app.ts"),
      operation: "replace",
      status: "refused",
      reason: "OLD_STRING_NOT_FOUND",
      changed: false,
      matches: 0,
      replacements: 0,
    });
    expect(readRepoFile(repoDir, "src/app.ts")).toBe("export const greeting = 'hello';\n");
  });

  it("refuses an ambiguous old_string without changing the file", async () => {
    const repoDir = createRepo({
      "src/app.ts": [
        "export const first = 'same';",
        "export const second = 'same';",
        "",
      ].join("\n"),
    });

    const result = await callGraftEdit(repoDir, {
      path: "src/app.ts",
      old_string: "'same'",
      new_string: "'changed'",
    });

    expect(result).toMatchObject({
      path: path.join(repoDir, "src/app.ts"),
      operation: "replace",
      status: "refused",
      reason: "OLD_STRING_AMBIGUOUS",
      changed: false,
      matches: 2,
      replacements: 0,
    });
    expect(readRepoFile(repoDir, "src/app.ts")).toContain("first = 'same'");
    expect(readRepoFile(repoDir, "src/app.ts")).toContain("second = 'same'");
  });

  it("refuses an outside-repo path before writing", async () => {
    const repoDir = createRepo({
      "src/app.ts": "export const inside = true;\n",
    });
    const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-edit-outside-"));
    cleanups.push(outsideDir);
    const outsideFile = path.join(outsideDir, "outside.ts");
    fs.writeFileSync(outsideFile, "export const outside = true;\n");

    const server = createServerInRepo(repoDir);
    await expect(
      server.callTool("graft_edit", {
        path: outsideFile,
        old_string: "outside = true",
        new_string: "outside = false",
      }),
    ).rejects.toThrow(/Path traversal blocked|outside/i);

    expect(fs.readFileSync(outsideFile, "utf-8")).toBe("export const outside = true;\n");
  });

  it("refuses .graftignore and policy-denied paths without changing files", async () => {
    const repoDir = createRepo(
      {
        "generated/secret.ts": "export const generated = true;\n",
        "pnpm-lock.yaml": "lockfileVersion: '9.0'\n",
      },
      "generated/**\n",
    );

    const ignored = await callGraftEdit(repoDir, {
      path: "generated/secret.ts",
      old_string: "generated = true",
      new_string: "generated = false",
    });
    expect(ignored).toMatchObject({
      path: path.join(repoDir, "generated", "secret.ts"),
      operation: "replace",
      status: "refused",
      reason: "GRAFTIGNORE",
      changed: false,
      replacements: 0,
    });

    const lockfile = await callGraftEdit(repoDir, {
      path: "pnpm-lock.yaml",
      old_string: "lockfileVersion: '9.0'",
      new_string: "lockfileVersion: '10.0'",
    });
    expect(lockfile).toMatchObject({
      path: path.join(repoDir, "pnpm-lock.yaml"),
      operation: "replace",
      status: "refused",
      reason: "LOCKFILE",
      changed: false,
      replacements: 0,
    });

    expect(readRepoFile(repoDir, "generated/secret.ts")).toBe("export const generated = true;\n");
    expect(readRepoFile(repoDir, "pnpm-lock.yaml")).toBe("lockfileVersion: '9.0'\n");
  });

  it("does not create new files", async () => {
    const repoDir = createRepo({
      "src/app.ts": "export const existing = true;\n",
    });
    const newFile = path.join(repoDir, "src", "new-file.ts");

    const result = await callGraftEdit(repoDir, {
      path: "src/new-file.ts",
      old_string: "",
      new_string: "export const created = true;\n",
    });

    expect(result).toMatchObject({
      path: newFile,
      operation: "replace",
      status: "refused",
      reason: "NOT_FOUND",
      changed: false,
      matches: 0,
      replacements: 0,
    });
    expect(fs.existsSync(newFile)).toBe(false);
  });

  it("declares a deterministic output schema for graft_edit", () => {
    const schemas = MCP_OUTPUT_SCHEMAS as unknown as Record<string, unknown>;
    expect(schemas["graft_edit"]).toBeDefined();
  });

  it("keeps graft_edit filesystem access behind the filesystem port", () => {
    const sourcePath = path.join(process.cwd(), "src", "mcp", "tools", "graft-edit.ts");
    expect(fs.existsSync(sourcePath)).toBe(true);
    const source = fs.readFileSync(sourcePath, "utf-8");

    expect(source).not.toMatch(/from\s+["']node:fs["']|from\s+["']fs["']|require\(["']fs["']\)/);
    expect(source).toMatch(/\bctx\.fs\.(readFile|writeFile)\b/);
  });

  it("records the edited path in the existing runtime observability footprint", async () => {
    const repoDir = createRepo({
      "src/app.ts": "export const greeting = 'hello';\n",
    });

    const result = await callGraftEdit(repoDir, {
      path: "src/app.ts",
      old_string: "hello",
      new_string: "goodbye",
    });
    const receipt = result["_receipt"] as { traceId: string };
    const events = readRuntimeLog(repoDir);
    const completed = events.find((event) =>
      event.event === "tool_call_completed" &&
      event.tool === "graft_edit" &&
      event.traceId === receipt.traceId
    );

    expect(completed?.footprint?.paths).toEqual([path.join(repoDir, "src/app.ts")]);
  });
});
