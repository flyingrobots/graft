// ---------------------------------------------------------------------------
// Receipt builder — attaches decision metadata to every tool response
// ---------------------------------------------------------------------------

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { MetricsSnapshot } from "./metrics.js";
import type { Tripwire } from "../session/types.js";
import type { JsonCodec } from "../ports/codec.js";
import { attachMcpSchemaMeta, type McpToolName } from "../contracts/output-schemas.js";

export type McpToolResult = CallToolResult;

export interface ReceiptBudget {
  readonly total: number;
  readonly consumed: number;
  readonly remaining: number;
  readonly fraction: number;
}

export interface ReceiptCumulative {
  readonly reads: number;
  readonly outlines: number;
  readonly refusals: number;
  readonly cacheHits: number;
  readonly bytesReturned: number;
  readonly bytesAvoided: number;
}

export interface McpToolReceipt {
  readonly sessionId: string;
  readonly traceId: string;
  readonly seq: number;
  readonly ts: string;
  readonly tool: McpToolName;
  readonly projection: string;
  readonly reason: string;
  readonly latencyMs: number;
  readonly fileBytes: number | null;
  readonly returnedBytes: number;
  readonly cumulative: ReceiptCumulative;
  readonly budget?: ReceiptBudget;
  readonly compressionRatio?: number | null;
}

export interface ReceiptDeps {
  readonly sessionId: string;
  readonly traceId: string;
  readonly seq: number;
  readonly latencyMs: number;
  readonly metrics: MetricsSnapshot;
  readonly tripwires: Tripwire[];
  readonly codec: JsonCodec;
  readonly budget?: ReceiptBudget | null;
}

/**
 * Build a tool response with an attached receipt.
 * Returns the finalized MCP result and the byte count of the serialized text
 * so the caller can feed it back into cumulative metrics.
 */
export function buildReceiptResult(
  tool: McpToolName,
  data: Record<string, unknown>,
  deps: ReceiptDeps,
): { result: McpToolResult; textBytes: number; receipt: McpToolReceipt } {
  const receipt: McpToolReceipt = {
    sessionId: deps.sessionId,
    traceId: deps.traceId,
    seq: deps.seq,
    ts: new Date().toISOString(),
    tool,
    projection: (data["projection"] as string | undefined) ?? "none",
    reason: (data["reason"] as string | undefined) ?? "none",
    latencyMs: deps.latencyMs,
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

  if (deps.budget != null) {
    (receipt as McpToolReceipt & { budget?: ReceiptBudget }).budget = deps.budget;
  }

  const fullData: Record<string, unknown> & { tripwire?: Tripwire[] } = attachMcpSchemaMeta(tool, {
    ...data,
    _receipt: receipt,
  });
  if (deps.tripwires.length > 0) {
    fullData.tripwire = deps.tripwires;
  }

  // Stabilize self-referential size fields (use UTF-8 byte length, not char count)
  let prev = 0;
  let text = "";
  for (let i = 0; i < 5; i++) {
    text = deps.codec.encode(fullData);
    const byteLen = Buffer.byteLength(text, "utf8");
    if (byteLen === prev) break;
    prev = byteLen;
    (receipt as McpToolReceipt & { returnedBytes: number }).returnedBytes = byteLen;
    const fb = receipt.fileBytes;
    (receipt as McpToolReceipt & { compressionRatio?: number | null }).compressionRatio = fb !== null && fb > 0
      ? Math.round((byteLen / fb) * 1000) / 1000
      : null;
    (receipt.cumulative as ReceiptCumulative & { bytesReturned: number }).bytesReturned =
      deps.metrics.bytesReturned + byteLen;
  }

  Object.freeze(receipt.cumulative);
  Object.freeze(receipt);

  return {
    result: { content: [{ type: "text", text }] },
    textBytes: Buffer.byteLength(text, "utf8"),
    receipt,
  };
}
