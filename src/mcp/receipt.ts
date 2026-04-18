// ---------------------------------------------------------------------------
// Receipt builder — attaches decision metadata to every tool response
// ---------------------------------------------------------------------------

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { MetricsSnapshot } from "./metrics.js";
import type { Tripwire } from "../session/types.js";
import type { JsonCodec } from "../ports/codec.js";
import { attachMcpSchemaMeta, type McpToolName } from "../contracts/output-schemas.js";
import {
  burdenKindForTool,
  isNonReadBurdenKind,
  projectBurdenByKind,
  totalNonReadBytesReturned,
  type BurdenByKind,
  type BurdenKind,
} from "./burden.js";

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
  readonly nonReadBytesReturned: number;
  readonly burdenByKind: Readonly<BurdenByKind>;
}

export interface ReceiptBurden {
  readonly kind: BurdenKind;
  readonly nonRead: boolean;
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
  readonly burden: ReceiptBurden;
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

/** Mutable draft used internally during the size-stabilization loop. */
interface ReceiptDraft {
  sessionId: string;
  traceId: string;
  seq: number;
  ts: string;
  tool: McpToolName;
  projection: string;
  reason: string;
  latencyMs: number;
  fileBytes: number | null;
  returnedBytes: number;
  burden: ReceiptBurden;
  cumulative: {
    reads: number;
    outlines: number;
    refusals: number;
    cacheHits: number;
    bytesReturned: number;
    bytesAvoided: number;
    nonReadBytesReturned: number;
    burdenByKind: Readonly<BurdenByKind>;
  };
  budget?: ReceiptBudget;
  compressionRatio?: number | null;
}

function extractProjection(data: Record<string, unknown>): string {
  if (typeof data["projection"] === "string") return data["projection"];
  return "none";
}

function extractReason(data: Record<string, unknown>): string {
  if (typeof data["reason"] === "string") return data["reason"];
  return "none";
}

function extractFileBytes(data: Record<string, unknown>): number | null {
  const actual = data["actual"];
  if (actual !== null && typeof actual === "object" && "bytes" in actual) {
    const bytes = (actual as { bytes: unknown }).bytes;
    if (typeof bytes === "number") return bytes;
  }
  return null;
}

function freezeReceipt(draft: ReceiptDraft): McpToolReceipt {
  Object.freeze(draft.burden);
  Object.freeze(draft.cumulative);
  Object.freeze(draft);
  return draft as McpToolReceipt;
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
  const burdenKind = burdenKindForTool(tool);

  const draft: ReceiptDraft = {
    sessionId: deps.sessionId,
    traceId: deps.traceId,
    seq: deps.seq,
    ts: new Date().toISOString(),
    tool,
    projection: extractProjection(data),
    reason: extractReason(data),
    latencyMs: deps.latencyMs,
    fileBytes: extractFileBytes(data),
    returnedBytes: 0,
    burden: {
      kind: burdenKind,
      nonRead: isNonReadBurdenKind(burdenKind),
    },
    cumulative: {
      reads: deps.metrics.reads,
      outlines: deps.metrics.outlines,
      refusals: deps.metrics.refusals,
      cacheHits: deps.metrics.cacheHits,
      bytesReturned: 0,
      bytesAvoided: deps.metrics.bytesAvoided,
      nonReadBytesReturned: totalNonReadBytesReturned(deps.metrics.burdenByKind),
      burdenByKind: deps.metrics.burdenByKind,
    },
  };

  if (deps.budget != null) {
    draft.budget = deps.budget;
  }

  const fullData: Record<string, unknown> & { tripwire?: Tripwire[] } = attachMcpSchemaMeta(tool, {
    ...data,
    _receipt: draft,
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
    draft.returnedBytes = byteLen;
    const burdenByKind = projectBurdenByKind(deps.metrics.burdenByKind, tool, byteLen);
    draft.compressionRatio = draft.fileBytes !== null && draft.fileBytes > 0
      ? Math.round((byteLen / draft.fileBytes) * 1000) / 1000
      : null;
    draft.cumulative.bytesReturned = deps.metrics.bytesReturned + byteLen;
    draft.cumulative.nonReadBytesReturned = totalNonReadBytesReturned(burdenByKind);
    draft.cumulative.burdenByKind = burdenByKind;
  }

  const receipt = freezeReceipt(draft);

  return {
    result: { content: [{ type: "text", text }] },
    textBytes: Buffer.byteLength(text, "utf8"),
    receipt,
  };
}
