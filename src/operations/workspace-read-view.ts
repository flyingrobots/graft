// SPDX-License-Identifier: Apache-2.0
// © James Ross Ω FLYING•ROBOTS <https://github.com/flyingrobots>

import type { FileSystem } from "../ports/filesystem.js";

/**
 * The bytes Graft analysis is permitted to see, and nothing else.
 *
 * Analysis previously received a general `FileSystem` and reached through it to
 * the live disk, so "read the workspace" and "read anything" were one
 * authority. A read view separates them, which is what will let analysis run
 * after an observation has settled rather than racing the disk it is
 * describing.
 *
 * The seam is landed; the settled side of it is not. Both production
 * composition roots pass `LiveWorkspaceReadSource`, so what this interface
 * buys today is that the authority is named and singular, not that it is
 * settled. See `AdmittedWorkspaceSnapshot` for what is still missing.
 *
 * The primitive is bytes, not text. A basis identifies bytes, so a seam that
 * decoded on the way through could not honour it: an undecodable file would
 * either throw at the boundary or arrive silently replaced, and neither is the
 * observed content. Decoding is an analysis projection, applied above.
 */
export interface WorkspaceReadView {
  /** Returns the bytes for a path. Rejects if it cannot produce them. */
  readBytes(path: string): Promise<Uint8Array>;
}

/**
 * What an observation retained about itself.
 *
 * Analysis has to be attributable to the observation that produced it. A
 * result carrying no request or settlement identity cannot be replayed, and
 * cannot be told apart from bytes someone assembled.
 */
export interface WorkspaceReadEvidence {
  readonly requestId: string;
  readonly settlementId: string;
  readonly workspaceRoot: string;
  /** Identity of the exact bytes the observation settled. */
  readonly basisDigest: string;
}

/**
 * A read view over bytes an observation settled.
 *
 * Separate from `WorkspaceReadView` because fetching bytes and possessing
 * settled bytes are not the same capability, and a single interface for both
 * forced the live filesystem to inhabit a contract it cannot satisfy. It has
 * no basis, so it supplied a sentinel in the field whose contract is "the
 * identity of the exact bytes" — a value meaning "this is not a basis" living
 * where the basis goes. One of these performs an effect and the other carries
 * evidence; they are not substitutable.
 */
export interface AdmittedWorkspaceReadView extends WorkspaceReadView {
  readonly evidence: WorkspaceReadEvidence;
  /** Every path the request admitted, in the order it declared them. */
  admittedPaths(): readonly string[];
}

/**
 * One file as a single observation saw it.
 *
 * Operations take this rather than a filesystem so that policy evaluation,
 * cache comparison, and projection all describe the same bytes. When each
 * step fetched its own copy, a file rewritten between two of them could be
 * authorised in one version and returned in another, and the cache would
 * record the hash of one beside the outline of the other.
 *
 * `utf8` is null when the bytes are not valid UTF-8. It is a separate field
 * rather than a decode at the point of use because a basis identifies bytes:
 * substituting replacement characters would return content the observation
 * never settled, under the identity of content it did.
 */
export interface ObservedFile {
  readonly path: string;
  readonly bytes: Uint8Array;
  readonly utf8: string | null;
}

/**
 * The size an observation has, whether or not it decodes as text.
 *
 * Policy must be evaluated for every observation, including bytes with no
 * faithful text projection: a binary or banned path is refused for being
 * binary or banned, and skipping the check when decoding fails would let it
 * through to a projection instead. Counting 0x0A is exact for any byte
 * sequence, because a newline byte cannot occur inside a multi-byte UTF-8
 * sequence.
 */
export function observedActual(file: ObservedFile): { lines: number; bytes: number } {
  return {
    lines: file.utf8 !== null
      ? file.utf8.split("\n").length
      : file.bytes.reduce((count, byte) => (byte === 0x0a ? count + 1 : count), 1),
    bytes: file.bytes.byteLength,
  };
}

