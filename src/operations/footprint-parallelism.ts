// ---------------------------------------------------------------------------
// Footprint Parallelism — discover concurrent-safe tool calls
// ---------------------------------------------------------------------------

/** The structural footprint of a tool call. */
export interface ToolFootprint {
  readonly tool: string;
  readonly files: readonly string[];
  readonly symbols: readonly string[];
}

/** Tools that have no structural footprint (diagnostics, status). */
const ZERO_FOOTPRINT_TOOLS = new Set([
  "daemon_status",
  "daemon_monitors",
  "causal_status",
  "knowledge_map",
]);

/**
 * Compute the structural footprint of a tool call.
 *
 * Files and symbols that the call reads or writes. Two calls with
 * non-overlapping footprints can run concurrently.
 */
export function computeFootprint(
  tool: string,
  args: Readonly<Record<string, unknown>>,
): ToolFootprint {
  if (ZERO_FOOTPRINT_TOOLS.has(tool)) {
    return { tool, files: [], symbols: [] };
  }

  const files: string[] = [];
  const symbols: string[] = [];

  // Extract path from common arg patterns
  const pathArg = args["path"];
  if (typeof pathArg === "string") {
    files.push(pathArg);
  }

  // Extract symbol from common arg patterns
  const symbolArg = args["symbol"] ?? args["name"];
  if (typeof symbolArg === "string") {
    symbols.push(symbolArg);
  }

  return { tool, files, symbols };
}

/**
 * Check if two footprints overlap (share files or symbols).
 */
function overlaps(a: ToolFootprint, b: ToolFootprint): boolean {
  for (const file of a.files) {
    if (b.files.includes(file)) return true;
  }
  for (const sym of a.symbols) {
    if (b.symbols.includes(sym)) return true;
  }
  return false;
}

/**
 * Partition footprints into parallel groups.
 *
 * Each group contains footprints that can run concurrently (no
 * overlaps within the group). Groups are ordered — group N+1
 * runs after group N.
 *
 * Uses greedy graph coloring: for each footprint, place it in the
 * first group that has no conflicts.
 */
export function findParallelGroups(
  footprints: readonly ToolFootprint[],
): ToolFootprint[][] {
  if (footprints.length === 0) return [];

  const groups: ToolFootprint[][] = [];

  for (const fp of footprints) {
    let placed = false;
    for (const group of groups) {
      const conflicts = group.some((existing) => overlaps(existing, fp));
      if (!conflicts) {
        group.push(fp);
        placed = true;
        break;
      }
    }
    if (!placed) {
      groups.push([fp]);
    }
  }

  return groups;
}
