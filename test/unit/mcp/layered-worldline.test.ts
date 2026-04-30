import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { nodePathOps } from "../../../src/adapters/node-paths.js";
import { git, createTestRepo, cleanupTestRepo, testGitClient } from "../../helpers/git.js";
import { createServerInRepo, parse } from "../../helpers/mcp.js";
import { openWarp } from "../../../src/warp/open.js";
import { indexHead } from "../../../src/warp/index-head.js";

// These RED tests intentionally mirror the 0025 playback questions while
// spanning golden path, failure modes, edge cases, and stress behavior.
describe("mcp: layered worldline model", { timeout: 15000 }, () => {
  describe("golden path", () => {
    it("labels historical symbol reads as commit_worldline", async () => {
      const tmpDir = createTestRepo("graft-layered-worldline-commit-");
      try {
        fs.writeFileSync(
          path.join(tmpDir, "app.ts"),
          'export function greet(): string {\n  return "v1";\n}\n',
        );
        git(tmpDir, "add -A");
        git(tmpDir, "commit -m v1");
        const c1 = git(tmpDir, "rev-parse HEAD");

        const warp = await openWarp({ cwd: tmpDir });
        const ctx = { app: warp, strandId: null };
        await indexHead({ cwd: tmpDir, git: testGitClient, pathOps: nodePathOps, ctx });

        fs.writeFileSync(
          path.join(tmpDir, "app.ts"),
          'export function greet(): string {\n  return "v2";\n}\n',
        );
        git(tmpDir, "add -A");
        git(tmpDir, "commit -m v2");

        await indexHead({ cwd: tmpDir, git: testGitClient, pathOps: nodePathOps, ctx });

        const server = createServerInRepo(tmpDir);
        const result = parse(await server.callTool("code_show", {
          symbol: "greet",
          ref: c1,
        }));

        expect(result["source"]).toBe("warp");
        expect(result["layer"]).toBe("commit_worldline");
      } finally {
        cleanupTestRepo(tmpDir);
      }
    });

    it("labels branch/ref structural comparisons as ref_view", async () => {
      const tmpDir = createTestRepo("graft-layered-worldline-ref-");
      try {
        fs.writeFileSync(path.join(tmpDir, "app.ts"), "export const base = 1;\n");
        git(tmpDir, "add -A");
        git(tmpDir, "commit -m base");
        const baseBranch = git(tmpDir, "rev-parse --abbrev-ref HEAD");

        git(tmpDir, "checkout -q -b feature");
        fs.writeFileSync(
          path.join(tmpDir, "app.ts"),
          "export const base = 1;\nexport function featureFlag(): boolean { return true; }\n",
        );
        git(tmpDir, "add -A");
        git(tmpDir, "commit -m feature");

        const server = createServerInRepo(tmpDir);
        const result = parse(await server.callTool("graft_since", {
          base: baseBranch,
          head: "feature",
        }));

        expect(result["files"]).toBeDefined();
        expect(result["layer"]).toBe("ref_view");
      } finally {
        cleanupTestRepo(tmpDir);
      }
    });

    it("labels dirty working-tree answers as workspace_overlay", async () => {
      const tmpDir = createTestRepo("graft-layered-worldline-workspace-");
      try {
        fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true });
        fs.writeFileSync(path.join(tmpDir, "src", "stable.ts"), "export const stable = true;\n");
        git(tmpDir, "add -A");
        git(tmpDir, "commit -m init");

        const warp = await openWarp({ cwd: tmpDir });
        const ctx = { app: warp, strandId: null };
        await indexHead({ cwd: tmpDir, git: testGitClient, pathOps: nodePathOps, ctx });

        fs.writeFileSync(
          path.join(tmpDir, "src", "draft.ts"),
          'export function draftHelper(): string {\n  return "draft";\n}\n',
        );

        const server = createServerInRepo(tmpDir);
        const result = parse(await server.callTool("code_find", {
          query: "draft*",
        }));

        expect(result["source"]).toBe("live");
        expect(result["layer"]).toBe("workspace_overlay");
      } finally {
        cleanupTestRepo(tmpDir);
      }
    });

    it("labels default structural diffs against the working tree as workspace_overlay", async () => {
      const tmpDir = createTestRepo("graft-layered-worldline-diff-overlay-");
      try {
        fs.writeFileSync(path.join(tmpDir, "app.ts"), "export const stable = true;\n");
        git(tmpDir, "add -A");
        git(tmpDir, "commit -m init");

        const server = createServerInRepo(tmpDir);
        const result = parse(await server.callTool("graft_diff", {}));

        expect(result["layer"]).toBe("workspace_overlay");
      } finally {
        cleanupTestRepo(tmpDir);
      }
    });

    it("doctor reports checkout epochs and semantic checkout transitions", async () => {
      const tmpDir = createTestRepo("graft-layered-worldline-transition-");
      try {
        fs.writeFileSync(path.join(tmpDir, "app.ts"), "export const base = 1;\n");
        git(tmpDir, "add -A");
        git(tmpDir, "commit -m base");
        const baseBranch = git(tmpDir, "rev-parse --abbrev-ref HEAD");

        git(tmpDir, "checkout -q -b feature");
        fs.writeFileSync(
          path.join(tmpDir, "app.ts"),
          "export const base = 1;\nexport const feature = 2;\n",
        );
        git(tmpDir, "add -A");
        git(tmpDir, "commit -m feature");

        const server = createServerInRepo(tmpDir);
        const first = parse(await server.callTool("doctor", {}));

        git(tmpDir, `checkout -q ${baseBranch}`);
        const second = parse(await server.callTool("doctor", {}));

        expect(first["checkoutEpoch"]).toBeDefined();
        expect(second["checkoutEpoch"]).toBeDefined();
        expect(second["checkoutEpoch"]).not.toEqual(first["checkoutEpoch"]);

        const transition = second["lastTransition"] as {
          kind?: string;
          fromRef?: string;
          toRef?: string;
        };
        expect(transition.kind).toBe("checkout");
        expect(transition.fromRef).toBe("feature");
        expect(transition.toRef).toBe(baseBranch);
      } finally {
        cleanupTestRepo(tmpDir);
      }
    });
  });

  describe("failure modes", () => {
    it("keeps commit_worldline classification even when a historical ref is invalid", async () => {
      const tmpDir = createTestRepo("graft-layered-worldline-invalid-ref-");
      try {
        fs.writeFileSync(path.join(tmpDir, "app.ts"), "export const stable = true;\n");
        git(tmpDir, "add -A");
        git(tmpDir, "commit -m init");

        const server = createServerInRepo(tmpDir);
        const result = parse(await server.callTool("code_show", {
          symbol: "stable",
          ref: "definitely-not-a-real-ref",
        }));

        expect(result["error"]).toBeDefined();
        expect(result["layer"]).toBe("commit_worldline");
      } finally {
        cleanupTestRepo(tmpDir);
      }
    });

    it("defaults workspace attribution to unknown with explicit low confidence", async () => {
      const tmpDir = createTestRepo("graft-layered-worldline-unknown-actor-");
      try {
        fs.writeFileSync(path.join(tmpDir, "app.ts"), "export const stable = true;\n");
        git(tmpDir, "add -A");
        git(tmpDir, "commit -m init");

        fs.writeFileSync(
          path.join(tmpDir, "app.ts"),
          "export const stable = true;\nexport const drift = 2;\n",
        );

        const server = createServerInRepo(tmpDir);
        const result = parse(await server.callTool("doctor", {}));
        const overlay = result["workspaceOverlay"] as {
          actorGuess?: string;
          confidence?: string;
          evidence?: unknown;
        };

        expect(overlay).toBeDefined();
        expect(overlay.actorGuess).toBe("unknown");
        expect(overlay.confidence).toBe("low");
        expect(overlay.evidence).toBeDefined();
      } finally {
        cleanupTestRepo(tmpDir);
      }
    });
  });

  describe("edge cases", () => {
    it("counts unstaged changes in the workspace overlay without misclassifying them as staged", async () => {
      const tmpDir = createTestRepo("graft-layered-worldline-status-counts-");
      try {
        fs.writeFileSync(path.join(tmpDir, "app.ts"), "export const stable = true;\n");
        git(tmpDir, "add -A");
        git(tmpDir, "commit -m init");

        fs.writeFileSync(
          path.join(tmpDir, "app.ts"),
          "export const stable = true;\nexport const drift = 1;\n",
        );

        const server = createServerInRepo(tmpDir);
        const result = parse(await server.callTool("doctor", {}));
        const overlay = result["workspaceOverlay"] as {
          totalPaths?: number;
          stagedPaths?: number;
          changedPaths?: number;
        };

        expect(overlay.totalPaths).toBe(1);
        expect(overlay.stagedPaths).toBe(0);
        expect(overlay.changedPaths).toBe(1);
      } finally {
        cleanupTestRepo(tmpDir);
      }
    });

    it("tracks detached-head checkouts as checkout epochs with commit targets", async () => {
      const tmpDir = createTestRepo("graft-layered-worldline-detached-");
      try {
        fs.writeFileSync(path.join(tmpDir, "app.ts"), "export const v1 = 1;\n");
        git(tmpDir, "add -A");
        git(tmpDir, "commit -m v1");
        const c1 = git(tmpDir, "rev-parse HEAD");

        fs.writeFileSync(path.join(tmpDir, "app.ts"), "export const v2 = 2;\n");
        git(tmpDir, "add -A");
        git(tmpDir, "commit -m v2");

        const server = createServerInRepo(tmpDir);
        const before = parse(await server.callTool("doctor", {}));

        git(tmpDir, `checkout -q ${c1}`);
        const after = parse(await server.callTool("doctor", {}));

        expect(before["checkoutEpoch"]).toBeDefined();
        expect(after["checkoutEpoch"]).toBeDefined();
        expect(after["checkoutEpoch"]).not.toEqual(before["checkoutEpoch"]);

        const transition = after["lastTransition"] as {
          kind?: string;
          toRef?: string | null;
          toCommit?: string;
        };
        expect(transition.kind).toBe("checkout");
        expect(transition.toRef ?? null).toBeNull();
        expect(transition.toCommit).toBe(c1);
      } finally {
        cleanupTestRepo(tmpDir);
      }
    });

    it("does not misclassify checkout subjects that contain branch names with rebase in them", async () => {
      const tmpDir = createTestRepo("graft-layered-worldline-rebase-branch-");
      try {
        fs.writeFileSync(path.join(tmpDir, "app.ts"), "export const base = 1;\n");
        git(tmpDir, "add -A");
        git(tmpDir, "commit -m base");

        const server = createServerInRepo(tmpDir);
        git(tmpDir, "checkout -q -b feature/rebase-ui");

        const doctor = parse(await server.callTool("doctor", {}));
        const transition = doctor["lastTransition"] as { kind?: string; toRef?: string | null } | undefined;

        expect(transition).toBeDefined();
        expect(transition?.kind).toBe("checkout");
        expect(transition?.toRef).toBe("feature/rebase-ui");
      } finally {
        cleanupTestRepo(tmpDir);
      }
    });

    it("reports hard resets as semantic repo transitions without losing commit_worldline access", async () => {
      const tmpDir = createTestRepo("graft-layered-worldline-reset-");
      try {
        fs.writeFileSync(
          path.join(tmpDir, "app.ts"),
          'export function keep(): string {\n  return "v1";\n}\n',
        );
        git(tmpDir, "add -A");
        git(tmpDir, "commit -m v1");

        fs.writeFileSync(
          path.join(tmpDir, "app.ts"),
          'export function keep(): string {\n  return "v2";\n}\n',
        );
        git(tmpDir, "add -A");
        git(tmpDir, "commit -m v2");
        const c2 = git(tmpDir, "rev-parse HEAD");

        const server = createServerInRepo(tmpDir);
        git(tmpDir, "reset -q --hard HEAD~1");

        const doctor = parse(await server.callTool("doctor", {}));
        const transition = doctor["lastTransition"] as { kind?: string } | undefined;
        expect(transition).toBeDefined();
        expect(transition?.kind).toBe("reset");

        const historical = parse(await server.callTool("code_show", {
          symbol: "keep",
          ref: c2,
        }));
        expect(historical["layer"]).toBe("commit_worldline");
      } finally {
        cleanupTestRepo(tmpDir);
      }
    });

    it("reports non-fast-forward merges as semantic repo transitions", async () => {
      const tmpDir = createTestRepo("graft-layered-worldline-merge-");
      try {
        fs.writeFileSync(path.join(tmpDir, "base.ts"), "export const base = 1;\n");
        git(tmpDir, "add -A");
        git(tmpDir, "commit -m base");
        const baseBranch = git(tmpDir, "rev-parse --abbrev-ref HEAD");

        git(tmpDir, "checkout -q -b feature");
        fs.writeFileSync(path.join(tmpDir, "feature.ts"), "export const feature = 2;\n");
        git(tmpDir, "add -A");
        git(tmpDir, "commit -m feature");

        git(tmpDir, `checkout -q ${baseBranch}`);
        fs.writeFileSync(path.join(tmpDir, "main.ts"), "export const mainline = 3;\n");
        git(tmpDir, "add -A");
        git(tmpDir, "commit -m mainline");

        const server = createServerInRepo(tmpDir);
        git(tmpDir, "merge -q --no-ff feature -m merge-feature");

        const doctor = parse(await server.callTool("doctor", {}));
        const transition = doctor["lastTransition"] as {
          kind?: string;
          fromRef?: string;
          toRef?: string;
        } | undefined;
        const semanticTransition = doctor["semanticTransition"] as {
          kind?: string;
          phase?: string | null;
          authority?: string;
        } | null;
        expect(transition).toBeDefined();
        expect(transition?.kind).toBe("merge");
        expect(transition?.fromRef).toBe("feature");
        expect(transition?.toRef).toBe(baseBranch);
        expect(semanticTransition?.kind).toBe("merge_phase");
        expect(semanticTransition?.phase).toBe("completed_or_cleared");
        expect(semanticTransition?.authority).toBe("repo_snapshot");
      } finally {
        cleanupTestRepo(tmpDir);
      }
    });

    it("reports rebases as semantic repo transitions while preserving ref_view queries", async () => {
      const tmpDir = createTestRepo("graft-layered-worldline-rebase-");
      try {
        fs.writeFileSync(path.join(tmpDir, "base.ts"), "export const base = 1;\n");
        git(tmpDir, "add -A");
        git(tmpDir, "commit -m base");
        const baseBranch = git(tmpDir, "rev-parse --abbrev-ref HEAD");

        git(tmpDir, "checkout -q -b feature");
        fs.writeFileSync(path.join(tmpDir, "feature.ts"), "export const feature = 2;\n");
        git(tmpDir, "add -A");
        git(tmpDir, "commit -m feature");

        git(tmpDir, `checkout -q ${baseBranch}`);
        fs.writeFileSync(path.join(tmpDir, "main.ts"), "export const mainline = 3;\n");
        git(tmpDir, "add -A");
        git(tmpDir, "commit -m mainline");

        git(tmpDir, "checkout -q feature");
        const server = createServerInRepo(tmpDir);
        git(tmpDir, `rebase -q ${baseBranch}`);

        const doctor = parse(await server.callTool("doctor", {}));
        const transition = doctor["lastTransition"] as { kind?: string } | undefined;
        const semanticTransition = doctor["semanticTransition"] as {
          kind?: string;
          phase?: string | null;
          authority?: string;
        } | null;
        expect(transition).toBeDefined();
        expect(transition?.kind).toBe("rebase");
        expect(semanticTransition?.kind).toBe("rebase_phase");
        expect(semanticTransition?.phase).toBe("completed_or_cleared");
        expect(semanticTransition?.authority).toBe("repo_snapshot");

        const refView = parse(await server.callTool("graft_since", {
          base: baseBranch,
          head: "feature",
        }));
        expect(refView["layer"]).toBe("ref_view");
      } finally {
        cleanupTestRepo(tmpDir);
      }
    });
  });

  describe("stress", () => {
    it("keeps checkout epochs unique across repeated branch flips", async () => {
      const tmpDir = createTestRepo("graft-layered-worldline-stress-");
      try {
        fs.writeFileSync(path.join(tmpDir, "app.ts"), "export const base = 1;\n");
        git(tmpDir, "add -A");
        git(tmpDir, "commit -m base");
        const baseBranch = git(tmpDir, "rev-parse --abbrev-ref HEAD");

        git(tmpDir, "checkout -q -b feature");
        fs.writeFileSync(path.join(tmpDir, "app.ts"), "export const feature = 2;\n");
        git(tmpDir, "add -A");
        git(tmpDir, "commit -m feature");

        const server = createServerInRepo(tmpDir);
        const epochs: unknown[] = [];

        for (const target of [baseBranch, "feature", baseBranch, "feature", baseBranch]) {
          git(tmpDir, `checkout -q ${target}`);
          const doctor = parse(await server.callTool("doctor", {}));
          epochs.push(doctor["checkoutEpoch"]);
          const transition = doctor["lastTransition"] as { kind?: string } | undefined;
          expect(transition).toBeDefined();
          expect(transition?.kind).toBe("checkout");
        }

        expect(new Set(epochs).size).toBe(epochs.length);
      } finally {
        cleanupTestRepo(tmpDir);
      }
    });
  });
});