/** Observes a path exactly once. Rejects if the view cannot produce it. */
export async function observeFile(
  view: WorkspaceReadView,
  path: string,
): Promise<ObservedFile> {
  const bytes = await view.readBytes(path);
  let utf8: string | null;
  try {
    utf8 = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch {
    utf8 = null;
  }
  return { path, bytes, utf8 };
}

declare const admittedSnapshotBrand: unique symbol;

/**
 * An immutable observation, shaped as Echo would settle one.
 *
 * NOT YET PRODUCED IN PRODUCTION. There is no decoder that turns an Echo
 * settlement into one of these, and no composition root constructs one. The
 * only constructor is the test constructor below, so today every value of this
 * type is admitted by assertion. Every production Graft read still goes through
 * `LiveWorkspaceReadSource` to the live disk. Building the decoder is the
 * remaining work in #228; until it exists, this type describes the destination,
 * not the current state.
 *
 * The brand is compile-time friction, not runtime evidence. It stops a caller
 * assembling one inline and having analysis treat it as settled, but a brand
 * cannot attest that Echo settled anything — only a decoder validating the
 * settlement envelope can, and that is what does not exist yet.
 *
 * The request-side fields are retained because analysis must be attributable
 * to the observation that produced it: a snapshot with no request or
 * settlement identity cannot be replayed, and cannot be told apart from bytes
 * someone assembled.
 */
interface WorkspaceSnapshotDescriptor {
  readonly requestId: string;
  readonly settlementId: string;
  readonly workspaceRoot: string;
  readonly basisDigest: string;
  /** The exact paths the request admitted. */
  readonly aperture: readonly string[];
  readonly byteBudget: number;
  readonly symlinkPolicy: "refuse";
}

export interface AdmittedWorkspaceSnapshot extends WorkspaceSnapshotDescriptor {
  readonly [admittedSnapshotBrand]: true;
}

export interface WorkspaceSnapshotFields extends WorkspaceSnapshotDescriptor {
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

const retainedFilesBySnapshot = new WeakMap<
  AdmittedWorkspaceSnapshot,
  ReadonlyMap<string, SettledFile>
>();

export type SnapshotAdmissionErrorCode =
  | "INVALID_BYTE_BUDGET"
  | "DUPLICATE_APERTURE_PATH"
  | "MISSING_APERTURE_BYTES"
  | "OUTSIDE_APERTURE"
  | "SYMLINK_REFUSED"
  | "BYTE_BUDGET_EXCEEDED"
  | "MISSING_RETAINED_FILES";

/** A snapshot that contradicts a field it declares. */
export class SnapshotAdmissionError extends Error {
  constructor(
    readonly code: SnapshotAdmissionErrorCode,
    readonly detail: string,
  ) {
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
  if (!Number.isSafeInteger(fields.byteBudget) || fields.byteBudget < 0) {
    throw new SnapshotAdmissionError(
      "INVALID_BYTE_BUDGET",
      `byte budget is not a non-negative safe integer: ${String(fields.byteBudget)}`,
    );
  }

  const admitted = new Set<string>();
  for (const path of fields.aperture) {
    if (admitted.has(path)) {
      throw new SnapshotAdmissionError(
        "DUPLICATE_APERTURE_PATH",
        `aperture lists a duplicate path: ${path}`,
      );
    }
    admitted.add(path);
  }

  for (const path of admitted) {
    if (!fields.files.has(path)) {
      throw new SnapshotAdmissionError(
        "MISSING_APERTURE_BYTES",
        `aperture path carries no settled bytes: ${path}`,
      );
    }
  }

  let settledBytes = 0;
  for (const [path, file] of fields.files) {
    if (!admitted.has(path)) {
      throw new SnapshotAdmissionError(
        "OUTSIDE_APERTURE",
        `settled bytes for a path outside the aperture: ${path}`,
      );
    }
    // Unconditional because `symlinkPolicy` admits exactly one value today.
    // Branching on it would read as though a snapshot could permit symlinks,
    // and the first reader to add a second policy value would find the branch
    // already written and assume it had been thought through.
    if (file.entryKind === "symlink") {
      throw new SnapshotAdmissionError(
        "SYMLINK_REFUSED",
        `symlink recorded under a policy that refuses symlinks: ${path}`,
      );
    }
    settledBytes += file.bytes.byteLength;
  }

  if (settledBytes > fields.byteBudget) {
    throw new SnapshotAdmissionError(
      "BYTE_BUDGET_EXCEEDED",
      `settled bytes exceed the declared byte budget: ` +
        `${String(settledBytes)} > ${String(fields.byteBudget)}`,
    );
  }
}

function copySnapshotFields(fields: WorkspaceSnapshotFields): WorkspaceSnapshotFields {
  const files = new Map<string, SettledFile>();
  for (const [path, file] of fields.files) {
    files.set(path, {
      bytes: Uint8Array.from(file.bytes),
      entryKind: file.entryKind,
    });
  }
  return {
    requestId: fields.requestId,
    settlementId: fields.settlementId,
    workspaceRoot: fields.workspaceRoot,
    basisDigest: fields.basisDigest,
    aperture: [...fields.aperture],
    byteBudget: fields.byteBudget,
    symlinkPolicy: fields.symlinkPolicy,
    files,
  };
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
  const copiedFields = copySnapshotFields(fields);
  checkSnapshotFields(copiedFields);
  const snapshot = Object.freeze({
    requestId: copiedFields.requestId,
    settlementId: copiedFields.settlementId,
    workspaceRoot: copiedFields.workspaceRoot,
    basisDigest: copiedFields.basisDigest,
    aperture: Object.freeze([...copiedFields.aperture]),
    byteBudget: copiedFields.byteBudget,
    symlinkPolicy: copiedFields.symlinkPolicy,
  }) as unknown as AdmittedWorkspaceSnapshot;
  retainedFilesBySnapshot.set(snapshot, copiedFields.files);
  return snapshot;
}

/** A path the snapshot does not admit. */
export class UnadmittedPathError extends Error {
  readonly code = "UNADMITTED_PATH" as const;

  constructor(readonly path: string) {
    super(`path is outside the admitted snapshot aperture: ${path}`);
    this.name = "UnadmittedPathError";
  }
}

/** A path the snapshot admits but for which it carries no bytes. */
export class MissingSnapshotBytesError extends Error {
  readonly code = "MISSING_SETTLED_BYTES" as const;

  constructor(readonly path: string) {
    super(`admitted path carries no settled bytes: ${path}`);
    this.name = "MissingSnapshotBytesError";
  }
}

interface SnapshotWorkspaceReadState {
  readonly bytes: ReadonlyMap<string, Uint8Array>;
  readonly aperture: readonly string[];
  readonly admitted: ReadonlySet<string>;
}

const retainedReadStateByView = new WeakMap<
  SnapshotWorkspaceReadView,
  SnapshotWorkspaceReadState
>();

function retainedReadState(view: SnapshotWorkspaceReadView): SnapshotWorkspaceReadState {
  const state = retainedReadStateByView.get(view);
  if (state === undefined) {
    throw new Error("SnapshotWorkspaceReadView has no retained read state");
  }
  return state;
}

/**
 * Snapshot evidence has no platform tag yet. Drive roots and backslash-UNC
 * roots are unambiguously Windows; slash-rooted paths remain POSIX so a legal
 * backslash in a POSIX filename cannot become authority over another path.
 */
function usesWindowsPathSyntax(workspaceRoot: string): boolean {
  return /^[A-Za-z]:[\\/]/u.test(workspaceRoot) || workspaceRoot.startsWith("\\\\");
}

function snapshotLookupPath(workspaceRoot: string, requestedPath: string): string {
  const windowsPathSyntax = usesWindowsPathSyntax(workspaceRoot);
  const normalizedRoot = (windowsPathSyntax ? workspaceRoot.replaceAll("\\", "/") : workspaceRoot)
    .replace(/\/+$/u, "");
  const normalizedRequest = windowsPathSyntax
    ? requestedPath.replaceAll("\\", "/")
    : requestedPath;
  const rootPrefix = normalizedRoot.length === 0 ? "/" : `${normalizedRoot}/`;
  return normalizedRequest.startsWith(rootPrefix)
    ? normalizedRequest.slice(rootPrefix.length)
    : requestedPath;
}

/**
 * A read view over settled snapshot bytes.
 *
 * Refuses rather than falling back: a path outside the aperture is a request
 * for authority the observation did not grant, and answering it from disk
 * would silently reintroduce the coupling this type exists to remove.
 */
export class SnapshotWorkspaceReadView implements AdmittedWorkspaceReadView {
  readonly evidence: WorkspaceReadEvidence;

  constructor(snapshot: AdmittedWorkspaceSnapshot) {
    if (new.target !== SnapshotWorkspaceReadView) {
      throw new TypeError("SnapshotWorkspaceReadView does not support subclass construction");
    }
    this.evidence = Object.freeze({
      requestId: snapshot.requestId,
      settlementId: snapshot.settlementId,
      workspaceRoot: snapshot.workspaceRoot,
      basisDigest: snapshot.basisDigest,
    });
    Object.defineProperty(this, "evidence", {
      writable: false,
      configurable: false,
    });
    const retainedFiles = retainedFilesBySnapshot.get(snapshot);
    if (retainedFiles === undefined) {
      throw new SnapshotAdmissionError(
        "MISSING_RETAINED_FILES",
        "snapshot has no retained settled bytes",
      );
    }
    // Copied on the way in, so a snapshot assembled from a caller's mutable
    // maps cannot change underneath the view once it exists.
    const bytes = new Map<string, Uint8Array>();
    for (const [path, file] of retainedFiles) {
      bytes.set(path, Uint8Array.from(file.bytes));
    }
    retainedReadStateByView.set(this, {
      bytes,
      aperture: [...snapshot.aperture],
      admitted: new Set(snapshot.aperture),
    });
    Object.freeze(this);
  }

  // Asynchronous because a filesystem-backed view cannot read lazily behind a
  // synchronous signature, and both must satisfy one interface for
  // RepoWorkspace analysis methods to depend on exactly one read view.
  readBytes(path: string): Promise<Uint8Array> {
    const state = retainedReadState(this);
    const lookupPath = snapshotLookupPath(this.evidence.workspaceRoot, path);
    if (!state.admitted.has(lookupPath)) {
      return Promise.reject(new UnadmittedPathError(path));
    }
    const content = state.bytes.get(lookupPath);
    if (content === undefined) {
      // Unreachable: admission requires the aperture and the settled-file set
      // to agree exactly. Kept as a guard so a future decoder that skipped
      // that check would fail loudly here rather than return absent bytes.
      return Promise.reject(new MissingSnapshotBytesError(path));
    }
    // Copied on the way out, so a caller writing through the returned array
    // cannot rewrite the retained evidence.
    return Promise.resolve(Uint8Array.from(content));
  }

  admittedPaths(): readonly string[] {
    // From the aperture, which is what the request admitted — not from the
    // byte entries that happen to be present. Answering from the latter is how
    // a partial settlement would report itself as a complete one.
    return [...retainedReadState(this).aperture];
  }
}

Object.freeze(SnapshotWorkspaceReadView.prototype);

/**
 * Bytes read from the live filesystem at the moment of the call.
 *
 * This is the behaviour Graft had before observations were admitted, kept as
 * an explicitly named adapter rather than as a default. It is deliberately
 * **not** an `AdmittedWorkspaceReadView`: nothing about it is settled. The
 * bytes it returns describe the disk when it was asked, so two reads can
 * disagree, no basis over them means anything, and it has no admitted path set
 * to enumerate. It offers neither, so a caller needing either fails to compile
 * rather than receiving a sentinel or a rejected promise.
 *
 * Every production composition root still uses this. That is the remaining
 * work in #228, and it is visible by name at each one.
 */
export class LiveWorkspaceReadSource implements WorkspaceReadView {
  constructor(
    private readonly fs: Pick<FileSystem, "isFileNotFoundError" | "readFile">,
    readonly workspaceRoot: string,
  ) {}

  async readBytes(path: string): Promise<Uint8Array> {
    try {
      return Uint8Array.from(await this.fs.readFile(path));
    } catch (error) {
      const isMissing = this.fs.isFileNotFoundError !== undefined
        ? this.fs.isFileNotFoundError(error)
        : isPortableFileNotFoundError(error);
      if (isMissing) {
        throw Object.assign(new Error(`Workspace file not found: ${path}`), {
          code: "ENOENT" as const,
          cause: error,
        });
      }
      throw error;
    }
  }
}

function isPortableFileNotFoundError(error: unknown): boolean {
  if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
    return true;
  }
  return error instanceof Error
    && (error.name === "NotFoundError" || /^(?:file )?not found(?:\b|:)/i.test(error.message));
}
