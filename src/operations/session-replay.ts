// ---------------------------------------------------------------------------
// Structural Session Replay — render a session as a structural walkthrough
// ---------------------------------------------------------------------------

/** A single tool call extracted from NDJSON receipts. */
export interface ReplayEntry {
  readonly tool: string;
  readonly path?: string;
  readonly symbol?: string;
  readonly ts: string;
  readonly sessionId: string;
}

/**
 * Parse NDJSON receipt lines into replay entries for a given session.
 */
export function parseReceiptsForReplay(ndjson: string, sessionId: string): ReplayEntry[] {
  const entries: ReplayEntry[] = [];

  for (const line of ndjson.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(trimmed) as Record<string, unknown>;
    } catch {
      continue;
    }

    if (parsed["sessionId"] !== sessionId) continue;
    if (typeof parsed["tool"] !== "string") continue;

    entries.push({
      tool: parsed["tool"],
      ...(typeof parsed["path"] === "string" ? { path: parsed["path"] } : {}),
      ...(typeof parsed["symbol"] === "string" ? { symbol: parsed["symbol"] } : {}),
      ts: typeof parsed["ts"] === "string" ? parsed["ts"] : "",
      sessionId,
    });
  }

  return entries;
}

/**
 * Render replay entries as a Markdown summary.
 */
export function renderReplayMarkdown(entries: readonly ReplayEntry[]): string {
  if (entries.length === 0) {
    return "# Session Replay\n\nNo activity recorded for this session.\n";
  }

  const lines: string[] = [
    "# Session Replay",
    "",
    `**${String(entries.length)} tool calls**`,
    "",
    "| # | Tool | Target | Time |",
    "|---|------|--------|------|",
  ];

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i] ?? { tool: "", ts: "", sessionId: "" };
    const target = e.symbol !== undefined
      ? `${e.path ?? ""}:${e.symbol}`
      : (e.path ?? "—");
    lines.push(`| ${String(i + 1)} | ${e.tool} | ${target} | ${e.ts} |`);
  }

  lines.push("");
  return lines.join("\n");
}
