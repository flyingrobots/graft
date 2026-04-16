import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { nodeGit } from "../../src/adapters/node-git.js";
import { openWarp } from "../../src/warp/open.js";
import { indexCommits } from "../../src/warp/indexer.js";
import { fileSymbolsLens } from "../../src/warp/observers.js";
import { createServerInRepo, parse } from "../../test/helpers/mcp.js";
import { cleanupTestRepo, createTestRepo, git } from "../../test/helpers/git.js";

describe("0091 canonical symbol identity across files and commits", () => {
  it("Does an indexed symbol keep the same canonical sid identity when a function is renamed in place across commits?", async () => {
    const tmpDir = createTestRepo("graft-playback-0091-rename-");
    try {
      fs.writeFileSync(
        path.join(tmpDir, "app.ts"),
        'export function greet(): string { return "v1"; }\n',
      );
      git(tmpDir, "add -A");
      git(tmpDir, "commit -m v1");
      const c1 = git(tmpDir, "rev-parse HEAD");

      const warp = await openWarp({ cwd: tmpDir });
      await indexCommits(warp, { cwd: tmpDir, git: nodeGit });

      let observer = await warp.observer(fileSymbolsLens("app.ts"));
      let nodes = await observer.getNodes();
      const beforeProps = await observer.getNodeProps(nodes[0]!);
      const beforeIdentityId = beforeProps?.["identityId"];

      fs.writeFileSync(
        path.join(tmpDir, "app.ts"),
        'export function welcome(): string { return "v1"; }\n',
      );
      git(tmpDir, "add -A");
      git(tmpDir, "commit -m v2");

      await indexCommits(warp, { cwd: tmpDir, git: nodeGit, from: c1 });

      observer = await warp.observer(fileSymbolsLens("app.ts"));
      nodes = await observer.getNodes();
      const afterProps = await observer.getNodeProps(nodes[0]!);

      expect(afterProps?.["name"]).toBe("welcome");
      expect(afterProps?.["identityId"]).toBe(beforeIdentityId);
      expect(typeof afterProps?.["identityId"]).toBe("string");
    } finally {
      cleanupTestRepo(tmpDir);
    }
  });

  it("Does a git-reported file move preserve the same canonical sid identity and expose it through indexed precision reads?", async () => {
    const tmpDir = createTestRepo("graft-playback-0091-move-");
    try {
      fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true });
      fs.writeFileSync(
        path.join(tmpDir, "src", "greet.ts"),
        'export function greet(): string { return "v1"; }\n',
      );
      git(tmpDir, "add -A");
      git(tmpDir, "commit -m v1");
      const c1 = git(tmpDir, "rev-parse HEAD");

      const warp = await openWarp({ cwd: tmpDir });
      await indexCommits(warp, { cwd: tmpDir, git: nodeGit });

      const beforeObserver = await warp.observer(fileSymbolsLens("src/greet.ts"));
      const beforeNodes = await beforeObserver.getNodes();
      const beforeProps = await beforeObserver.getNodeProps(beforeNodes[0]!);
      const beforeIdentityId = beforeProps?.["identityId"];

      git(tmpDir, "mv src/greet.ts src/welcome.ts");
      git(tmpDir, "commit -m rename-file");

      await indexCommits(warp, { cwd: tmpDir, git: nodeGit, from: c1 });

      const server = createServerInRepo(tmpDir);
      const result = parse(await server.callTool("code_find", {
        query: "greet*",
      }));
      const matches = result["matches"] as { identityId?: string; path?: string }[];

      expect(result["source"]).toBe("warp");
      expect(matches).toHaveLength(1);
      expect(matches[0]?.identityId).toBe(beforeIdentityId);
      expect(matches[0]?.path).toBe("src/welcome.ts");

      const movedObserver = await warp.observer(fileSymbolsLens("src/welcome.ts"));
      const movedNodes = await movedObserver.getNodes();
      const movedProps = await movedObserver.getNodeProps(movedNodes[0]!);
      expect(movedProps?.["identityId"]).toBe(beforeIdentityId);
    } finally {
      cleanupTestRepo(tmpDir);
    }
  });

  it("Does the WARP indexer seed identity from prior graph truth through observers instead of mining materialization receipts?", async () => {
    const tmpDir = createTestRepo("graft-playback-0091-observer-seed-");
    try {
      fs.writeFileSync(
        path.join(tmpDir, "app.ts"),
        'export function greet(): string { return "v1"; }\n',
      );
      git(tmpDir, "add -A");
      git(tmpDir, "commit -m v1");
      const c1 = git(tmpDir, "rev-parse HEAD");

      const warp = await openWarp({ cwd: tmpDir });
      await indexCommits(warp, { cwd: tmpDir, git: nodeGit });

      warp.materializeReceipts = () => Promise.reject(
        new Error("materializeReceipts should not be used by the indexer"),
      );

      fs.writeFileSync(
        path.join(tmpDir, "app.ts"),
        'export function welcome(): string { return "v1"; }\n',
      );
      git(tmpDir, "add -A");
      git(tmpDir, "commit -m v2");

      await indexCommits(warp, { cwd: tmpDir, git: nodeGit, from: c1 });

      const observer = await warp.observer(fileSymbolsLens("app.ts"));
      const nodes = await observer.getNodes();
      const props = await observer.getNodeProps(nodes[0]!);

      expect(props?.["name"]).toBe("welcome");
      expect(props?.["identityId"]).toMatch(/^sid:[a-f0-9]{16}$/);
    } finally {
      cleanupTestRepo(tmpDir);
    }
  });

  it("Do indexed precision surfaces expose canonical identity without pretending live parse or address keys are themselves stable identity?", async () => {
    const tmpDir = createTestRepo("graft-playback-0091-precision-surface-");
    try {
      fs.writeFileSync(
        path.join(tmpDir, "app.ts"),
        'export function greet(): string { return "v1"; }\n',
      );
      git(tmpDir, "add -A");
      git(tmpDir, "commit -m init");

      const liveServer = createServerInRepo(tmpDir);
      const liveResult = parse(await liveServer.callTool("code_show", {
        symbol: "greet",
        path: "app.ts",
      }));
      expect(liveResult["source"]).toBe("live");
      expect(liveResult["identityId"]).toBeUndefined();

      const warp = await openWarp({ cwd: tmpDir });
      await indexCommits(warp, { cwd: tmpDir, git: nodeGit });

      const indexedServer = createServerInRepo(tmpDir);
      const indexedResult = parse(await indexedServer.callTool("code_find", {
        query: "greet*",
      }));
      const matches = indexedResult["matches"] as { identityId?: string; path?: string }[];

      expect(indexedResult["source"]).toBe("warp");
      expect(matches).toHaveLength(1);
      expect(matches[0]?.identityId).toMatch(/^sid:[a-f0-9]{16}$/);
      expect(matches[0]?.path).toBe("app.ts");
    } finally {
      cleanupTestRepo(tmpDir);
    }
  });
});
