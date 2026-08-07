// SPDX-License-Identifier: Apache-2.0
// © James Ross Ω FLYING•ROBOTS <https://github.com/flyingrobots>

import { describe, expect, it } from "vitest";
import { nodeFs } from "../../../src/adapters/node-fs.js";
import {
  LiveWorkspaceReadSource,
  SnapshotWorkspaceReadView,
  unsafeAdmittedWorkspaceSnapshotForTest,
  type AdmittedWorkspaceReadView,
  type SettledFile,
  type WorkspaceSnapshotFields,
} from "../../../src/operations/workspace-read-view.js";

const SOURCE = "export const value = 1;\n";

function regular(text: string): SettledFile {
  return { bytes: new TextEncoder().encode(text), entryKind: "regular" };
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

function liveSource(): LiveWorkspaceReadSource {
  return new LiveWorkspaceReadSource(nodeFs, "/live/workspace");
}

/**
 * These separate possessing settled bytes from being able to fetch bytes.
 *
 * One interface for both made the live filesystem an inhabitant of a contract
 * it cannot satisfy: it has no basis, so it supplied the string
 * "unsettled:filesystem" in a field whose contract is "the identity of the
 * exact bytes this view exposes". A sentinel meaning "this is not a basis"
 * living inside the basis field is the type system conceding it cannot say
 * what is true here.
 */
describe("workspace read authority", () => {
  it("does not let a live source present a basis", () => {
    // A basis identifies exact bytes. The live disk can be rewritten between
    // two calls, so anything it offered here would be a claim it cannot keep.
    expect("basisDigest" in liveSource()).toBe(false);
  });

  it("does not let a live source answer which paths are admitted", () => {
    // Enumerating the admitted set is a question only a settled observation
    // can answer. A rejecting implementation still puts the question on the
    // type, which is how callers come to ask it.
    expect("admittedPaths" in liveSource()).toBe(false);
  });

  it("derives the admitted path set from the aperture, not from settled bytes", () => {
    // The aperture is what the request admitted. Deriving the answer from
    // whichever byte entries happen to be present is how a partial settlement
    // reports itself as a complete one. Construction now forces the two sets
    // to agree, so declared order is what distinguishes them.
    const snapshot = unsafeAdmittedWorkspaceSnapshotForTest(
      snapshotFields({
        aperture: ["z.ts", "a.ts"],
        files: new Map([
          ["a.ts", regular(SOURCE)],
          ["z.ts", regular(SOURCE)],
        ]),
      }),
    );

    expect(new SnapshotWorkspaceReadView(snapshot).admittedPaths()).toEqual(["z.ts", "a.ts"]);
  });

  it("carries the request and settlement identity the snapshot was admitted under", () => {
    // A result that cannot name the observation behind it cannot be attributed
    // or replayed, and cannot be told apart from bytes someone assembled.
    const view = new SnapshotWorkspaceReadView(unsafeAdmittedWorkspaceSnapshotForTest(snapshotFields()));

    expect(view.evidence).toMatchObject({
      requestId: "req-0001",
      settlementId: "settle-0001",
      basisDigest: "b3:0000000000000000000000000000000000000000000000000000000000000001",
    });
  });

  it("refuses a live source where admitted evidence is required", () => {
    const admitted: AdmittedWorkspaceReadView = new SnapshotWorkspaceReadView(
      unsafeAdmittedWorkspaceSnapshotForTest(snapshotFields()),
    );
    expect(admitted.evidence.basisDigest).not.toBe("");

    // @ts-expect-error a live filesystem source is not admitted evidence
    const notAdmitted: AdmittedWorkspaceReadView = liveSource();
    expect(notAdmitted).toBeDefined();
  });
});
