import { describe, expect, it } from "vitest";
import { cleanupTestRepo, createTestRepo } from "../../helpers/git.js";
import { openWarp } from "../../../src/warp/open.js";

const sourceNode = "adapter-contract:source";
const contentNode = "adapter-contract:content";
const contentText = "one atomic Graft patch\n";

describe("git-warp adapter transaction contract", { timeout: 15_000 }, () => {
  it("reopens one node/property/edge/content patch as one receipt", async () => {
    const repo = createTestRepo("graft-warp-adapter-transaction-");

    try {
      const warp = await openWarp({ cwd: repo });
      const patchSha = await warp.patch(async (patch) => {
        patch
          .addNode(sourceNode)
          .setProperty(sourceNode, "role", "source")
          .addNode(contentNode)
          .setProperty(contentNode, "role", "content")
          .addEdge(sourceNode, contentNode, "contains");
        await patch.attachContent(contentNode, contentText, {
          mime: "text/plain",
          size: new TextEncoder().encode(contentText).byteLength,
        });
      });

      const materialized = await warp.core().materialize({ receipts: true });
      const receipt = materialized.receipts.find((candidate) => candidate.patchSha === patchSha);
      expect(receipt).toBeDefined();
      expect(new Set(receipt?.ops.map(({ op }) => op))).toEqual(new Set([
        "EdgeAdd",
        "NodeAdd",
        "NodePropSet",
      ]));
      expect(receipt?.ops.every(({ result }) => result === "applied")).toBe(true);

      const reopened = await openWarp({ cwd: repo });
      const observer = await reopened.observer({ match: "adapter-contract:*" });
      expect((await observer.getNodes()).sort()).toEqual([contentNode, sourceNode].sort());
      expect(await observer.getNodeProps(contentNode)).toMatchObject({ role: "content" });
      expect(await observer.getEdges()).toEqual([
        { from: sourceNode, label: "contains", props: {}, to: contentNode },
      ]);

      await reopened.core().materialize();
      expect(await reopened.core().getContentMeta(contentNode)).toMatchObject({
        mime: "text/plain",
        size: new TextEncoder().encode(contentText).byteLength,
      });
      expect(new TextDecoder().decode(await reopened.core().getContent(contentNode) ?? undefined))
        .toBe(contentText);
    } finally {
      cleanupTestRepo(repo);
    }
  });

  it("publishes none of a patch whose callback fails", async () => {
    const repo = createTestRepo("graft-warp-adapter-rollback-");

    try {
      const warp = await openWarp({ cwd: repo });
      await expect(warp.patch(async (patch) => {
        patch
          .addNode(sourceNode)
          .addNode(contentNode)
          .addEdge(sourceNode, contentNode, "contains");
        await patch.attachContent(contentNode, contentText, { mime: "text/plain" });
        throw new Error("injected callback failure");
      })).rejects.toThrow("injected callback failure");

      const reopened = await openWarp({ cwd: repo });
      const observer = await reopened.observer({ match: "adapter-contract:*" });
      expect(await observer.getNodes()).toEqual([]);
      expect(await observer.getEdges()).toEqual([]);
      await reopened.core().materialize();
      expect(await reopened.core().getContent(contentNode)).toBeNull();
    } finally {
      cleanupTestRepo(repo);
    }
  });
});
