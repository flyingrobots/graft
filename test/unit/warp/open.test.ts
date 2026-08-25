import { describe, it, expect } from "vitest";
import {
  DEFAULT_WARP_CHECKPOINT_EVERY,
  openWarp,
} from "../../../src/warp/open.js";
import { createTestRepo, cleanupTestRepo, git } from "../../helpers/git.js";

describe("warp: open", { timeout: 15000 }, () => {
  it("uses a bounded default checkpoint interval", () => {
    expect(DEFAULT_WARP_CHECKPOINT_EVERY).toBe(128);
  });

  it("observes a brand-new graph as an empty live reading", async () => {
    const tmpDir = createTestRepo("graft-warp-empty-reading-");

    try {
      const warp = await openWarp({ cwd: tmpDir });
      const observer = await warp.observer({ match: "*" });

      expect(await observer.getNodes()).toEqual([]);
      expect(await observer.getEdges()).toEqual([]);
    } finally {
      cleanupTestRepo(tmpDir);
    }
  });

  it("maps v17 property receipts into the Graft port contract", async () => {
    const tmpDir = createTestRepo("graft-warp-v17-receipts-");

    try {
      const warp = await openWarp({ cwd: tmpDir });
      await warp.patch((patch) => {
        patch.addNode("node:receipt");
        patch.setProperty("node:receipt", "name", "Receipt");
      });

      const { receipts } = await warp.core().materialize({ receipts: true });
      expect(receipts.flatMap((receipt) => receipt.ops.map((outcome) => outcome.op)))
        .toEqual(["NodeAdd", "NodePropSet"]);
    } finally {
      cleanupTestRepo(tmpDir);
    }
  });

  it("auto-checkpoints after enough patches are materialized", async () => {
    const tmpDir = createTestRepo("graft-warp-checkpoint-");

    try {
      const warp = await openWarp({ cwd: tmpDir, checkpointEvery: 2 });

      await warp.patch((patch) => {
        patch.addNode("node:first");
      });
      await warp.patch((patch) => {
        patch.addNode("node:second");
      });

      const before = git(tmpDir, "show-ref --verify refs/warp/graft-ast/checkpoints/head || true");
      expect(before).toBe("");

      await warp.core().materialize();

      const checkpointSha = git(tmpDir, "rev-parse --verify refs/warp/graft-ast/checkpoints/head");
      expect(checkpointSha).toMatch(/^[a-f0-9]{40}$/);
    } finally {
      cleanupTestRepo(tmpDir);
    }
  });
});
