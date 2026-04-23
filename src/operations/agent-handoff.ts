// ---------------------------------------------------------------------------
// Agent Handoff Protocol — structured session transfer
// ---------------------------------------------------------------------------

import type { ObservationCache } from "./observation-cache.js";

/** The structured handoff payload. */
export interface HandoffPayload {
  readonly sessionId: string;
  readonly filesRead: readonly string[];
  readonly symbolsInspected: readonly string[];
  readonly observations: number;
  readonly budgetConsumed: string;
}

/** Options for building a handoff. */
export interface HandoffOptions {
  readonly cache: ObservationCache;
  readonly sessionId: string;
  readonly budgetTotal?: number;
  readonly budgetConsumed?: number;
}

/**
 * Build a structured handoff payload from the current session state.
 *
 * Projects the observation cache into a portable JSON payload that
 * a receiving agent can use to understand what the departing agent
 * knew and where it left off.
 */
export function buildHandoff(options: HandoffOptions): HandoffPayload {
  const { cache, sessionId } = options;

  const filesRead: string[] = [];
  const symbolsInspected: string[] = [];
  let observationCount = 0;

  for (const [filePath, observation] of cache.allEntries()) {
    filesRead.push(filePath);
    for (const entry of observation.outline) {
      symbolsInspected.push(entry.name);
    }
    observationCount++;
  }

  let budgetStr = "unknown";
  if (options.budgetTotal !== undefined && options.budgetConsumed !== undefined && options.budgetTotal > 0) {
    const pct = Math.round((options.budgetConsumed / options.budgetTotal) * 100);
    budgetStr = `${String(pct)}%`;
  }

  return {
    sessionId,
    filesRead,
    symbolsInspected,
    observations: observationCount,
    budgetConsumed: budgetStr,
  };
}
