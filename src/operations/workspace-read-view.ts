// SPDX-License-Identifier: Apache-2.0
// © James Ross Ω FLYING•ROBOTS <https://github.com/flyingrobots>

/**
 * The bytes Graft analysis is permitted to see, and nothing else.
 *
 * Analysis today receives a general `FileSystem` and reaches through it to the
 * live disk, so "read the workspace" and "read anything" are one authority.
 * A read view separates them: it carries settled bytes and cannot reach past
 * them, which is what lets analysis run after an observation has settled
 * rather than racing the disk it is describing.
 */
export interface WorkspaceReadView {
  /** Identity of the exact bytes this view exposes. */
  readonly basisDigest: string;
  /** Returns the settled bytes for a path, or undefined when unadmitted. */
  readFile(path: string): string | undefined;
  /** Every path this view admits. */
  listFiles(): readonly string[];
}

/**
 * An immutable observation Echo has settled.
 *
 * The request-side fields are retained because analysis must be attributable
 * to the observation that produced it: a snapshot with no request or
 * settlement identity cannot be replayed, and cannot be distinguished from
 * bytes someone assembled by hand.
 */
export interface AdmittedWorkspaceSnapshot {
  readonly requestId: string;
  readonly settlementId: string;
  readonly workspaceRoot: string;
  readonly basisDigest: string;
  /** The exact paths the request admitted. */
  readonly aperture: readonly string[];
  readonly byteBudget: number;
  readonly symlinkPolicy: "refuse";
  /** The settled bytes, keyed by workspace-relative path. */
  readonly files: ReadonlyMap<string, Uint8Array>;
}

/** A path the snapshot does not admit. */
export class UnadmittedPathError extends Error {
  constructor(readonly path: string) {
    super(`path is outside the admitted snapshot aperture: ${path}`);
    this.name = "UnadmittedPathError";
  }
}

/**
 * A read view over settled snapshot bytes.
 *
 * Refuses rather than falling back: a path outside the aperture is a request
 * for authority the observation did not grant, and answering it from disk
 * would silently reintroduce the coupling this type exists to remove.
 */
export class SnapshotWorkspaceReadView implements WorkspaceReadView {
  readonly basisDigest: string;
  private readonly decoded: ReadonlyMap<string, string>;
  private readonly admitted: ReadonlySet<string>;

  constructor(private readonly snapshot: AdmittedWorkspaceSnapshot) {
    this.basisDigest = snapshot.basisDigest;
    this.admitted = new Set(snapshot.aperture);
    const decoder = new TextDecoder();
    const decoded = new Map<string, string>();
    for (const [path, bytes] of snapshot.files) {
      decoded.set(path, decoder.decode(bytes));
    }
    this.decoded = decoded;
  }

  readFile(path: string): string | undefined {
    if (!this.admitted.has(path)) {
      throw new UnadmittedPathError(path);
    }
    return this.decoded.get(path);
  }

  listFiles(): readonly string[] {
    return [...this.snapshot.files.keys()];
  }
}
