// SPDX-License-Identifier: Apache-2.0
// © James Ross Ω FLYING•ROBOTS <https://github.com/flyingrobots>

import { describe, expect, it } from "vitest";
import { RepoWorkspace } from "../../../src/operations/repo-workspace.js";
import { CanonicalJsonCodec } from "../../../src/adapters/canonical-json.js";
import {
  SnapshotWorkspaceReadView,
  unsafeAdmittedWorkspaceSnapshotForTest,
  type SettledFile,
  type WorkspaceReadView,
  type WorkspaceSnapshotFields,
} from "../../../src/operations/workspace-read-view.js";

const SOURCE = "export const value = 1;\n";
/** Lone continuation bytes: not a valid UTF-8 sequence under any decoder. */
const NOT_UTF8 = Uint8Array.from([0xff, 0xfe, 0x00, 0x80]);

function settled(bytes: Uint8Array | string): SettledFile {
  return {
    bytes: typeof bytes === "string" ? new TextEncoder().encode(bytes) : bytes,
    entryKind: "regular",
  };
}

function snapshotFields(overrides: Partial<WorkspaceSnapshotFields> = {}): WorkspaceSnapshotFields {
  return {
    requestId: "req-0001",
    settlementId: "settle-0001",
    workspaceRoot: "/admitted/workspace",
    basisDigest: "b3:0000000000000000000000000000000000000000000000000000000000000001",
    aperture: ["app.ts"],
    byteBudget: 65_536,
    symlinkPolicy: "refuse",
    files: new Map([["app.ts", settled(SOURCE)]]),
    ...overrides,
  };
}

function workspaceOver(view: WorkspaceReadView): RepoWorkspace {
  return new RepoWorkspace({
    projectRoot: "/admitted/workspace",
    codec: new CanonicalJsonCodec(),
    readView: view,
  });
}

function snapshotWorkspace(overrides: Partial<WorkspaceSnapshotFields> = {}): RepoWorkspace {
  return workspaceOver(
    new SnapshotWorkspaceReadView(unsafeAdmittedWorkspaceSnapshotForTest(snapshotFields(overrides))),
  );
}

/** A view whose every path is absent, to separate absence from refusal. */
const missingEverything: WorkspaceReadView = {
  readBytes: () => Promise.reject(new Error("not found")),
};

/**
 * These keep four different answers from collapsing into one.
 *
 * "You may not read this", "this does not exist", "these bytes have no text
 * projection", and "policy refuses this file" are constitutionally different
 * outcomes. Every one of them used to be reachable as a bare not-found on at
 * least one projection, which tells a caller a file is absent when what is
 * true is that they were not allowed to see it.
 */
