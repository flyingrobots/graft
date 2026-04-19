import { afterEach, describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { handlePostReadHook } from "../../../src/hooks/posttooluse-read.js";
import { handleReadHook } from "../../../src/hooks/pretooluse-read.js";
import { cleanupTestRepo, createTestRepo, git } from "../../helpers/git.js";
import {
  expectGovernedReadGuidance,
  expectPostReadEducation,
  makeReadHookInput,
  refusalReasonFromHook,
} from "../../helpers/hooks.js";
import { createServerInRepo, parse } from "../../helpers/mcp.js";

function expectRefusedProjection(parsed: Record<string, unknown>, reason: string): void {
  expect(parsed["projection"]).toBe("refused");
  expect(parsed["reason"]).toBe(reason);
}

function expectRefusedStatus(parsed: Record<string, unknown>, reason: string): void {
  expect(parsed["status"]).toBe("refused");
  expect(parsed["reason"]).toBe(reason);
}

const hardDenialCases: readonly {
  name: string;
  reason: string;
  relativePath: string;
  setup: (repoDir: string) => void;
}[] = [
  {
    name: "binary",
    reason: "BINARY",
    relativePath: "image.png",
    setup(repoDir: string): void {
      fs.writeFileSync(
        path.join(repoDir, "image.png"),
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x01, 0x02, 0x03]),
      );
    },
  },
  {
    name: "secret",
    reason: "SECRET",
    relativePath: ".env",
    setup(repoDir: string): void {
      fs.writeFileSync(path.join(repoDir, ".env"), "API_KEY=super-secret\n");
    },
  },
  {
    name: "graftignore",
    reason: "GRAFTIGNORE",
    relativePath: "generated/hidden.ts",
    setup(repoDir: string): void {
      fs.writeFileSync(path.join(repoDir, ".graftignore"), "generated/**\n");
      fs.mkdirSync(path.join(repoDir, "generated"), { recursive: true });
      fs.writeFileSync(
        path.join(repoDir, "generated", "hidden.ts"),
        "export function hiddenThing(): boolean {\n  return true;\n}\n",
      );
    },
  },
] as const;

