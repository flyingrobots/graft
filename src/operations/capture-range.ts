// ---------------------------------------------------------------------------
// Capture Range — opaque handles for run_capture output
// ---------------------------------------------------------------------------



interface CaptureEntry {
  readonly sessionId: string;
  readonly content: string;
  readonly lines: readonly string[];
}

/** Result of a range retrieval. */
export type CaptureRangeResult =
  | { readonly ok: true; readonly lines: readonly string[]; readonly totalLines: number }
  | { readonly ok: false; readonly error: string };

/**
 * Registry of opaque capture handles.
 *
 * Maps UUIDs to capture content. Handles are session-scoped — a
 * handle from one session is rejected in another.
 */
export class CaptureHandleRegistry {
  private nextId = 0;
  private readonly entries = new Map<string, CaptureEntry>();

  /**
   * Register capture content and return an opaque handle.
   */
  register(sessionId: string, content: string): string {
    const handle = `capture-${String(++this.nextId)}`;
    const lines = content.split("\n").filter(
      (line, index, arr) => index < arr.length - 1 || line.length > 0,
    );
    this.entries.set(handle, { sessionId, content, lines });
    return handle;
  }

  /**
   * Retrieve a line range from a capture handle.
   *
   * @param handle - The opaque handle from register()
   * @param sessionId - The requesting session (must match the registering session)
   * @param start - 1-based start line (inclusive)
   * @param end - 1-based end line (inclusive)
   */
  getRange(handle: string, sessionId: string, start: number, end: number): CaptureRangeResult {
    const entry = this.entries.get(handle);
    if (entry === undefined) {
      return { ok: false, error: "Capture handle not found" };
    }
    if (entry.sessionId !== sessionId) {
      return { ok: false, error: "Capture handle belongs to a different session" };
    }

    const totalLines = entry.lines.length;
    const clampedStart = Math.max(1, start);
    const clampedEnd = Math.min(totalLines, end);
    const lines = entry.lines.slice(clampedStart - 1, clampedEnd);

    return { ok: true, lines, totalLines };
  }
}
