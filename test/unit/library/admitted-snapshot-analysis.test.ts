// SPDX-License-Identifier: Apache-2.0
// © James Ross Ω FLYING•ROBOTS <https://github.com/flyingrobots>

import { describe, expect, it } from "vitest";
import { RepoWorkspace } from "../../../src/operations/repo-workspace.js";
import {
  SnapshotWorkspaceReadView,
  unsafeAdmittedWorkspaceSnapshotForTest,
  type AdmittedWorkspaceSnapshot,
  type SettledFile,
  type WorkspaceSnapshotFields,
} from "../../../src/operations/workspace-read-view.js";
import { CanonicalJsonCodec } from "../../../src/adapters/canonical-json.js";

const SOURCE = "export function greet(name: string): string {\n  return `hello ${name}`;\n}\n";

function regular(bytes: Uint8Array | string): SettledFile {
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
    files: new Map([["app.ts", regular(SOURCE)]]),
    ...overrides,
  };
}

function admittedSnapshot(
  overrides: Partial<WorkspaceSnapshotFields> = {},
): AdmittedWorkspaceSnapshot {
  return unsafeAdmittedWorkspaceSnapshotForTest(snapshotFields(overrides));
}

/**
 * A workspace whose analysis path holds exactly one read authority.
 *
 * No filesystem is supplied because the `readView` options branch forbids one
 * beside a settled view. That is the property under test: snapshot-backed
 * analysis cannot also reach the live disk and choose between two sources.
 */
function workspaceOverSnapshot(snapshot: AdmittedWorkspaceSnapshot): RepoWorkspace {
  return new RepoWorkspace({
    projectRoot: snapshot.workspaceRoot,
    codec: new CanonicalJsonCodec(),
    readView: new SnapshotWorkspaceReadView(snapshot),
  });
}

