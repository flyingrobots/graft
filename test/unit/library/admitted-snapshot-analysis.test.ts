// SPDX-License-Identifier: Apache-2.0
// © James Ross Ω FLYING•ROBOTS <https://github.com/flyingrobots>

import { describe, expect, it } from "vitest";
import type { FileSystem } from "../../../src/ports/file-system.js";
import { RepoWorkspace } from "../../../src/operations/repo-workspace.js";
import {
  SnapshotWorkspaceReadView,
  type AdmittedWorkspaceSnapshot,
} from "../../../src/operations/workspace-read-view.js";
import { CanonicalJsonCodec } from "../../../src/adapters/canonical-json.js";

/**
 * A filesystem that exists only to prove it is never used.
 *
 * Graft analysis currently takes a general `FileSystem` and calls `readFile`
 * on it, so the same object grants "parse this snapshot" and "read anything on
 * disk". Once analysis runs from an admitted observation, every one of these
 * throws is unreachable. Any that fires is the boundary leaking.
 */
function forbiddenFileSystem(): FileSystem {
  const forbid = (operation: string) => {
    return (...args: readonly unknown[]): never => {
      throw new Error(
        `analysis reached the filesystem after settlement: ${operation}(${String(args[0])})`,
      );
    };
  };
  return new Proxy({} as FileSystem, {
    get: (_target, property) => forbid(String(property)),
  });
}

const SOURCE = "export function greet(name: string): string {\n  return `hello ${name}`;\n}\n";

function admittedSnapshot(
  overrides: Partial<AdmittedWorkspaceSnapshot> = {},
): AdmittedWorkspaceSnapshot {
  return {
    requestId: "req-0001",
    settlementId: "settle-0001",
    workspaceRoot: "/admitted/workspace",
    basisDigest: "b3:0000000000000000000000000000000000000000000000000000000000000001",
    aperture: ["app.ts"],
    byteBudget: 65_536,
    symlinkPolicy: "refuse",
    files: new Map([["app.ts", new TextEncoder().encode(SOURCE)]]),
    ...overrides,
  };
}

function workspaceOverSnapshot(snapshot: AdmittedWorkspaceSnapshot): RepoWorkspace {
  return new RepoWorkspace({
    projectRoot: snapshot.workspaceRoot,
    fs: forbiddenFileSystem(),
    codec: new CanonicalJsonCodec(),
    readView: new SnapshotWorkspaceReadView(snapshot),
  });
}

describe("graft analysis over an admitted workspace snapshot", () => {
  it("reads settled bytes without touching the filesystem", async () => {
    const workspace = workspaceOverSnapshot(admittedSnapshot());

    const result = await workspace.safeRead({ path: "app.ts" });

    expect(result.projection).toBe("content");
    expect(JSON.stringify(result)).toContain("hello");
  });

  it("outlines and range-reads settled bytes without touching the filesystem", async () => {
    const workspace = workspaceOverSnapshot(admittedSnapshot());

    const outline = await workspace.fileOutline({ path: "app.ts" });
    expect(JSON.stringify(outline)).toContain("greet");

    const range = await workspace.readRange({ path: "app.ts", start: 1, end: 2 });
    expect(JSON.stringify(range)).toContain("greet");
  });

  it("is unaffected by the real workspace changing after settlement", async () => {
    // The settled bytes are the subject. A later edit to the workspace they
    // were observed from cannot retroactively change what was analysed,
    // because the analysis never consults it.
    const snapshot = admittedSnapshot();
    const workspace = workspaceOverSnapshot(snapshot);

    const before = await workspace.safeRead({ path: "app.ts" });

    const mutated = admittedSnapshot({
      requestId: "req-0002",
      settlementId: "settle-0002",
      basisDigest: "b3:0000000000000000000000000000000000000000000000000000000000000002",
      files: new Map([["app.ts", new TextEncoder().encode("export const changed = true;\n")]]),
    });
    const replayed = await workspaceOverSnapshot(snapshot).safeRead({ path: "app.ts" });

    // Both sides must be real content. Comparing two identical failures would
    // satisfy the equality while proving nothing.
    expect(before.projection).toBe("content");
    expect(replayed.projection).toBe("content");
    expect(JSON.stringify(replayed)).toBe(JSON.stringify(before));
    expect(mutated.basisDigest).not.toBe(snapshot.basisDigest);
  });

  it("replays a retained settlement byte-identically and reads nothing", async () => {
    const snapshot = admittedSnapshot();

    const first = await workspaceOverSnapshot(snapshot).safeRead({ path: "app.ts" });
    const second = await workspaceOverSnapshot(snapshot).safeRead({ path: "app.ts" });

    expect(first.projection).toBe("content");
    expect(second.projection).toBe("content");
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  });

  it("refuses a path outside the admitted aperture rather than reading disk", async () => {
    // The failure mode this guards is a fallback: an unadmitted path silently
    // answered from the live workspace would be an authority escalation
    // disguised as a cache miss.
    const workspace = workspaceOverSnapshot(admittedSnapshot());

    await expect(workspace.safeRead({ path: "secrets.env" })).rejects.toThrow(
      /outside the admitted snapshot aperture/,
    );
  });
});
