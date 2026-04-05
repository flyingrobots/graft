// ---------------------------------------------------------------------------
// Receipt builder — attaches decision metadata to every tool response
// ---------------------------------------------------------------------------

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { MetricsSnapshot } from "./metrics.js";
import type { Tripwire } from "../session/types.js";
import type { JsonCodec } from "../ports/codec.js";

export type McpToolResult = CallToolResult;

export interface ReceiptDeps {
  readonly sessionId: string;
  readonly seq: number;
  readonly metrics: MetricsSnapshot;
  readonly tripwires: Tripwire[];
  readonly codec: JsonCodec;
}

/**
 * Build a tool response with an attached receipt.
 * Returns the finalized MCP result and the byte count of the serialized text
 * so the caller can feed it back into cumulative metrics.
 */
export function buildReceiptResult(
  tool: string,
  data: Record<string, unknown>,
  deps: ReceiptDeps,
): { result: McpToolResult; textBytes: number } {
  const receipt: Record<string, unknown> = {
    sessionId: deps.sessionId,
    seq: deps.seq,
    ts: new Date().toISOString(),
    tool,
    projection: (data["projection"] as string | undefined) ?? "none",
    reason: (data["reason"] as string | undefined) ?? "none",
    fileBytes: (data["actual"] as { bytes: number } | undefined)?.bytes ?? null,
    returnedBytes: 0,
    cumulative: {
      reads: deps.metrics.reads,
      outlines: deps.metrics.outlines,
      refusals: deps.metrics.refusals,
      cacheHits: deps.metrics.cacheHits,
      bytesReturned: 0,
      bytesAvoided: deps.metrics.bytesAvoided,
    },
  };

  const fullData: Record<string, unknown> = { ...data, _receipt: receipt };
  if (deps.tripwires.length > 0) {
    fullData["tripwire"] = deps.tripwires;
  }

  // Stabilize self-referential size fields (use UTF-8 byte length, not char count)
  let prev = 0;
  let text = "";
  for (let i = 0; i < 5; i++) {
    text = deps.codec.encode(fullData);
    const byteLen = Buffer.byteLength(text, "utf8");
    if (byteLen === prev) break;
    prev = byteLen;
    receipt["returnedBytes"] = byteLen;
    const fb = receipt["fileBytes"] as number | null;
    receipt["compressionRatio"] = fb !== null && fb > 0
      ? Math.round((byteLen / fb) * 1000) / 1000
      : null;
    (receipt["cumulative"] as Record<string, number>)["bytesReturned"] =
      deps.metrics.bytesReturned + byteLen;
  }

  Object.freeze(receipt["cumulative"]);
  Object.freeze(receipt);

  return {
    result: { content: [{ type: "text", text }] },
    textBytes: Buffer.byteLength(text, "utf8"),
  };
}
