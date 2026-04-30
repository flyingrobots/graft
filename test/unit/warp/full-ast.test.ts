import { describe, it, expect } from "vitest";
import { openWarp } from "../../../src/warp/open.js";
import { parseStructuredTree } from "../../../src/parser/runtime.js";
import { emitFullAst } from "../../../src/warp/ast-emitter.js";
import { createTestRepo, cleanupTestRepo } from "../../helpers/git.js";
import type { WarpContext } from "../../../src/warp/context.js";

describe("warp: AST snapshot attachment", { timeout: 15000 }, () => {
  it("keeps graph state compact and stores the full tree as attached content", async () => {
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
      const ctx: WarpContext = { app: warp, strandId: null };
      const filePath = "src/greeter.ts";

      await emitFullAst(ctx, filePath, parsed.root);
      parsed.delete();

      await warp.core().materialize();

      // Query: find the compact graph anchor for this file.
      const obs = await warp.observer({ match: [`ast:${filePath}:*`, `file:${filePath}`] });
      const allNodes = await obs.getNodes();

      // The full CST is no longer represented as one graph node per syntax
      // node. The graph carries only the file node and root AST anchor.
      expect(allNodes.length).toBe(2);
      expect(allNodes).toContain(`file:${filePath}`);

      // Check that the root anchor exists.
      const edges = await obs.getEdges();
      const astNodes = allNodes.filter((n) => n.startsWith("ast:"));
      expect(astNodes).toHaveLength(1);
      const props = await obs.getNodeProps(astNodes[0]!);
      expect(props?.["type"]).toBe("program");
      expect(props?.["summaryOnly"]).toBe(true);

      // Check that child edges are not emitted into graph state.
      const childEdges = edges.filter((e) => e.label === "child");
      expect(childEdges).toHaveLength(0);

      // Check file -> ast root edge
      const fileToAst = edges.filter(
        (e) => e.from === `file:${filePath}` && e.label === "contains_ast" && e.to.startsWith("ast:"),
      );
      expect(fileToAst.length).toBeGreaterThan(0);

      const meta = await warp.core().getContentMeta(`file:${filePath}`);
      expect(meta?.mime).toBe("application/vnd.graft.ast+json");

      const content = await warp.core().getContent(`file:${filePath}`);
      expect(content).not.toBeNull();
      const snapshot = JSON.parse(new TextDecoder().decode(content!)) as {
        schema: string;
        root: { type: string; children?: { type: string }[] };
      };
      expect(snapshot.schema).toBe("graft.ast-snapshot.v1");
      expect(snapshot.root.type).toBe("program");
      expect(JSON.stringify(snapshot)).toContain("import_statement");
      expect(JSON.stringify(snapshot)).toContain("function_declaration");
    } finally {
      cleanupTestRepo(tmpDir);
    }
  });
});
