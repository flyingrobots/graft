// SPDX-License-Identifier: Apache-2.0
// © James Ross Ω FLYING•ROBOTS <https://github.com/flyingrobots>

import {
  LiveWorkspaceReadSource,
  observeFile,
  type ObservedFile,
} from "../../src/operations/workspace-read-view.js";

/**
 * Observes a path through the same seam production uses.
 *
 * The operation helpers take an observation rather than a filesystem, so a
 * test that wants to exercise one has to observe first — which is the point.
 * Building an ObservedFile by hand here would let tests describe byte/text
 * pairs that no observation could produce.
 */
export async function observe(
  fs: { readFile(path: string): Promise<Uint8Array | Buffer> },
  path: string,
): Promise<ObservedFile> {
  return observeFile(new LiveWorkspaceReadSource(fs, "/virtual"), path);
}

/** An observation of bytes that are not valid UTF-8. */
export function observedBytes(path: string, bytes: Uint8Array): ObservedFile {
  return { path, bytes, utf8: null };
}