describe("graft analysis over an admitted workspace snapshot", () => {
  it("reads settled bytes", async () => {
    const workspace = workspaceOverSnapshot(admittedSnapshot());

    const result = await workspace.safeRead({ path: "app.ts" });

    expect(result).toMatchObject({ projection: "content", content: SOURCE });
  });

  it("outlines and range-reads settled bytes", async () => {
    const workspace = workspaceOverSnapshot(admittedSnapshot());
    const outline = await workspace.fileOutline({ path: "app.ts" });
    const range = await workspace.readRange({ path: "app.ts", start: 1, end: 2 });

    expect(outline).toMatchObject({
      outline: expect.arrayContaining([expect.objectContaining({ name: "greet" })]),
    });
    expect(range).toMatchObject({
      content: SOURCE.split("\n").slice(0, 2).join("\n"),
    });
  });

  it("retains the admitted bytes when the source collections are mutated", async () => {
    // The failure this catches is a view that aliases its caller's data. If it
    // holds the same Map and the same arrays, whoever assembled the snapshot
    // can still rewrite what analysis later calls settled evidence.
    const files = new Map([["app.ts", regular(SOURCE)]]);
    const aperture = ["app.ts"];
    const snapshot = unsafeAdmittedWorkspaceSnapshotForTest(snapshotFields({ files, aperture }));
    const view = new SnapshotWorkspaceReadView(snapshot);

    files.set("app.ts", regular("export const rewritten = true;\n"));
    files.set("secrets.env", regular("TOKEN=leaked\n"));
    aperture.push("secrets.env");
    const original = files.get("app.ts");
    if (original !== undefined) {
      original.bytes.fill(0x41);
    }

    expect(new TextDecoder().decode(await view.readBytes("app.ts"))).toBe(SOURCE);
    await expect(view.readBytes("secrets.env")).rejects.toThrow(
      /outside the admitted snapshot aperture/,
    );
    expect(view.admittedPaths()).toEqual(["app.ts"]);
  });

  it("does not expose retained bytes for mutation after admission", async () => {
    const snapshot = admittedSnapshot();
    const exposed = Reflect.get(snapshot, "files") as ReadonlyMap<string, SettledFile> | undefined;
    exposed?.get("app.ts")?.bytes.fill(0x41);

    const view = new SnapshotWorkspaceReadView(snapshot);

    expect(Reflect.has(snapshot, "files")).toBe(false);
    expect(new TextDecoder().decode(await view.readBytes("app.ts"))).toBe(SOURCE);
  });

  it("does not let admitted descriptors or evidence be rewritten", () => {
    const snapshot = admittedSnapshot();

    expect(() => Object.assign(snapshot, { basisDigest: "forged", byteBudget: 0 })).toThrow();
    expect(() => (snapshot.aperture as string[]).push("secrets.env")).toThrow();

    const view = new SnapshotWorkspaceReadView(snapshot);
    expect(() => Object.assign(view.evidence, { basisDigest: "forged" })).toThrow();
    expect(() => Object.assign(view, {
      evidence: { ...view.evidence, basisDigest: "forged" },
    })).toThrow();
    expect(view.evidence.basisDigest).toBe(
      "b3:0000000000000000000000000000000000000000000000000000000000000001",
    );
    expect(view.admittedPaths()).toEqual(["app.ts"]);
  });

  it("keeps retained view state out of runtime properties", async () => {
    const view = new SnapshotWorkspaceReadView(admittedSnapshot());
    const forgedBytes = new Map([
      ["app.ts", new TextEncoder().encode("export const forged = true;\n")],
      ["secrets.env", new TextEncoder().encode("TOKEN=leaked\n")],
    ]);
    const exposedBytes = Reflect.get(view, "bytes") as Map<string, Uint8Array> | undefined;
    const exposedAdmitted = Reflect.get(view, "admitted") as Set<string> | undefined;

    exposedBytes?.set("app.ts", forgedBytes.get("app.ts")!);
    exposedAdmitted?.add("secrets.env");
    try {
      Object.assign(view, {
        bytes: forgedBytes,
        admitted: new Set(["app.ts", "secrets.env"]),
        aperture: ["app.ts", "secrets.env"],
      });
    } catch {
      // A frozen implementation rejects injection; retained behavior is the invariant.
    }

    expect(new TextDecoder().decode(await view.readBytes("app.ts"))).toBe(SOURCE);
    await expect(view.readBytes("secrets.env")).rejects.toThrow(
      /outside the admitted snapshot aperture/,
    );
    expect(view.admittedPaths()).toEqual(["app.ts"]);
  });

  it("cannot be rewritten through the bytes it returns", async () => {
    const view = new SnapshotWorkspaceReadView(admittedSnapshot());

    (await view.readBytes("app.ts")).fill(0x41);

    expect(new TextDecoder().decode(await view.readBytes("app.ts"))).toBe(SOURCE);
  });

  it("replays a retained settlement byte-identically", async () => {
    const snapshot = admittedSnapshot();

    const first = await workspaceOverSnapshot(snapshot).safeRead({ path: "app.ts" });
    const second = await workspaceOverSnapshot(snapshot).safeRead({ path: "app.ts" });

    // Both sides must be real content. Comparing two identical failures would
    // satisfy the equality while proving nothing.
    expect(first.projection).toBe("content");
    expect(second.projection).toBe("content");
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  });

  it("refuses a path outside the admitted aperture", async () => {
    // A fallback here would be an authority escalation disguised as a cache
    // miss: the observation did not grant this path.
    const workspace = workspaceOverSnapshot(admittedSnapshot());

    await expect(workspace.safeRead({ path: "secrets.env" })).rejects.toThrow(
      /outside the admitted snapshot aperture/,
    );
  });

  it("preserves bytes that are not valid UTF-8", async () => {
    // A basis identifies bytes. A seam that decoded on the way through would
    // either throw here or silently substitute replacement characters, and
    // neither is what the observation settled.
    const invalid = Uint8Array.from([0xff, 0xfe, 0x00, 0x80]);
    const view = new SnapshotWorkspaceReadView(
      admittedSnapshot({
        aperture: ["blob.bin"],
        files: new Map([["blob.bin", regular(invalid)]]),
      }),
    );

    expect(Array.from(await view.readBytes("blob.bin"))).toEqual(Array.from(invalid));
  });
});
