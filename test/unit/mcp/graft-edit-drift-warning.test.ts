import { afterEach, describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { MCP_OUTPUT_SCHEMAS } from "../../../src/contracts/output-schemas.js";
import { createTestRepo } from "../../helpers/git.js";
import { createServerInRepo, parse } from "../../helpers/mcp.js";

const cleanups: string[] = [];

const TYPEDEF_BLOCK = [
  "/**",
  " * @typedef {Object} LegacyUser",
  " * @property {string} name",
  " */",
  "",
].join("\n");

afterEach(() => {
  while (cleanups.length > 0) {
    const target = cleanups.pop()!;
    fs.rmSync(target, { recursive: true, force: true });
  }
});

function createRepo(files: Record<string, string>): string {
  const repoDir = createTestRepo("graft-edit-drift-");
  cleanups.push(repoDir);
  for (const [relativePath, content] of Object.entries(files)) {
    const absolutePath = path.join(repoDir, relativePath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, content);
  }
  return repoDir;
}

function driftWarnings(result: Record<string, unknown>): Record<string, unknown>[] {
  const warnings = result["driftWarnings"];
  if (warnings === undefined) {
    return [];
  }
  expect(Array.isArray(warnings)).toBe(true);
  return warnings as Record<string, unknown>[];
}

function requiredDriftWarnings(result: Record<string, unknown>): Record<string, unknown>[] {
  const warnings = driftWarnings(result);
  expect(warnings.length).toBeGreaterThan(0);
  return warnings;
}

async function runTypedefReintroduction() {
  const repoDir = createRepo({
    "src/model.ts": `${TYPEDEF_BLOCK}export const modelReady = true;\n`,
    "src/generated.ts": "export const generatedReady = true;\n",
  });
  const server = createServerInRepo(repoDir);

  const removal = parse(await server.callTool("graft_edit", {
    path: "src/model.ts",
    old_string: TYPEDEF_BLOCK,
    new_string: [
      "export class LegacyUser {",
      "  name = \"\";",
      "}",
      "",
    ].join("\n"),
  }));

  const reintroduction = parse(await server.callTool("graft_edit", {
    path: "src/generated.ts",
    old_string: "export const generatedReady = true;",
    new_string: `${TYPEDEF_BLOCK}export const generatedReady = true;`,
  }));

  return { repoDir, removal, reintroduction };
}

describe("mcp: graft_edit drift warning RED contract", () => {
  it("records enough session-local structural edit observations to warn on a later graft_edit", async () => {
    const { repoDir, removal, reintroduction } = await runTypedefReintroduction();

    expect(removal).toMatchObject({
      status: "edited",
      changed: true,
    });
    const [warning] = requiredDriftWarnings(reintroduction);
    expect(warning).toMatchObject({
      kind: "structural_pattern_reintroduced",
      severity: "advisory",
      pattern: "jsdoc_typedef",
      basis: "session_local_graft_edit",
      current: {
        path: path.join(repoDir, "src", "generated.ts"),
        direction: "added",
      },
      previous: {
        path: path.join(repoDir, "src", "model.ts"),
        direction: "removed",
      },
    });
  });

  it("emits an advisory drift diagnostic without refusing the reintroducing edit", async () => {
    const { reintroduction } = await runTypedefReintroduction();

    expect(reintroduction).toMatchObject({
      operation: "replace",
      projection: "edited",
      status: "edited",
      changed: true,
      matches: 1,
      replacements: 1,
    });
    const [warning] = requiredDriftWarnings(reintroduction);
    expect(warning).toMatchObject({
      severity: "advisory",
      pattern: "jsdoc_typedef",
    });
    expect(warning?.["message"]).toEqual(expect.stringContaining("typedef"));
    expect(reintroduction).not.toHaveProperty("reason");
  });

  it("allows the graft_edit output schema to validate advisory drift warnings", async () => {
    const { repoDir, reintroduction } = await runTypedefReintroduction();
    const futureOutput = {
      ...reintroduction,
      driftWarnings: [{
        kind: "structural_pattern_reintroduced",
        severity: "advisory",
        pattern: "jsdoc_typedef",
        basis: "session_local_graft_edit",
        message: "You are adding a typedef in a session that has been removing typedefs.",
        current: {
          path: path.join(repoDir, "src", "generated.ts"),
          direction: "added",
        },
        previous: {
          path: path.join(repoDir, "src", "model.ts"),
          direction: "removed",
        },
      }],
    };

    expect(() => MCP_OUTPUT_SCHEMAS.graft_edit.parse(futureOutput)).not.toThrow();
  });

  it("emits no warning when the edit structure cannot be classified", async () => {
    const repoDir = createRepo({
      "src/app.ts": [
        "export const first = \"alpha\";",
        "export const second = \"gamma\";",
        "",
      ].join("\n"),
    });
    const server = createServerInRepo(repoDir);

    await server.callTool("graft_edit", {
      path: "src/app.ts",
      old_string: "alpha",
      new_string: "beta",
    });
    const result = parse(await server.callTool("graft_edit", {
      path: "src/app.ts",
      old_string: "gamma",
      new_string: "delta",
    }));

    expect(result).toMatchObject({
      status: "edited",
      changed: true,
    });
    expect(driftWarnings(result)).toEqual([]);
  });

  it("does not emit drift warnings across separate MCP sessions", async () => {
    const repoDir = createRepo({
      "src/model.ts": `${TYPEDEF_BLOCK}export const modelReady = true;\n`,
      "src/generated.ts": "export const generatedReady = true;\n",
    });
    const firstSession = createServerInRepo(repoDir);
    const secondSession = createServerInRepo(repoDir);

    await firstSession.callTool("graft_edit", {
      path: "src/model.ts",
      old_string: TYPEDEF_BLOCK,
      new_string: [
        "export class LegacyUser {",
        "  name = \"\";",
        "}",
        "",
      ].join("\n"),
    });
    const result = parse(await secondSession.callTool("graft_edit", {
      path: "src/generated.ts",
      old_string: "export const generatedReady = true;",
      new_string: `${TYPEDEF_BLOCK}export const generatedReady = true;`,
    }));

    expect(result).toMatchObject({
      status: "edited",
      changed: true,
    });
    expect(driftWarnings(result)).toEqual([]);
  });

  it("does not claim causal write provenance for the advisory drift warning", async () => {
    const { reintroduction } = await runTypedefReintroduction();

    expect(reintroduction).not.toHaveProperty("provenance");
    expect(reintroduction).not.toHaveProperty("causalWriteEvent");
    expect(reintroduction).not.toHaveProperty("writeEvent");
    for (const warning of driftWarnings(reintroduction)) {
      expect(warning).not.toHaveProperty("provenance");
      expect(warning).not.toHaveProperty("causalWriteEvent");
      expect(warning).not.toHaveProperty("writeEvent");
    }
  });

  it("does not introduce native Edit/Write interception", () => {
    const graftEditSource = fs.readFileSync(
      path.join(process.cwd(), "src", "mcp", "tools", "graft-edit.ts"),
      "utf-8",
    );

    expect(graftEditSource).not.toMatch(/\bnative\s*(edit|write)\b/i);
    expect(graftEditSource).not.toMatch(/\bintercept(?:ion|s|ed|ing)?\b/i);
  });

  it("keeps drift warnings out of daemon, WARP, LSP, and provenance expansion", () => {
    const graftEditSource = fs.readFileSync(
      path.join(process.cwd(), "src", "mcp", "tools", "graft-edit.ts"),
      "utf-8",
    );

    expect(graftEditSource).not.toMatch(/daemon/i);
    expect(graftEditSource).not.toMatch(/\bwarp\b/i);
    expect(graftEditSource).not.toMatch(/\blsp\b/i);
    expect(graftEditSource).not.toMatch(/provenance/i);
  });
});
