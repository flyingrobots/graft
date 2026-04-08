import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { createGraftServer } from "../../../src/mcp/server.js";
import { cleanupTestRepo, createTestRepo, git } from "../../helpers/git.js";
import { parse } from "../../helpers/mcp.js";

function createServerInRepo(repoDir: string) {
  return createGraftServer({
    projectRoot: repoDir,
    graftDir: path.join(repoDir, ".graft"),
  });
}

describe("mcp: code_refs", () => {
  it("finds import sites with explicit fallback provenance", async () => {
    const tmpDir = createTestRepo("graft-code-refs-import-");
    try {
      fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true });
      fs.writeFileSync(
        path.join(tmpDir, "src", "surface.ts"),
        "export function createSurface(): object { return {}; }\n",
      );
      fs.writeFileSync(
        path.join(tmpDir, "src", "consumer.ts"),
        "import { createSurface } from \"./surface\";\nconst surface = createSurface();\n",
      );
      git(tmpDir, "add -A");
      git(tmpDir, "commit -m init");

      const server = createServerInRepo(tmpDir);
      const result = parse(await server.callTool("code_refs", {
        query: "createSurface",
        mode: "import",
      }));

      expect(result["source"]).toBe("text_fallback");
      expect(result["mode"]).toBe("import");
      expect(result["scope"]).toBe(".");
      expect(result["provenance"]).toEqual(expect.objectContaining({
        approximate: true,
        pattern: expect.stringContaining("createSurface"),
      }));
      expect(result["matches"]).toEqual([
        expect.objectContaining({
          path: "src/consumer.ts",
          line: 1,
          preview: expect.stringContaining("import { createSurface }"),
        }),
      ]);
    } finally {
      cleanupTestRepo(tmpDir);
    }
  });

  it("finds callsites across the working tree", async () => {
    const tmpDir = createTestRepo("graft-code-refs-call-");
    try {
      fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true });
      fs.writeFileSync(
        path.join(tmpDir, "src", "mask.ts"),
        "export function applyMaskInPlace(): void {}\n",
      );
      fs.writeFileSync(
        path.join(tmpDir, "src", "consumer.ts"),
        "import { applyMaskInPlace } from \"./mask\";\napplyMaskInPlace();\n",
      );
      git(tmpDir, "add -A");
      git(tmpDir, "commit -m init");

      const server = createServerInRepo(tmpDir);
      const result = parse(await server.callTool("code_refs", {
        query: "applyMaskInPlace",
        mode: "call",
      }));

      expect(result["matches"]).toEqual([
        expect.objectContaining({
          path: "src/consumer.ts",
          line: 2,
          preview: "applyMaskInPlace();",
        }),
      ]);
    } finally {
      cleanupTestRepo(tmpDir);
    }
  });

  it("finds property access patterns by property name", async () => {
    const tmpDir = createTestRepo("graft-code-refs-property-");
    try {
      fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true });
      fs.writeFileSync(
        path.join(tmpDir, "src", "surface.ts"),
        "const surface = { cells: [] as string[] };\nconsole.log(surface.cells.length);\nconsole.log(surface?.cells);\n",
      );
      git(tmpDir, "add -A");
      git(tmpDir, "commit -m init");

      const server = createServerInRepo(tmpDir);
      const result = parse(await server.callTool("code_refs", {
        query: "cells",
        mode: "property",
      }));

      const matches = result["matches"] as { preview: string }[];
      expect(matches).toHaveLength(2);
      expect(matches.map((match) => match.preview)).toEqual([
        "console.log(surface.cells.length);",
        "console.log(surface?.cells);",
      ]);
    } finally {
      cleanupTestRepo(tmpDir);
    }
  });

  it("supports scoped search across workspace package boundaries", async () => {
    const tmpDir = createTestRepo("graft-code-refs-scope-");
    try {
      fs.mkdirSync(path.join(tmpDir, "packages", "alpha", "src"), { recursive: true });
      fs.mkdirSync(path.join(tmpDir, "packages", "beta", "src"), { recursive: true });
      fs.mkdirSync(path.join(tmpDir, "apps", "web", "src"), { recursive: true });
      fs.writeFileSync(
        path.join(tmpDir, "packages", "alpha", "src", "surface.ts"),
        "export function createSurface(): object { return {}; }\n",
      );
      fs.writeFileSync(
        path.join(tmpDir, "packages", "beta", "src", "consumer.ts"),
        "import { createSurface } from \"../../alpha/src/surface\";\nconst surface = createSurface();\n",
      );
      fs.writeFileSync(
        path.join(tmpDir, "apps", "web", "src", "consumer.ts"),
        "import { createSurface } from \"../../../packages/alpha/src/surface\";\nconst surface = createSurface();\n",
      );
      git(tmpDir, "add -A");
      git(tmpDir, "commit -m init");

      const server = createServerInRepo(tmpDir);
      const result = parse(await server.callTool("code_refs", {
        query: "createSurface",
        mode: "call",
        path: path.join(tmpDir, "packages"),
      }));

      expect(result["scope"]).toBe("packages");
      expect(result["matches"]).toEqual([
        expect.objectContaining({ path: "packages/beta/src/consumer.ts", line: 2 }),
      ]);
    } finally {
      cleanupTestRepo(tmpDir);
    }
  });

  it("returns refusal when all matches live behind graftignore", async () => {
    const tmpDir = createTestRepo("graft-code-refs-ignore-");
    try {
      fs.writeFileSync(path.join(tmpDir, ".graftignore"), "generated/**\n");
      fs.mkdirSync(path.join(tmpDir, "generated"), { recursive: true });
      fs.writeFileSync(
        path.join(tmpDir, "generated", "secret.ts"),
        "import { createSurface } from \"../surface\";\nconst surface = createSurface();\n",
      );
      git(tmpDir, "add -A");
      git(tmpDir, "commit -m init");

      const server = createServerInRepo(tmpDir);
      const result = parse(await server.callTool("code_refs", {
        query: "createSurface",
        mode: "call",
      }));

      expect(result["projection"]).toBe("refused");
      expect(result["reason"]).toBe("GRAFTIGNORE");
      expect(result["source"]).toBe("text_fallback");
    } finally {
      cleanupTestRepo(tmpDir);
    }
  });
});
