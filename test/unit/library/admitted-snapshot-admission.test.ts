// SPDX-License-Identifier: Apache-2.0
// © James Ross Ω FLYING•ROBOTS <https://github.com/flyingrobots>

import { describe, expect, it } from "vitest";
import {
  SnapshotAdmissionError,
  SnapshotWorkspaceReadView,
  unsafeAdmittedWorkspaceSnapshotForTest,
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

function captureAdmissionError(fields: WorkspaceSnapshotFields): SnapshotAdmissionError {
  try {
    unsafeAdmittedWorkspaceSnapshotForTest(fields);
  } catch (error) {
    expect(error).toBeInstanceOf(SnapshotAdmissionError);
    return error as SnapshotAdmissionError;
  }
  throw new Error("Expected snapshot admission to fail");
}

/**
 * These assert admission, not analysis.
 *
 * A snapshot declares a byte budget, a symlink policy, and an aperture. Until
 * construction checks them, those fields are decoration: analysis downstream
 * would read them, believe them, and be wrong. Each case below is a snapshot
 * that contradicts its own declaration, and each must be refused where the
 * contradiction is visible — at construction — rather than surviving to become
 * a read-time surprise.
 */
describe("admitting a workspace snapshot", () => {
  it("admits a snapshot that honours every field it declares", () => {
    // The negative cases below are only meaningful if the positive one passes;
    // a constructor that refused everything would satisfy them all.
    expect(() => unsafeAdmittedWorkspaceSnapshotForTest(snapshotFields())).not.toThrow();
  });

  it("validates the same defensive file copy that it retains", async () => {
    const files = new Map([["app.ts", regular(SOURCE)]]);
    let traversal = 0;
    Object.defineProperty(files, Symbol.iterator, {
      value: () => {
        traversal += 1;
        const entry = traversal === 1
          ? regular(SOURCE)
          : { bytes: new TextEncoder().encode("unvalidated\n"), entryKind: "symlink" as const };
        return new Map([["app.ts", entry]])[Symbol.iterator]();
      },
    });

    const snapshot = unsafeAdmittedWorkspaceSnapshotForTest(snapshotFields({ files }));
    const view = new SnapshotWorkspaceReadView(snapshot);

    expect(new TextDecoder().decode(await view.readBytes("app.ts"))).toBe(SOURCE);
  });

  it("refuses settled bytes that exceed the declared byte budget", () => {
    // The budget bounds what the observation was permitted to read. A
    // settlement carrying more than it was allowed to did not honour the
    // request, whatever it claims about itself.
    const fields = snapshotFields({
      byteBudget: 8,
      files: new Map([["app.ts", regular("x".repeat(9))]]),
    });

    expect(captureAdmissionError(fields).code).toBe("BYTE_BUDGET_EXCEEDED");
  });

  it("admits settled bytes exactly at the declared byte budget", () => {
    // The boundary is inclusive. A test that only proved "9 > 8 is refused"
    // would also pass against an implementation that refused 8.
    const fields = snapshotFields({
      byteBudget: 8,
      files: new Map([["app.ts", regular("x".repeat(8))]]),
    });

    expect(() => unsafeAdmittedWorkspaceSnapshotForTest(fields)).not.toThrow();
  });

  it.each([
    ["NaN", Number.NaN],
    ["infinity", Number.POSITIVE_INFINITY],
    ["negative", -1],
    ["fractional", 1.5],
    ["unsafe integer", Number.MAX_SAFE_INTEGER + 1],
  ])("refuses a %s byte budget", (_name, byteBudget) => {
    const fields = snapshotFields({
      aperture: [],
      files: new Map(),
      byteBudget,
    });

    expect(captureAdmissionError(fields).code).toBe("INVALID_BYTE_BUDGET");
  });

  it("admits an empty settlement with a zero byte budget", () => {
    const fields = snapshotFields({
      aperture: [],
      files: new Map(),
      byteBudget: 0,
    });

    expect(() => unsafeAdmittedWorkspaceSnapshotForTest(fields)).not.toThrow();
  });

  it("sums the byte budget across every settled file", () => {
    // Catches a per-file check standing in for a total. Neither file exceeds
    // the budget alone; together they do.
    const fields = snapshotFields({
      byteBudget: 10,
      aperture: ["a.ts", "b.ts"],
      files: new Map([
        ["a.ts", regular("x".repeat(6))],
        ["b.ts", regular("y".repeat(6))],
      ]),
    });

    expect(captureAdmissionError(fields).code).toBe("BYTE_BUDGET_EXCEEDED");
  });

  it("refuses a path the observation recorded as a symlink", () => {
    // symlinkPolicy is "refuse". A settlement that reports a symlink anyway
    // contradicts its own declaration, and admitting it would let a link
    // escape the aperture the request bounded.
    const fields = snapshotFields({
      files: new Map([["app.ts", { bytes: new TextEncoder().encode(SOURCE), entryKind: "symlink" as const }]]),
    });

    expect(captureAdmissionError(fields).code).toBe("SYMLINK_REFUSED");
  });

  it("refuses an aperture path carrying no settled bytes", () => {
    // The request admitted this path and the settlement did not deliver it.
    // Surfacing that later as a read-time error puts the contradiction a long
    // way from its cause, and lets analysis begin against an incomplete
    // observation it believes is total.
    const fields = snapshotFields({
      aperture: ["app.ts", "missing.ts"],
      files: new Map([["app.ts", regular(SOURCE)]]),
    });

    expect(captureAdmissionError(fields).code).toBe("MISSING_APERTURE_BYTES");
  });

  it("refuses settled bytes for a path outside the aperture", () => {
    // Bytes the request never admitted. The read view would refuse to serve
    // them, so retaining them means holding unadmitted material and calling it
    // evidence.
    const fields = snapshotFields({
      aperture: ["app.ts"],
      files: new Map([
        ["app.ts", regular(SOURCE)],
        ["secrets.env", regular("TOKEN=leaked\n")],
      ]),
    });

    expect(captureAdmissionError(fields).code).toBe("OUTSIDE_APERTURE");
  });

  it("refuses an aperture that repeats a path", () => {
    // A duplicate makes the aperture's length disagree with the path set it
    // denotes, so any budget or totality check that counts entries rather than
    // distinct paths silently measures the wrong thing.
    const fields = snapshotFields({
      aperture: ["app.ts", "app.ts"],
      files: new Map([["app.ts", regular(SOURCE)]]),
    });

    expect(captureAdmissionError(fields).code).toBe("DUPLICATE_APERTURE_PATH");
  });
});
