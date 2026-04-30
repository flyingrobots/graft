import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { MCP_OUTPUT_SCHEMAS } from "../../src/contracts/output-schemas.js";
import { cleanupTestRepo, createTestRepo } from "../../test/helpers/git.js";
import { createServerInRepo, parse } from "../../test/helpers/mcp.js";

const cleanups: string[] = [];

afterEach(() => {
  while (cleanups.length > 0) {
    cleanupTestRepo(cleanups.pop()!);
  }
});

function createRepo(files: Record<string, string>): string {
  const repoDir = createTestRepo("governed-write-tools-playback-");
  cleanups.push(repoDir);
  for (const [relativePath, content] of Object.entries(files)) {
    const absolutePath = path.join(repoDir, relativePath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, content);
  }
  return repoDir;
}

function readRuntimeEvents(repoDir: string): Record<string, unknown>[] {
  const logPath = path.join(repoDir, ".graft", "logs", "mcp-runtime.ndjson");
  return fs.readFileSync(logPath, "utf-8")
    .trim()
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf-8");
}

describe("SURFACE_governed-write-tools scope playback", () => {
  it("Is the shipped `graft_edit` exact-replacement tool enough to call the minimal governed-write aperture real for v0.7.0?", async () => {
    const repoDir = createRepo({
      "src/app.ts": "export const value = 'old';\n",
    });
    const server = createServerInRepo(repoDir);

    const result = parse(await server.callTool("graft_edit", {
      path: "src/app.ts",
      old_string: "'old'",
      new_string: "'new'",
    }));

    expect(result).toMatchObject({
      operation: "replace",
      projection: "edited",
      status: "edited",
      changed: true,
      matches: 1,
      replacements: 1,
    });
    expect(fs.readFileSync(path.join(repoDir, "src/app.ts"), "utf-8")).toBe("export const value = 'new';\n");
  });

  it("Does the scope check avoid pretending completion footprints are causal write provenance?", async () => {
    const repoDir = createRepo({
      "src/app.ts": "export const value = 'old';\n",
    });
    const server = createServerInRepo(repoDir);

    const result = parse(await server.callTool("graft_edit", {
      path: "src/app.ts",
      old_string: "'old'",
      new_string: "'new'",
    }));
    const receipt = result["_receipt"] as { traceId: string };
    const completed = readRuntimeEvents(repoDir).find((event) =>
      event["event"] === "tool_call_completed" &&
      event["tool"] === "graft_edit" &&
      event["traceId"] === receipt.traceId
    );

    expect(completed?.["footprint"]).toMatchObject({
      paths: [path.join(repoDir, "src/app.ts")],
    });
    expect(result).not.toHaveProperty("provenance");
    expect(result).not.toHaveProperty("causalWriteEvent");
    expect(result).not.toHaveProperty("writeEvent");
  });

  it("Are read-range receipts correctly classified as insufficient for edit attestation without a fresh evidence contract?", async () => {
    const repoDir = createRepo({
      "src/app.ts": [
        "export const first = 'one';",
        "export const second = 'two';",
        "",
      ].join("\n"),
    });
    const server = createServerInRepo(repoDir);

    const result = parse(await server.callTool("read_range", {
      path: "src/app.ts",
      start: 1,
      end: 2,
    }));
    const receipt = result["_receipt"] as Record<string, unknown>;

    expect(receipt).toMatchObject({
      tool: "read_range",
      projection: "none",
    });
    expect(result).not.toHaveProperty("attestation");
    expect(result).not.toHaveProperty("contentHash");
    expect(result).not.toHaveProperty("freshnessToken");
    expect(result).not.toHaveProperty("verifiesEdit");
  });

  it("Is the full governed write system split into smaller follow-up cards instead of implemented blindly?", () => {
    const design = readSource("docs/releases/v0.7.0/design/SURFACE_governed-write-tools.md");

    expect(design).toContain("scope_verdict: \"defer-full-card-and-split\"");
    expect(design).toContain("CORE_read-range-evidence-attestation-for-graft-edit");
    expect(design).toContain("CORE_causal-write-events-for-graft-edit");
    expect(design).toContain("CORE_write-policy-model-for-governed-edits");
    expect(design).toContain("SURFACE_governed-write-tools-full-surface");
  });

  it("Does `graft_edit` stay exact-replacement only?", () => {
    const source = readSource("src/mcp/tools/graft-edit.ts");

    expect(source).toContain('operation: "replace"');
    expect(source).toContain("content.replace(oldString, newString)");
    expect(source).not.toMatch(/\bappendFile\b/);
    expect(source).not.toMatch(/\bunlink\b/);
    expect(source).not.toMatch(/\brename\b/);
    expect(source).not.toMatch(/\bchmod\b/);
  });

  it("Does `graft_edit` output schema include deterministic edited/refused fields and optional advisory drift warnings, but no write provenance?", () => {
    const valid = {
      path: "/tmp/repo/src/app.ts",
      operation: "replace",
      projection: "edited",
      status: "edited",
      changed: true,
      matches: 1,
      replacements: 1,
      driftWarnings: [{
        kind: "structural_pattern_reintroduced",
        severity: "advisory",
        pattern: "jsdoc_typedef",
        basis: "session_local_graft_edit",
        message: "You are adding a typedef in a session that has been removing typedefs.",
        current: {
          path: "/tmp/repo/src/next.ts",
          direction: "added",
        },
        previous: {
          path: "/tmp/repo/src/old.ts",
          direction: "removed",
        },
      }],
      _schema: { id: "graft.mcp.graft_edit", version: "1.0.0" },
      _receipt: {
        sessionId: "session",
        traceId: "trace",
        seq: 1,
        ts: "2026-04-29T00:00:00.000Z",
        tool: "graft_edit",
        projection: "edited",
        reason: "none",
        latencyMs: 0,
        fileBytes: 12,
        returnedBytes: 1,
        burden: { kind: "state", nonRead: true },
        cumulative: {
          reads: 0,
          outlines: 0,
          refusals: 0,
          cacheHits: 0,
          bytesReturned: 1,
          bytesAvoided: 0,
          nonReadBytesReturned: 1,
          burdenByKind: {
            read: { calls: 0, bytesReturned: 0 },
            search: { calls: 0, bytesReturned: 0 },
            shell: { calls: 0, bytesReturned: 0 },
            state: { calls: 1, bytesReturned: 1 },
            diagnostic: { calls: 0, bytesReturned: 0 },
          },
        },
      },
    };

    expect(() => MCP_OUTPUT_SCHEMAS.graft_edit.parse(valid)).not.toThrow();
    expect(() =>
      MCP_OUTPUT_SCHEMAS.graft_edit.parse({
        ...valid,
        causalWriteEvent: { eventKind: "write" },
      })
    ).toThrow();
  });

  it("Does runtime observability remain metadata-only with completion footprint rather than causal write events?", () => {
    const source = readSource("src/mcp/runtime-observability.ts");

    expect(source).toContain('export type RuntimeLogPolicy = "metadata_only"');
    expect(source).toContain("readonly footprint?: ToolCallFootprint");
    expect(source).not.toContain("causalWriteEvent");
    expect(source).not.toContain("old_string");
    expect(source).not.toContain("new_string");
  });

  it("Does persisted local history currently omit write events from stored activity?", () => {
    const source = readSource("src/mcp/persisted-local-history.ts");

    expect(source).toContain("readEvents: z.array(readEventSchema)");
    expect(source).toContain("stageEvents: z.array(stageEventSchema)");
    expect(source).toContain("transitionEvents: z.array(transitionEventSchema)");
    expect(source).not.toContain("writeEvents: z.array(writeEventSchema)");
    expect(source).not.toContain("noteWriteObservation");
  });

  it("Does `read_range` provide receipts and read observations without a verification API suitable for edit attestation?", () => {
    const readRange = readSource("src/mcp/tools/read-range.ts");
    const observation = readSource("src/mcp/workspace-read-observation.ts");

    expect(readRange).toContain('return ctx.respond("read_range"');
    expect(observation).toContain('surface: "read_range"');
    expect(observation).toContain("startLine");
    expect(observation).toContain("endLine");
    expect(readRange).not.toContain("verify");
    expect(readRange).not.toContain("attestation");
    expect(observation).not.toContain("contentHash");
  });
});