describe("refusal fidelity across projections", () => {
  describe("an unadmitted path stays an authority refusal", () => {
    // Not a returned result: the aperture did not grant this path, and a
    // projection-shaped answer would let a caller treat it as a cache miss and
    // move on. Previously only safeRead preserved this; the others folded it
    // into not-found.
    it("on safeRead", async () => {
      await expect(snapshotWorkspace().safeRead({ path: "secrets.env" })).rejects.toThrow(
        /outside the admitted snapshot aperture/,
      );
    });

    it("on fileOutline", async () => {
      await expect(snapshotWorkspace().fileOutline({ path: "secrets.env" })).rejects.toThrow(
        /outside the admitted snapshot aperture/,
      );
    });

    it("on readRange", async () => {
      await expect(
        snapshotWorkspace().readRange({ path: "secrets.env", start: 1, end: 2 }),
      ).rejects.toThrow(/outside the admitted snapshot aperture/);
    });

    it("on changedSince", async () => {
      await expect(snapshotWorkspace().changedSince({ path: "secrets.env" })).rejects.toThrow(
        /outside the admitted snapshot aperture/,
      );
    });
  });

  describe("an absent path is reported as absent, not as a refusal", () => {
    // The other half of the pair. If refusal and absence were merged in either
    // direction the tests above would pass against an implementation that
    // called everything a refusal.
    it("on safeRead", async () => {
      const result = await workspaceOver(missingEverything).safeRead({ path: "gone.ts" });
      expect(result).toMatchObject({ projection: "error", reason: "NOT_FOUND" });
    });

    it("on fileOutline", async () => {
      const result = await workspaceOver(missingEverything).fileOutline({ path: "gone.ts" });
      expect(result).toMatchObject({ reason: "NOT_FOUND" });
    });

    it("on readRange", async () => {
      const result = await workspaceOver(missingEverything).readRange({
        path: "gone.ts",
        start: 1,
        end: 2,
      });
      expect(result).toMatchObject({ reason: "NOT_FOUND" });
    });

    it("on changedSince", async () => {
      const result = await workspaceOver(missingEverything).changedSince({ path: "gone.ts" });
      expect(result).toEqual({ status: "file_not_found" });
    });
  });

  describe("bytes with no text projection are refused, never substituted", () => {
    // A .ts path, deliberately. A .bin or .png is refused as BINARY by policy
    // before encoding is ever considered, so it cannot reach this branch.
    // INVALID_UTF8 is only for a path policy permits whose bytes have no
    // faithful text projection.
    const invalid = { aperture: ["app.ts"], files: new Map([["app.ts", settled(NOT_UTF8)]]) };

    it("does not return replacement characters from safeRead", async () => {
      // The exact regression: reading raw bytes and calling
      // Buffer.toString("utf-8") yields U+FFFD per invalid sequence, which is
      // content the observation never settled carrying the identity of content
      // it did. Asserting the absence of U+FFFD is the point — a test that
      // only checked the reason would pass against an implementation that
      // returned both.
      const result = await snapshotWorkspace(invalid).safeRead({ path: "app.ts" });

      expect(result).toMatchObject({ projection: "refused", reason: "INVALID_UTF8" });
      expect(JSON.stringify(result)).not.toContain("�");
    });

    it("does not return replacement characters from readRange", async () => {
      const result = await snapshotWorkspace(invalid).readRange({
        path: "app.ts",
        start: 1,
        end: 2,
      });

      expect(result).toMatchObject({ reason: "INVALID_UTF8" });
      expect(JSON.stringify(result)).not.toContain("�");
    });

    it("does not return replacement characters from fileOutline", async () => {
      const result = await snapshotWorkspace(invalid).fileOutline({ path: "app.ts" });

      expect(result).toMatchObject({ reason: "INVALID_UTF8" });
      expect(JSON.stringify(result)).not.toContain("�");
    });

    it("keeps the settled bytes retrievable", async () => {
      // Refusing the text projection must not mean losing the observation.
      const view = new SnapshotWorkspaceReadView(
        unsafeAdmittedWorkspaceSnapshotForTest(snapshotFields(invalid)),
      );

      expect(Array.from(await view.readBytes("app.ts"))).toEqual(Array.from(NOT_UTF8));
    });
  });

  it("refuses a banned path for being banned, not for its encoding", async () => {
    // Both conditions hold at once: a .env file is policy-refused and its
    // content here is valid text. An implementation that checked encoding
    // first would answer INVALID_UTF8 for binary banned files and lose the
    // reason the caller needs.
    const result = await snapshotWorkspace({
      aperture: [".env"],
      files: new Map([[".env", settled("TOKEN=abc\n")]]),
    }).safeRead({ path: ".env" });

    expect(result).toMatchObject({ projection: "refused" });
    expect(result.reason).not.toBe("INVALID_UTF8");
  });

  it("refuses a binary banned path by policy rather than by encoding", async () => {
    // The ordering mutant this exists to catch: a PNG is both banned by policy
    // and undecodable. Policy has to win, or the answer stops naming why.
    const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0xff, 0xfe]);
    const result = await snapshotWorkspace({
      aperture: ["logo.png"],
      files: new Map([["logo.png", settled(png)]]),
    }).safeRead({ path: "logo.png" });

    expect(result).toMatchObject({ projection: "refused" });
    expect(result.reason).not.toBe("INVALID_UTF8");
  });
});
