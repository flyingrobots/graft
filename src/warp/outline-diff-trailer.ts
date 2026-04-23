// ---------------------------------------------------------------------------
// Outline Diff Commit Trailer — structural summary in git commit messages
// ---------------------------------------------------------------------------

/** A single symbol change to include in the trailer. */
export interface SymbolDiffEntry {
  readonly name: string;
  readonly kind: string;
  readonly changeKind: "added" | "removed" | "changed";
}

/** Options for trailer formatting. */
export interface TrailerOptions {
  /** Maximum entries before truncation. Default: 20. */
  readonly maxEntries?: number;
}

/** Short kind abbreviations for the trailer format. */
const KIND_ABBREV: Readonly<Record<string, string>> = {
  function: "fn",
  class: "class",
  interface: "iface",
  type: "type",
  variable: "var",
  method: "method",
  property: "prop",
};

function abbrevKind(kind: string): string {
  return KIND_ABBREV[kind] ?? kind;
}

/**
 * Format a list of symbol changes as a Git commit trailer.
 *
 * Format: `Structural-Diff: added fn:X; removed class:Y; changed fn:Z`
 *
 * Returns empty string if there are no changes.
 */
export function formatStructuralDiffTrailer(
  entries: readonly SymbolDiffEntry[],
  options?: TrailerOptions,
): string {
  if (entries.length === 0) return "";

  const max = options?.maxEntries ?? 20;
  const display = entries.slice(0, max);
  const parts = display.map(
    (e) => `${e.changeKind} ${abbrevKind(e.kind)}:${e.name}`,
  );

  let trailer = `Structural-Diff: ${parts.join("; ")}`;

  if (entries.length > max) {
    trailer += `; ... (${String(entries.length)} total)`;
  }

  return trailer;
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

const TRAILER_PREFIX = "Structural-Diff:";

const ENTRY_RE = /^(added|removed|changed)\s+(\w+):(\w+)$/;

/**
 * Parse a Structural-Diff trailer back into structured entries.
 *
 * Skips malformed entries gracefully.
 */
export function parseStructuralDiffTrailer(text: string): SymbolDiffEntry[] {
  const idx = text.indexOf(TRAILER_PREFIX);
  if (idx === -1) return [];

  const body = text.slice(idx + TRAILER_PREFIX.length).trim();
  const parts = body.split(";").map((p) => p.trim());
  const results: SymbolDiffEntry[] = [];

  for (const part of parts) {
    if (part.startsWith("...")) continue;
    const match = ENTRY_RE.exec(part);
    if (match === null) continue;

    const changeKind = match[1] as "added" | "removed" | "changed";
    const abbrev = match[2] ?? "unknown";
    const name = match[3] ?? "unknown";

    // Reverse the abbreviation
    const kind = Object.entries(KIND_ABBREV).find(
      ([, v]) => v === abbrev,
    )?.[0] ?? abbrev;

    results.push({ name, kind, changeKind });
  }

  return results;
}
