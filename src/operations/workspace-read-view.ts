// SPDX-License-Identifier: Apache-2.0
// © James Ross Ω FLYING•ROBOTS <https://github.com/flyingrobots>

/**
 * The bytes Graft analysis is permitted to see, and nothing else.
 *
 * Analysis previously received a general `FileSystem` and reached through it to
 * the live disk, so "read the workspace" and "read anything" were one
 * authority. A read view separates them: it carries settled bytes and cannot
 * reach past them, which is what lets analysis run after an observation has
 * settled rather than racing the disk it is describing.
 *
 * The primitive is bytes, not text. A basis identifies bytes, so a seam that
 * decoded on the way through could not honour it: an undecodable file would
 * either throw at the boundary or arrive silently replaced, and neither is the
 * observed content. Decoding is an analysis projection, applied above.
 */
export interface WorkspaceReadView {
  /** Identity of the exact bytes this view exposes. */
  readonly basisDigest: string;
  /** Returns the settled bytes for a path. Rejects for an unadmitted path. */
  readBytes(path: string): Promise<Uint8Array>;
  /** Every path this view admits. */
  listPaths(): Promise<readonly string[]>;
}

/**
 * Decodes settled bytes as UTF-8, refusing anything that is not valid UTF-8.
 *
 * Decoding sits here rather than in the view because a basis identifies bytes.
 * A seam that decoded on the way through could not honour it: an undecodable
 * file would either throw at the boundary or arrive silently replaced, and
 * neither is the observed content.
 */
export async function readUtf8(view: WorkspaceReadView, path: string): Promise<string> {
  return new TextDecoder("utf-8", { fatal: true }).decode(await view.readBytes(path));
}

declare const admittedSnapshotBrand: unique symbol;

/**
 * An immutable observation Echo has settled.
 *
 * The brand is not decoration. "Admitted" has to mean an observation Echo
 * actually settled, and a plain exported interface would let any caller
 * assemble one by hand and have analysis treat it as evidence. Production
 * instances come only from decoding a settlement; tests use the explicitly
 * named test constructor below, so a hand-built snapshot is visible as such at
 * every call site.
 *
 * The request-side fields are retained because analysis must be attributable
 * to the observation that produced it: a snapshot with no request or
 * settlement identity cannot be replayed, and cannot be told apart from bytes
 * someone assembled.
 */
export interface AdmittedWorkspaceSnapshot {
  readonly [admittedSnapshotBrand]: true;
  readonly requestId: string;
  readonly settlementId: string;
  readonly workspaceRoot: string;
  readonly basisDigest: string;
  /** The exact paths the request admitted. */
  readonly aperture: readonly string[];
  readonly byteBudget: number;
  readonly symlinkPolicy: "refuse";
  /** The settled files, keyed by workspace-relative path. */
  readonly files: ReadonlyMap<string, SettledFile>;
}

/**
 * One file as the observation recorded it.
 *
 * The entry kind is carried rather than assumed because refusing symlinks is a
 * claim about what was observed, and a claim with nowhere to record its
 * subject cannot be checked. A settlement that reports a symlink while
 * declaring `symlinkPolicy: "refuse"` is self-contradictory, and the only
 * place that contradiction is visible is here.
 */
export interface SettledFile {
  readonly bytes: Uint8Array;
  readonly entryKind: "regular" | "symlink";
}

/** The fields a snapshot carries, without the admission brand. */
export type WorkspaceSnapshotFields = Omit<
  AdmittedWorkspaceSnapshot,
  typeof admittedSnapshotBrand
>;

/** A snapshot that contradicts a field it declares. */
export class SnapshotAdmissionError extends Error {
  constructor(readonly detail: string) {
    super(`snapshot contradicts its own declaration: ${detail}`);
    this.name = "SnapshotAdmissionError";
  }
}

/**
 * Checks a snapshot against the fields it declares.
 *
 * Every check here is internal consistency: it asks whether the settlement
 * honours the request it claims to answer, not whether Echo settled it. That
 * second question needs the settlement envelope, and belongs to the decoder
 * that does not exist yet. Both callers want these checks, so they live apart
 * from either.
 *
 * Refusing at construction rather than at read time is the point. A snapshot
 * that passes here is total over its aperture, so analysis can treat the
 * observation as complete instead of discovering a hole partway through and
 * having to decide what an absent admitted path means.
 */