describe("policy: cross-surface parity", () => {
  const cleanups: string[] = [];

  afterEach(() => {
    while (cleanups.length > 0) {
      cleanupTestRepo(cleanups.pop()!);
    }
  });

  it.each(hardDenialCases)(
    "keeps hard denial parity for $name across hooks and bounded-read MCP tools",
    async ({ setup, relativePath, reason }) => {
      const repoDir = createTestRepo(`graft-policy-parity-${reason.toLowerCase()}-`);
      cleanups.push(repoDir);
      setup(repoDir);

      const absolutePath = path.join(repoDir, relativePath);
      const server = createServerInRepo(repoDir);

      const pre = handleReadHook(
        makeReadHookInput(absolutePath, repoDir, "PreToolUse"),
      );
      expect(pre.exitCode).toBe(2);
      expect(refusalReasonFromHook(pre)).toBe(reason);

      const post = await handlePostReadHook(
        makeReadHookInput(absolutePath, repoDir, "PostToolUse"),
      );
      expect(post.exitCode).toBe(0);
      expect(post.stderr).toBe("");

      expectRefusedProjection(parse(await server.callTool("safe_read", { path: relativePath })), reason);
      expectRefusedProjection(parse(await server.callTool("file_outline", { path: relativePath })), reason);
      expectRefusedProjection(parse(await server.callTool("read_range", {
        path: relativePath,
        start: 1,
        end: 1,
      })), reason);
      expectRefusedStatus(parse(await server.callTool("changed_since", { path: relativePath })), reason);
    },
  );

  it("keeps .graftignore denial parity across precision and structural MCP tools", async () => {
    const repoDir = createTestRepo("graft-policy-parity-precision-structural-");
    cleanups.push(repoDir);

    fs.writeFileSync(path.join(repoDir, ".graftignore"), "generated/**\n");
    fs.mkdirSync(path.join(repoDir, "generated"), { recursive: true });
    fs.writeFileSync(
      path.join(repoDir, "generated", "hidden.ts"),
      "export function hiddenThing(): boolean {\n  return true;\n}\n",
    );
    git(repoDir, "add -A");
    git(repoDir, "commit -m init");

    fs.writeFileSync(
      path.join(repoDir, "generated", "hidden.ts"),
      "export function hiddenThing(): boolean {\n  return false;\n}\n",
    );

    const server = createServerInRepo(repoDir);

    expectRefusedProjection(parse(await server.callTool("code_show", {
      symbol: "hiddenThing",
      path: "generated/hidden.ts",
    })), "GRAFTIGNORE");

    expectRefusedProjection(parse(await server.callTool("code_find", {
      query: "hidden*",
    })), "GRAFTIGNORE");

    const mapResult = parse(await server.callTool("graft_map", {}));
    expect(mapResult["files"]).toEqual([]);
    expect(mapResult["refused"]).toEqual([
      expect.objectContaining({ path: "generated/hidden.ts", reason: "GRAFTIGNORE" }),
    ]);

    const diffResult = parse(await server.callTool("graft_diff", {}));
    expect(diffResult["files"]).toEqual([]);
    expect(diffResult["refused"]).toEqual([
      expect.objectContaining({ path: "generated/hidden.ts", reason: "GRAFTIGNORE" }),
    ]);
  });

  it("keeps governed-read behavior honest across hooks and safe_read", async () => {
    const repoDir = createTestRepo("graft-policy-parity-soft-");
    cleanups.push(repoDir);

    const oversizedPath = path.join(repoDir, "oversized.ts");
    fs.writeFileSync(
      oversizedPath,
      Array.from({ length: 220 }, (_, i) => `export const value${String(i)} = ${String(i)};`).join("\n"),
    );

    const pre = handleReadHook(
      makeReadHookInput(oversizedPath, repoDir, "PreToolUse"),
    );
    expect(pre.exitCode).toBe(2);
    expectGovernedReadGuidance(pre.stderr);

    const post = await handlePostReadHook(
      makeReadHookInput(oversizedPath, repoDir, "PostToolUse"),
    );
    expect(post.exitCode).toBe(0);
    expectPostReadEducation(post.stderr);

    const earlyServer = createServerInRepo(repoDir);
    const staticResult = parse(await earlyServer.callTool("safe_read", { path: "oversized.ts" }));
    expect(staticResult["projection"]).toBe("outline");
    expect(staticResult["reason"]).toBe("OUTLINE");

    const pressurePath = path.join(repoDir, "pressure.ts");
    fs.writeFileSync(
      pressurePath,
      `export const pressure = "${"x".repeat(11_000)}";\n`,
    );

    const baselineServer = createServerInRepo(repoDir);
    const baseline = parse(await baselineServer.callTool("safe_read", { path: "pressure.ts" }));
    expect(baseline["projection"]).toBe("content");
    expect(baseline["reason"]).toBe("CONTENT");

    const sessionServer = createServerInRepo(repoDir);
    sessionServer.injectSessionMessages(150);
    const sessionResult = parse(await sessionServer.callTool("safe_read", { path: "pressure.ts" }));
    expect(sessionResult["projection"]).toBe("outline");
    expect(sessionResult["reason"]).toBe("SESSION_CAP");

    const budgetServer = createServerInRepo(repoDir);
    await budgetServer.callTool("set_budget", { bytes: 100_000 });
    const budgetResult = parse(await budgetServer.callTool("safe_read", { path: "pressure.ts" }));
    expect(budgetResult["projection"]).toBe("outline");
    expect(budgetResult["reason"]).toBe("BUDGET_CAP");
  }, 10_000);

  it("keeps historical denial parity for git-backed precision and structural reads", async () => {
    const repoDir = createTestRepo("graft-policy-parity-historical-");
    cleanups.push(repoDir);

    fs.writeFileSync(path.join(repoDir, ".graftignore"), "generated/**\n");
    fs.mkdirSync(path.join(repoDir, "generated"), { recursive: true });
    fs.writeFileSync(
      path.join(repoDir, "generated", "hidden.ts"),
      "export function hiddenThing(): boolean {\n  return true;\n}\n",
    );
    git(repoDir, "add -A");
    git(repoDir, "commit -m v1");
    const base = git(repoDir, "rev-parse HEAD");

    fs.writeFileSync(
      path.join(repoDir, "generated", "hidden.ts"),
      "export function hiddenThing(): boolean {\n  return false;\n}\n",
    );
    git(repoDir, "add -A");
    git(repoDir, "commit -m v2");
    const head = git(repoDir, "rev-parse HEAD");

    const server = createServerInRepo(repoDir);

    expectRefusedProjection(parse(await server.callTool("code_show", {
      symbol: "hiddenThing",
      path: "generated/hidden.ts",
      ref: base,
    })), "GRAFTIGNORE");

    const diffResult = parse(await server.callTool("graft_diff", {
      base,
      head,
    }));
    expect(diffResult["files"]).toEqual([]);
    expect(diffResult["refused"]).toEqual([
      expect.objectContaining({ path: "generated/hidden.ts", reason: "GRAFTIGNORE" }),
    ]);

    const sinceResult = parse(await server.callTool("graft_since", {
      base,
      head,
    }));
    expect(sinceResult["files"]).toEqual([]);
    expect(sinceResult["refused"]).toEqual([
      expect.objectContaining({ path: "generated/hidden.ts", reason: "GRAFTIGNORE" }),
    ]);
  });
});
