import { describe, it, expect } from "vitest";
import { openWarp } from "../../../src/warp/open.js";
import { parseStructuredTree } from "../../../src/parser/runtime.js";
import { emitAstNodes } from "../../../src/warp/ast-emitter.js";
import { resolveImportEdges } from "../../../src/warp/ast-import-resolver.js";
import { nodePathOps } from "../../../src/adapters/node-paths.js";
import { createTestRepo, cleanupTestRepo } from "../../helpers/git.js";

describe("warp: AST import resolver", { timeout: 15000 }, () => {
  function setup() {
    const tmpDir = createTestRepo("warp-import-");
    return tmpDir;
  }

  async function emitFile(warp: Awaited<ReturnType<typeof openWarp>>, filePath: string, source: string, knownFiles: Set<string>) {
    const parsed = parseStructuredTree("ts", source);
    await warp.patch((patch) => {
      const fileId = `file:${filePath}`;
      patch.addNode(fileId);
      patch.setProperty(fileId, "path", filePath);
      emitAstNodes(patch, filePath, parsed.root);
      resolveImportEdges(patch, filePath, parsed.root, nodePathOps, knownFiles);
    });
    parsed.delete();
  }

  async function getEdgesLabeled(warp: Awaited<ReturnType<typeof openWarp>>, label: string) {
    await warp.core().materialize();
    const obs = await warp.observer({ match: ["ast:*", "file:*", "sym:*"] });
    const edges = await obs.getEdges();
    return edges.filter((e) => e.label === label);
  }

  it("named import: references sym node in target file", async () => {
    const tmpDir = setup();
    try {
      const warp = await openWarp({ cwd: tmpDir });
      const knownFiles = new Set(["src/utils.ts", "src/greeter.ts"]);

      // Emit utils (the target)
      await warp.patch((patch) => {
        patch.addNode("file:src/utils.ts");
        patch.addNode("sym:src/utils.ts:foo");
        patch.addEdge("file:src/utils.ts", "sym:src/utils.ts:foo", "contains");
      });

      // Emit greeter (the importer)
      await emitFile(warp, "src/greeter.ts", 'import { foo } from "./utils";\n', knownFiles);

      const refs = await getEdgesLabeled(warp, "references");
      expect(refs.length).toBeGreaterThan(0);
      const fooRef = refs.find((e) => e.to === "sym:src/utils.ts:foo");
      expect(fooRef).toBeDefined();
    } finally {
      cleanupTestRepo(tmpDir);
    }
  });

  it("aliased import: import { foo as baz } references foo", async () => {
    const tmpDir = setup();
    try {
      const warp = await openWarp({ cwd: tmpDir });
      const knownFiles = new Set(["src/utils.ts", "src/greeter.ts"]);

      await warp.patch((patch) => {
        patch.addNode("file:src/utils.ts");
        patch.addNode("sym:src/utils.ts:foo");
      });

      await emitFile(warp, "src/greeter.ts", 'import { foo as baz } from "./utils";\n', knownFiles);

      const refs = await getEdgesLabeled(warp, "references");
      const fooRef = refs.find((e) => e.to === "sym:src/utils.ts:foo");
      expect(fooRef).toBeDefined();

      // Verify the specifier node has both names
      await warp.core().materialize();
      const obs = await warp.observer({ match: "ast:*" });
      const specNode = await obs.getNodeProps(fooRef!.from);
      expect(specNode).not.toBeNull();
      expect(specNode!["importedName"]).toBe("foo");
      expect(specNode!["localName"]).toBe("baz");
    } finally {
      cleanupTestRepo(tmpDir);
    }
  });

  it("default import: import foo from './bar' references default", async () => {
    const tmpDir = setup();
    try {
      const warp = await openWarp({ cwd: tmpDir });
      const knownFiles = new Set(["src/bar.ts", "src/main.ts"]);

      await warp.patch((patch) => {
        patch.addNode("file:src/bar.ts");
        patch.addNode("sym:src/bar.ts:default");
      });

      await emitFile(warp, "src/main.ts", 'import foo from "./bar";\n', knownFiles);

      const refs = await getEdgesLabeled(warp, "references");
      const defaultRef = refs.find((e) => e.to === "sym:src/bar.ts:default");
      expect(defaultRef).toBeDefined();
    } finally {
      cleanupTestRepo(tmpDir);
    }
  });

  it("namespace import: import * as ns references the file", async () => {
    const tmpDir = setup();
    try {
      const warp = await openWarp({ cwd: tmpDir });
      const knownFiles = new Set(["src/utils.ts", "src/main.ts"]);

      await warp.patch((patch) => {
        patch.addNode("file:src/utils.ts");
      });

      await emitFile(warp, "src/main.ts", 'import * as utils from "./utils";\n', knownFiles);

      const refs = await getEdgesLabeled(warp, "references");
      const nsRef = refs.find((e) => e.to === "file:src/utils.ts");
      expect(nsRef).toBeDefined();
    } finally {
      cleanupTestRepo(tmpDir);
    }
  });

  it("re-export: export { foo } from './bar' references sym", async () => {
    const tmpDir = setup();
    try {
      const warp = await openWarp({ cwd: tmpDir });
      const knownFiles = new Set(["src/bar.ts", "src/index.ts"]);

      await warp.patch((patch) => {
        patch.addNode("file:src/bar.ts");
        patch.addNode("sym:src/bar.ts:foo");
      });

      await emitFile(warp, "src/index.ts", 'export { foo } from "./bar";\n', knownFiles);

      const refs = await getEdgesLabeled(warp, "references");
      const fooRef = refs.find((e) => e.to === "sym:src/bar.ts:foo");
      expect(fooRef).toBeDefined();
    } finally {
      cleanupTestRepo(tmpDir);
    }
  });

  it("wildcard re-export: export * from './bar' reexports file", async () => {
    const tmpDir = setup();
    try {
      const warp = await openWarp({ cwd: tmpDir });
      const knownFiles = new Set(["src/bar.ts", "src/index.ts"]);

      await warp.patch((patch) => {
        patch.addNode("file:src/bar.ts");
      });

      await emitFile(warp, "src/index.ts", 'export * from "./bar";\n', knownFiles);

      const reexports = await getEdgesLabeled(warp, "reexports");
      const barReexport = reexports.find((e) => e.to === "file:src/bar.ts");
      expect(barReexport).toBeDefined();
    } finally {
      cleanupTestRepo(tmpDir);
    }
  });

  it("resolves_to edge: module path resolves to file node", async () => {
    const tmpDir = setup();
    try {
      const warp = await openWarp({ cwd: tmpDir });
      const knownFiles = new Set(["src/utils.ts", "src/greeter.ts"]);

      await warp.patch((patch) => {
        patch.addNode("file:src/utils.ts");
      });

      await emitFile(warp, "src/greeter.ts", 'import { foo } from "./utils";\n', knownFiles);

      const resolves = await getEdgesLabeled(warp, "resolves_to");
      const utilsResolve = resolves.find((e) => e.to === "file:src/utils.ts");
      expect(utilsResolve).toBeDefined();
    } finally {
      cleanupTestRepo(tmpDir);
    }
  });

  it("resolves TypeScript ESM .js specifiers to .ts source files", async () => {
    const tmpDir = setup();
    try {
      const warp = await openWarp({ cwd: tmpDir });
      const knownFiles = new Set(["src/utils.ts", "src/greeter.ts"]);

      await warp.patch((patch) => {
        patch.addNode("file:src/utils.ts");
        patch.addNode("sym:src/utils.ts:foo");
      });

      await emitFile(warp, "src/greeter.ts", 'import { foo } from "./utils.js";\n', knownFiles);

      const resolves = await getEdgesLabeled(warp, "resolves_to");
      const utilsResolve = resolves.find((e) => e.to === "file:src/utils.ts");
      expect(utilsResolve).toBeDefined();

      const refs = await getEdgesLabeled(warp, "references");
      const fooRef = refs.find((e) => e.to === "sym:src/utils.ts:foo");
      expect(fooRef).toBeDefined();
    } finally {
      cleanupTestRepo(tmpDir);
    }
  });

  it("non-relative import: no resolves_to edge, but AST still emitted", async () => {
    const tmpDir = setup();
    try {
      const warp = await openWarp({ cwd: tmpDir });
      const knownFiles = new Set(["src/main.ts"]);

      await emitFile(warp, "src/main.ts", 'import { readFile } from "node:fs";\n', knownFiles);

      const resolves = await getEdgesLabeled(warp, "resolves_to");
      expect(resolves).toHaveLength(0);

      // But the AST nodes are still there
      await warp.core().materialize();
      const obs = await warp.observer({ match: "ast:*" });
      const nodes = await obs.getNodes();
      expect(nodes.length).toBeGreaterThan(0);
    } finally {
      cleanupTestRepo(tmpDir);
    }
  });

  it("dynamic import: import('./foo') resolves to file", async () => {
    const tmpDir = setup();
    try {
      const warp = await openWarp({ cwd: tmpDir });
      const knownFiles = new Set(["src/foo.ts", "src/main.ts"]);

      await warp.patch((patch) => {
        patch.addNode("file:src/foo.ts");
      });

      await emitFile(warp, "src/main.ts", 'const mod = await import("./foo");\n', knownFiles);

      const resolves = await getEdgesLabeled(warp, "resolves_to");
      const fooResolve = resolves.find((e) => e.to === "file:src/foo.ts");
      expect(fooResolve).toBeDefined();
    } finally {
      cleanupTestRepo(tmpDir);
    }
  });
});
