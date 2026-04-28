import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { MCP_TOOL_NAMES } from "../../src/contracts/output-schemas.js";
import { TOOL_REGISTRY } from "../../src/mcp/server.js";
import { cleanupTestRepo, createTestRepo } from "../../test/helpers/git.js";
import { createServerInRepo, parse } from "../../test/helpers/mcp.js";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const graftEditSourcePath = path.join(repoRoot, "src", "mcp", "tools", "graft-edit.ts");
const unitTestSourcePath = path.join(repoRoot, "test", "unit", "mcp", "graft-edit.test.ts");

function readRepoSource(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf-8");
}

function writeFile(repoDir: string, relativePath: string, content: string): void {
  const filePath = path.join(repoDir, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function readFile(repoDir: string, relativePath: string): string {
  return fs.readFileSync(path.join(repoDir, relativePath), "utf-8");
}

async function graftEdit(repoDir: string, args: Record<string, unknown>): Promise<Record<string, unknown>> {
  return parse(await createServerInRepo(repoDir).callTool("graft_edit", args));
}

function createPlaybackRepo(prefix = "graft-edit-playback-"): string {
  return createTestRepo(prefix);
}

function expectTempRepo(repoDir: string): void {
  const realRepo = fs.realpathSync.native(repoDir);
  const realTmp = fs.realpathSync.native(os.tmpdir());
  const realLive = fs.realpathSync.native(repoRoot);
  expect(realRepo === realTmp || realRepo.startsWith(`${realTmp}${path.sep}`)).toBe(true);
  expect(realRepo === realLive || realRepo.startsWith(`${realLive}${path.sep}`)).toBe(false);
}

describe("SURFACE_agent-dx-governed-edit playback", () => {
  it("Can I call `graft_edit` with `path`, `old_string`, and `new_string` without using native `Read` first?", async () => {
    const repoDir = createPlaybackRepo("graft-edit-playback-call-");
    try {
      expectTempRepo(repoDir);
      writeFile(repoDir, "src/app.ts", "export const value = 'old';\n");

      const result = await graftEdit(repoDir, {
        path: "src/app.ts",
        old_string: "'old'",
        new_string: "'new'",
      });

      expect(result).toMatchObject({
        path: path.join(repoDir, "src/app.ts"),
        operation: "replace",
        status: "edited",
        changed: true,
        matches: 1,
        replacements: 1,
      });
      expect(readFile(repoDir, "src/app.ts")).toBe("export const value = 'new';\n");
    } finally {
      cleanupTestRepo(repoDir);
    }
  });

  it("Does the tool perform exactly one edit when the old string is present once?", async () => {
    const repoDir = createPlaybackRepo("graft-edit-playback-single-");
    try {
      expectTempRepo(repoDir);
      writeFile(repoDir, "src/app.ts", [
        "export const first = 'target';",
        "export const second = 'other';",
        "",
      ].join("\n"));

      const result = await graftEdit(repoDir, {
        path: "src/app.ts",
        old_string: "first = 'target'",
        new_string: "first = 'updated'",
      });

      expect(result).toMatchObject({ status: "edited", matches: 1, replacements: 1 });
      expect(readFile(repoDir, "src/app.ts")).toContain("first = 'updated'");
      expect(readFile(repoDir, "src/app.ts")).toContain("second = 'other'");
    } finally {
      cleanupTestRepo(repoDir);
    }
  });

  it("Does it refuse missing and ambiguous old strings with clear messages?", async () => {
    const repoDir = createPlaybackRepo("graft-edit-playback-refusals-");
    try {
      expectTempRepo(repoDir);
      writeFile(repoDir, "src/app.ts", [
        "export const first = 'same';",
        "export const second = 'same';",
        "",
      ].join("\n"));

      const missing = await graftEdit(repoDir, {
        path: "src/app.ts",
        old_string: "not present",
        new_string: "replacement",
      });
      expect(missing).toMatchObject({
        status: "refused",
        reason: "OLD_STRING_NOT_FOUND",
        changed: false,
        matches: 0,
        replacements: 0,
      });

      const ambiguous = await graftEdit(repoDir, {
        path: "src/app.ts",
        old_string: "'same'",
        new_string: "'changed'",
      });
      expect(ambiguous).toMatchObject({
        status: "refused",
        reason: "OLD_STRING_AMBIGUOUS",
        changed: false,
        matches: 2,
        replacements: 0,
      });
      expect(readFile(repoDir, "src/app.ts")).toContain("first = 'same'");
      expect(readFile(repoDir, "src/app.ts")).toContain("second = 'same'");
    } finally {
      cleanupTestRepo(repoDir);
    }
  });

  it("Does it refuse outside-repo, ignored, generated, lockfile, binary, minified, build-output, and likely-secret paths?", async () => {
    const repoDir = createPlaybackRepo("graft-edit-playback-policy-");
    const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-edit-playback-outside-"));
    try {
      expectTempRepo(repoDir);
      fs.writeFileSync(path.join(repoDir, ".graftignore"), "generated/**\n");
      writeFile(repoDir, "generated/secret.ts", "export const generated = true;\n");
      writeFile(repoDir, "pnpm-lock.yaml", "lockfileVersion: '9.0'\n");
      writeFile(repoDir, "image.png", "not really an image\n");
      writeFile(repoDir, "src/app.min.js", "function x(){return true}\n");
      writeFile(repoDir, "dist/app.ts", "export const built = true;\n");
      writeFile(repoDir, ".env", "TOKEN=secret\n");
      fs.writeFileSync(path.join(outsideDir, "outside.ts"), "export const outside = true;\n");

      await expect(
        createServerInRepo(repoDir).callTool("graft_edit", {
          path: path.join(outsideDir, "outside.ts"),
          old_string: "outside = true",
          new_string: "outside = false",
        }),
      ).rejects.toThrow(/Path traversal blocked|outside/i);

      const cases: Array<{ path: string; reason: string }> = [
        { path: "generated/secret.ts", reason: "GRAFTIGNORE" },
        { path: "pnpm-lock.yaml", reason: "LOCKFILE" },
        { path: "image.png", reason: "BINARY" },
        { path: "src/app.min.js", reason: "MINIFIED" },
        { path: "dist/app.ts", reason: "BUILD_OUTPUT" },
        { path: ".env", reason: "SECRET" },
      ];

      for (const item of cases) {
        const result = await graftEdit(repoDir, {
          path: item.path,
          old_string: "true",
          new_string: "false",
        });
        expect(result).toMatchObject({
          status: "refused",
          reason: item.reason,
          changed: false,
          replacements: 0,
        });
      }
    } finally {
      cleanupTestRepo(repoDir);
      fs.rmSync(outsideDir, { recursive: true, force: true });
    }
  });

  it("Does the output make the edit result obvious without pretending the full governed write surface exists?", async () => {
    const repoDir = createPlaybackRepo("graft-edit-playback-output-");
    try {
      expectTempRepo(repoDir);
      writeFile(repoDir, "src/app.ts", "export const value = 'old';\n");

      const result = await graftEdit(repoDir, {
        path: "src/app.ts",
        old_string: "'old'",
        new_string: "'new'",
      });

      expect(result).toMatchObject({
        operation: "replace",
        projection: "edited",
        status: "edited",
        changed: true,
        matches: 1,
        replacements: 1,
      });
      expect(result).not.toHaveProperty("provenance");
      expect(result).not.toHaveProperty("causalWriteEvent");
      expect(result).not.toHaveProperty("readRangeEvidence");
      expect(result).not.toHaveProperty("writePolicy");
    } finally {
      cleanupTestRepo(repoDir);
    }
  });

  it("Does `graft_edit` use `ctx.resolvePath` or the equivalent shared repo path resolver rather than direct path math?", () => {
    const source = fs.readFileSync(graftEditSourcePath, "utf-8");

    expect(source).toContain("ctx.resolvePath");
    expect(source).not.toContain("path.resolve");
    expect(source).not.toContain("process.cwd");
  });

  it("Does it route all filesystem reads and writes through the filesystem port?", () => {
    const source = fs.readFileSync(graftEditSourcePath, "utf-8");

    expect(source).toContain("ctx.fs.readFile");
    expect(source).toContain("ctx.fs.writeFile");
    expect(source).toContain("ctx.fs.stat");
    expect(source).not.toMatch(/from\s+["']node:fs["']|from\s+["']fs["']|require\(["']fs["']\)/);
    expect(source).not.toMatch(/\bBuffer\b/);
  });

  it("Does it reuse existing policy/refusal semantics where they are currently applicable?", () => {
    const source = fs.readFileSync(graftEditSourcePath, "utf-8");

    expect(source).toContain("evaluateMcpPolicy");
    expect(source).toContain("RefusedResult");
    expect(source).toContain("policy.reason");
    expect(source).toContain("policy.reasonDetail");
    expect(source).not.toContain("GRAFT_EDIT_POLICY");
  });

  it("Are `MCP_TOOL_NAMES`, tool registry, burden accounting, and MCP output schemas updated together?", () => {
    const toolNames = TOOL_REGISTRY.map((tool) => tool.name);
    const burdenSource = readRepoSource("src/mcp/burden.ts");
    const schemaSource = readRepoSource("src/contracts/output-schemas.ts");

    expect(MCP_TOOL_NAMES).toContain("graft_edit");
    expect(toolNames).toContain("graft_edit");
    expect(burdenSource).toContain("graft_edit: \"state\"");
    expect(schemaSource).toContain("graft_edit: withMcpCommon");
  });

  it("Are model/handler tests deterministic and temp-repo-only?", async () => {
    const repoDir = createPlaybackRepo("graft-edit-playback-temp-");
    try {
      expectTempRepo(repoDir);
      writeFile(repoDir, "src/app.ts", "export const value = 'old';\n");

      const result = await graftEdit(repoDir, {
        path: "src/app.ts",
        old_string: "'old'",
        new_string: "'new'",
      });

      expect(result).toMatchObject({
        path: path.join(repoDir, "src/app.ts"),
        operation: "replace",
        status: "edited",
        changed: true,
        matches: 1,
        replacements: 1,
      });
      expect(readFile(repoDir, "src/app.ts")).toBe("export const value = 'new';\n");
    } finally {
      cleanupTestRepo(repoDir);
    }
  });

  it("Does playback avoid using the live checkout as subject data?", () => {
    const playbackSource = fs.readFileSync(import.meta.filename, "utf-8");
    const unitSource = fs.readFileSync(unitTestSourcePath, "utf-8");
    const forbiddenLiveSubjectCall = ["createServerInRepo", "process.cwd"].join("(");

    expect(playbackSource).toContain("createTestRepo");
    expect(unitSource).toContain("createTestRepo");
    expect(playbackSource).not.toContain(forbiddenLiveSubjectCall);
    expect(unitSource).not.toContain(forbiddenLiveSubjectCall);
  });

  it("keeps observability limited to the existing completion footprint and does not claim provenance", async () => {
    const repoDir = createPlaybackRepo("graft-edit-playback-footprint-");
    try {
      expectTempRepo(repoDir);
      writeFile(repoDir, "src/app.ts", "export const value = 'old';\n");

      const result = await graftEdit(repoDir, {
        path: "src/app.ts",
        old_string: "'old'",
        new_string: "'new'",
      });
      const receipt = result["_receipt"] as { traceId: string };
      const runtimeLog = fs.readFileSync(path.join(repoDir, ".graft", "logs", "mcp-runtime.ndjson"), "utf-8");
      const events = runtimeLog.trim().split("\n").map((line) => JSON.parse(line) as {
        event: string;
        tool?: string;
        traceId?: string;
        footprint?: { paths?: string[] };
        provenance?: unknown;
        causalWriteEvent?: unknown;
      });
      const completed = events.find((event) =>
        event.event === "tool_call_completed" &&
        event.tool === "graft_edit" &&
        event.traceId === receipt.traceId
      );

      expect(completed?.footprint?.paths).toEqual([path.join(repoDir, "src/app.ts")]);
      expect(completed).not.toHaveProperty("provenance");
      expect(completed).not.toHaveProperty("causalWriteEvent");
    } finally {
      cleanupTestRepo(repoDir);
    }
  });
});