function checkSnapshotFields(fields: WorkspaceSnapshotFields): void {
  const admitted = new Set<string>();
  for (const path of fields.aperture) {
    if (admitted.has(path)) {
      throw new SnapshotAdmissionError(`aperture lists a duplicate path: ${path}`);
    }
    admitted.add(path);
  }

  for (const path of admitted) {
    if (!fields.files.has(path)) {
      throw new SnapshotAdmissionError(`aperture path carries no settled bytes: ${path}`);
    }
  }

  let settledBytes = 0;
  for (const [path, file] of fields.files) {
    if (!admitted.has(path)) {
      throw new SnapshotAdmissionError(`settled bytes for a path outside the aperture: ${path}`);
    }
    if (fields.symlinkPolicy === "refuse" && file.entryKind === "symlink") {
      throw new SnapshotAdmissionError(
        `symlink recorded under a policy that refuses symlinks: ${path}`,
      );
    }
    settledBytes += file.bytes.byteLength;
  }

  if (settledBytes > fields.byteBudget) {
    throw new SnapshotAdmissionError(
      `settled bytes exceed the declared byte budget: ${settledBytes} > ${fields.byteBudget}`,
    );
  }
}

/**
 * Builds a snapshot that is admitted by assertion rather than by settlement.
 *
 * Named for what it is so that a production composition root using it is
 * obvious in review. The assertion is only about provenance: no Echo
 * settlement stands behind this value. The fields it declares are still
 * checked, because a test fixture that could contradict itself would prove
 * analysis works against observations that cannot occur.
 *
 * Copies its input, so a caller mutating the maps and arrays it passed cannot
 * reach the snapshot afterwards.
 */
export function unsafeAdmittedWorkspaceSnapshotForTest(
  fields: WorkspaceSnapshotFields,
): AdmittedWorkspaceSnapshot {
  checkSnapshotFields(fields);
  const files = new Map<string, SettledFile>();
  for (const [path, file] of fields.files) {
    files.set(path, { bytes: Uint8Array.from(file.bytes), entryKind: file.entryKind });
  }
  return {
    ...fields,
    aperture: [...fields.aperture],
    files,
  } as unknown as AdmittedWorkspaceSnapshot;
}

/** A path the snapshot does not admit. */
export class UnadmittedPathError extends Error {
  constructor(readonly path: string) {
    super(`path is outside the admitted snapshot aperture: ${path}`);
    this.name = "UnadmittedPathError";
  }
}

/** A path the snapshot admits but for which it carries no bytes. */
export class MissingSnapshotBytesError extends Error {
  constructor(readonly path: string) {
    super(`admitted path carries no settled bytes: ${path}`);
    this.name = "MissingSnapshotBytesError";
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
  private readonly bytes: ReadonlyMap<string, Uint8Array>;
  private readonly admitted: ReadonlySet<string>;

  constructor(snapshot: AdmittedWorkspaceSnapshot) {
    this.basisDigest = snapshot.basisDigest;
    this.admitted = new Set(snapshot.aperture);
    // Copied on the way in, so a snapshot assembled from a caller's mutable
    // maps cannot change underneath the view once it exists.
    const bytes = new Map<string, Uint8Array>();
    for (const [path, file] of snapshot.files) {
      bytes.set(path, Uint8Array.from(file.bytes));
    }
    this.bytes = bytes;
  }

  // Asynchronous because a filesystem-backed view cannot read lazily behind a
  // synchronous signature, and both must satisfy one interface for
  // RepoWorkspace to hold exactly one read authority.
  readBytes(path: string): Promise<Uint8Array> {
    if (!this.admitted.has(path)) {
      return Promise.reject(new UnadmittedPathError(path));
    }
    const content = this.bytes.get(path);
    if (content === undefined) {
      return Promise.reject(new MissingSnapshotBytesError(path));
    }
    // Copied on the way out, so a caller writing through the returned array
    // cannot rewrite the retained evidence.
    return Promise.resolve(Uint8Array.from(content));
  }

  listPaths(): Promise<readonly string[]> {
    return Promise.resolve([...this.bytes.keys()]);
  }
}

/**
 * A read view backed by the live filesystem.
 *
 * This is the behaviour Graft had before observations were admitted, kept as
 * an explicitly named adapter rather than as a default. Nothing about it is
 * settled: the bytes it returns describe the disk at the moment of the call,
 * so two reads can disagree and a basis over them means nothing. Composition
 * roots that still use it are visible by name.
 */
export class FilesystemWorkspaceReadView implements WorkspaceReadView {
  readonly basisDigest = "unsettled:filesystem";

  constructor(
    private readonly fs: { readFile(path: string): Promise<Uint8Array | Buffer> },
    private readonly projectRoot: string,
  ) {}

  async readBytes(path: string): Promise<Uint8Array> {
    return Uint8Array.from(await this.fs.readFile(path));
  }

  listPaths(): Promise<readonly string[]> {
    // The live filesystem has no admitted path set to enumerate. Callers that
    // need one are asking a question only a settled observation can answer.
    return Promise.reject(
      new Error(`a filesystem read view has no admitted path set to list: ${this.projectRoot}`),
    );
  }
}
