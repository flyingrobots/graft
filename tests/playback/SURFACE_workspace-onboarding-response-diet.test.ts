import { afterEach, describe, expect, it } from "vitest";
import * as fs from "node:fs";
import { cleanupTestRepo, createCommittedTestRepo } from "../../test/helpers/git.js";
import { createManagedDaemonServer, createServerInRepo, parse } from "../../test/helpers/mcp.js";

const cleanups: (() => void)[] = [];

afterEach(() => {
  while (cleanups.length > 0) {
    cleanups.pop()!();
  }
});

function createRepo(): string {
  const repoDir = createCommittedTestRepo("graft-playback-response-diet-", {
    "app.ts": [
      "export function greet(name: string): string {",
      "  return `hello ${name}`;",
      "}",
      "",
      "export function wave(): string {",
      "  return \"workspace\";",
      "}",
      "",
    ].join("\n"),
  });
  cleanups.push(() => {
    cleanupTestRepo(repoDir);
  });
  return fs.realpathSync(repoDir);
}

async function expectOneCallAuthorizeAndBind(): Promise<void> {
  const repoDir = createRepo();
  const server = createManagedDaemonServer(cleanups);

  const bind = parse(await server.callTool("workspace_bind", {
    cwd: repoDir,
    authorize: true,
  }));

  expect(bind).toEqual(expect.objectContaining({
    ok: true,
    authorized: true,
    bindState: "bound",
    worktreeRoot: repoDir,
  }));
}

async function expectCompactReceipt(): Promise<void> {
  const repoDir = createRepo();
  const server = createServerInRepo(repoDir);

  const full = parse(await server.callTool("safe_read", { path: "app.ts" }));
  const compact = parse(await server.callTool("safe_read", {
    path: "app.ts",
    receipt: "compact",
  }));

  expect((full["_receipt"] as Record<string, unknown>)["cumulative"]).toBeDefined();
  expect((compact["_receipt"] as Record<string, unknown>)["cumulative"]).toBeUndefined();
  expect((compact["_receipt"] as Record<string, unknown>)["returnedBytes"]).toEqual(expect.any(Number));
}

describe("SURFACE_workspace-onboarding-response-diet playback", () => {
  it("Can a new daemon client intentionally authorize and bind a workspace without discovering `workspace_authorize` through a second failure?", async () => {
    await expectOneCallAuthorizeAndBind();
  });

  it("Can a client reduce small response overhead without losing the default observability contract for existing consumers?", async () => {
    await expectCompactReceipt();
  });

  it("Does `workspace_bind({ cwd, authorize: true })` authorize and bind a previously unauthorized daemon workspace?", async () => {
    await expectOneCallAuthorizeAndBind();
  });

  it("Does a denied bind return `nextCall.tool: \"workspace_authorize\"` with the resolved workspace path?", async () => {
    const repoDir = createRepo();
    const server = createManagedDaemonServer(cleanups);

    const bind = parse(await server.callTool("workspace_bind", { cwd: repoDir }));

    expect(bind).toEqual(expect.objectContaining({
      ok: false,
      errorCode: "WORKSPACE_NOT_AUTHORIZED",
      nextCall: {
        tool: "workspace_authorize",
        args: { cwd: repoDir },
      },
    }));
  });

  it("Do compact receipts omit `cumulative` while retaining enough metadata for per-call accounting?", async () => {
    await expectCompactReceipt();
  });

  it("Do default `file_outline` calls still include both `outline` and `jumpTable`?", async () => {
    const repoDir = createRepo();
    const server = createServerInRepo(repoDir);

    const outline = parse(await server.callTool("file_outline", { path: "app.ts" }));

    expect(outline["outline"]).toEqual(expect.any(Array));
    expect(outline["jumpTable"]).toEqual(expect.any(Array));
  });

  it("Do `file_outline` compact modes omit the unrequested structural half?", async () => {
    const repoDir = createRepo();
    const server = createServerInRepo(repoDir);

    const outlineOnly = parse(await server.callTool("file_outline", {
      path: "app.ts",
      view: "outline",
    }));
    const jumpOnly = parse(await server.callTool("file_outline", {
      path: "app.ts",
      view: "jump_table",
    }));

    expect(outlineOnly["outline"]).toEqual(expect.any(Array));
    expect(outlineOnly["jumpTable"]).toBeUndefined();
    expect(jumpOnly["outline"]).toBeUndefined();
    expect(jumpOnly["jumpTable"]).toEqual(expect.any(Array));
  });
});
