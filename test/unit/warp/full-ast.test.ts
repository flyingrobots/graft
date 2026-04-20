import { describe, it, expect } from "vitest";
import { openWarp } from "../../../src/warp/open.js";
import { parseStructuredTree } from "../../../src/parser/runtime.js";
import { emitFullAst } from "../../../src/warp/ast-emitter.js";
import { createTestRepo, cleanupTestRepo } from "../../helpers/git.js";

describe("warp: full AST emission", { timeout: 15000 }, () => {
  it("emits every tree-sitter node for a TypeScript file into the graph", async () => {
    const tmpDir = createTestRepo("warp-ast-");

    try {
      const source = [
        'import { foo } from "./utils";',
        "",
        "export function greet(name: string): string {",
        "  return foo(name);",
        "}",
        "",
      ].join("\n");

      const parsed = parseStructuredTree("ts", source);
      const warp = await openWarp({ cwd: tmpDir });
      const filePath = "src/greeter.ts";

      await emitFullAst(warp, filePath, parsed.root);
      parsed.delete();

      await warp.materialize();

      // Query: find all nodes for this file
      const obs = await warp.observer({ match: [`ast:${filePath}:*`, `file:${filePath}`] });
      const allNodes = await obs.getNodes();

      // Should have the file node + many AST nodes
      expect(allNodes.length).toBeGreaterThan(10);
      expect(allNodes).toContain(`file:${filePath}`);

      // Check that we can find an import_statement node
      const edges = await obs.getEdges();
      const astNodes = allNodes.filter((n) => n.startsWith("ast:"));
      let foundImport = false;
      for (const nodeId of astNodes) {
        const props = await obs.getNodeProps(nodeId);
        if (props !== null && props["type"] === "import_statement") {
          foundImport = true;
          break;
        }
      }
      expect(foundImport).toBe(true);

      // Check that we can find a function_declaration node
      let foundFunction = false;
      for (const nodeId of astNodes) {
        const props = await obs.getNodeProps(nodeId);
        if (props !== null && props["type"] === "function_declaration") {
          foundFunction = true;
          break;
        }
      }
      expect(foundFunction).toBe(true);

      // Check that child edges exist (tree structure)
      const childEdges = edges.filter((e) => e.label === "child");
      expect(childEdges.length).toBeGreaterThan(5);

      // Check file -> ast root edge
      const fileToAst = edges.filter(
        (e) => e.from === `file:${filePath}` && e.label === "contains" && e.to.startsWith("ast:"),
      );
      expect(fileToAst.length).toBeGreaterThan(0);
    } finally {
      cleanupTestRepo(tmpDir);
    }
  });
});
