import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CONFIG_PATH = path.join(ROOT, "eslint.config.js");

async function lintRestrictedImports(text: string, relativeFilePath: string) {
  const absoluteFilePath = path.join(ROOT, relativeFilePath);
  await fs.mkdir(path.dirname(absoluteFilePath), { recursive: true });
  await fs.writeFile(absoluteFilePath, text, "utf8");

  const eslint = new ESLint({
    cwd: ROOT,
    overrideConfigFile: CONFIG_PATH,
    ignore: false,
  });
  try {
    const [result] = await eslint.lintFiles([absoluteFilePath]);
    return (result?.messages ?? []).filter((message) => message.ruleId === "no-restricted-imports");
  } finally {
    await fs.rm(absoluteFilePath, { force: true });
  }
}

async function readRepoText(relativeFilePath: string): Promise<string> {
  return fs.readFile(path.join(ROOT, relativeFilePath), "utf8");
}

describe("0076 hex layer map and dependency guardrails", () => {
  it("Can a human point to the currently enforced layers without having to infer them from code archaeology?", async () => {
    const designDoc = await readRepoText(
      "docs/design/0076-hex-layer-map-and-dependency-guardrails/hex-layer-map-and-dependency-guardrails.md",
    );

    expect(designDoc).toContain("## Current enforced layer map");
    expect(designDoc).toContain("1. Foundational contracts and pure helpers");
    expect(designDoc).toContain("2. Ports");
    expect(designDoc).toContain("3. Current application modules");
    expect(designDoc).toContain("4. Current secondary adapters");
    expect(designDoc).toContain("5. Primary adapters and entrypoints");
  });

  it("Is it explicit that this cycle enforces a truthful first-cut map, not a final directory reorganization?", async () => {
    const designDoc = await readRepoText(
      "docs/design/0076-hex-layer-map-and-dependency-guardrails/hex-layer-map-and-dependency-guardrails.md",
    );

    expect(designDoc).toContain("truthful first-cut");
    expect(designDoc).toContain("Create a final `src/application/**` directory in this cycle.");
    expect(designDoc).toContain("Reclassify every top-level directory before enforcing anything.");
  });

  it("Does `ARCHITECTURE.md` stop claiming the repo is already strict hexagonal in full?", async () => {
    const architectureDoc = await readRepoText("ARCHITECTURE.md");

    expect(architectureDoc).toContain("converging on a strict Hexagonal");
    expect(architectureDoc).not.toContain("organized around a strict Hexagonal");
    expect(architectureDoc).toContain("primary adapters and composition roots are still mid-migration");
  });

  it("Do contracts and pure helpers reject imports from ports, application modules, secondary adapters, primary adapters, and host libraries?", async () => {
    const messages = await lintRestrictedImports(
      'import { createGraftServer } from "../mcp/server.js";\n',
      "src/contracts/hex-guardrail.fixture.ts",
    );

    expect(messages).toHaveLength(1);
    expect(messages[0]?.message).toContain("Foundational contracts and pure helpers must not depend on primary adapters");
  });

  it("Do ports reject imports from application modules, adapters, primary adapters, and host libraries?", async () => {
    const messages = await lintRestrictedImports(
      'import * as fs from "node:fs";\n',
      "src/ports/hex-guardrail.fixture.ts",
    );

    expect(messages).toHaveLength(1);
    expect(messages[0]?.message).toContain("Ports must not import host libraries directly");
  });

  it("Do current application modules reject direct adapter and host imports?", async () => {
    const messages = await lintRestrictedImports(
      'import { openWarp } from "../warp/open.js";\n',
      "src/operations/hex-guardrail.fixture.ts",
    );

    expect(messages).toHaveLength(1);
    expect(messages[0]?.message).toContain("Application modules must not depend on secondary adapters");
  });

  it("Do current secondary adapters reject imports from primary adapters?", async () => {
    const messages = await lintRestrictedImports(
      'import { createGraftServer } from "../mcp/server.js";\n',
      "src/adapters/hex-guardrail.fixture.ts",
    );

    expect(messages).toHaveLength(1);
    expect(messages[0]?.message).toContain("Secondary adapters must not depend on primary adapters");
  });

  it("Does the playback witness prove the guardrails by linting synthetic violations rather than relying on prose claims?", async () => {
    const messages = await lintRestrictedImports(
      'import { createGraftServer } from "../mcp/server.js";\n',
      "src/contracts/hex-guardrail-synthetic.fixture.ts",
    );

    expect(messages).toHaveLength(1);
  });

  it("still allows application modules to depend on ports", async () => {
    const messages = await lintRestrictedImports(
      'import type { FileSystem } from "../ports/filesystem.js";\n',
      "src/operations/hex-guardrail-allowed.fixture.ts",
    );

    expect(messages).toHaveLength(0);
  });
});
