// ---------------------------------------------------------------------------
// Receipt builder — attaches decision metadata to every tool response
// ---------------------------------------------------------------------------

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { MetricsSnapshot } from "./metrics.js";
import type { Tripwire } from "../session/types.js";
import type { JsonCodec } from "../ports/codec.js";
import {
  attachMcpSchemaMeta,
  getMcpOutputSchema,
  type McpToolName,
} from "../contracts/output-schemas.js";
import { getMcpDiscoveryOutputSchema } from "../contracts/mcp-discovery-output-schemas.js";
import { parseJsonObject } from "../contracts/json-object.js";
import type { ReceiptMode } from "./tool-input-controls.js";
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
  /** Requested public projection. Internal accounting fields remain available in both modes. */
  readonly mode: ReceiptMode;
  /** Correlates this receipt with the matching completed runtime-observability record. */
  readonly receiptId: string;
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
  /** Direct builder callers retain the historical full projection by default. */
  readonly receiptMode?: ReceiptMode | undefined;
}

/** Mutable draft used internally during the size-stabilization loop. */
interface ReceiptDraft {
  mode: ReceiptMode;
  receiptId: string;
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

interface CompactReceiptDraft {
  mode: "compact";
  receiptId: string;
  seq: number;
  reason: string;
  latencyMs: number;
  returnedBytes: number;
}

type FullReceiptDraft = Omit<ReceiptDraft, "receiptId">;

const COMPACT_RECEIPT_MAX_BYTES = 512;
const COMPACT_REASON_MAX_BYTES = 256;

function boundedCompactReason(reason: string): string {
  if (Buffer.byteLength(reason, "utf8") <= COMPACT_REASON_MAX_BYTES) {
    return reason;
  }
  const suffix = "…";
  const contentBudget = COMPACT_REASON_MAX_BYTES - Buffer.byteLength(suffix, "utf8");
  let bounded = "";
  let bytes = 0;
  for (const character of reason) {
    const characterBytes = Buffer.byteLength(character, "utf8");
    if (bytes + characterBytes > contentBudget) {
      break;
    }
    bounded += character;
    bytes += characterBytes;
  }
  return `${bounded}${suffix}`;
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

function compactReceiptDraft(full: ReceiptDraft): CompactReceiptDraft {
  return {
    mode: "compact",
    receiptId: full.receiptId,
    seq: full.seq,
    reason: boundedCompactReason(full.reason),
    latencyMs: full.latencyMs,
    returnedBytes: full.returnedBytes,
  };
}

function fullReceiptDraft(internal: ReceiptDraft): FullReceiptDraft {
  const { receiptId: _receiptId, ...output } = internal;
  return output;
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
  const receiptMode = deps.receiptMode ?? "full";

  const draft: ReceiptDraft = {
    mode: receiptMode,
    receiptId: deps.traceId,
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

  const outputReceipt: FullReceiptDraft | CompactReceiptDraft = receiptMode === "compact"
    ? compactReceiptDraft(draft)
    : fullReceiptDraft(draft);
  const fullData: Record<string, unknown> & { tripwire?: Tripwire[] } = attachMcpSchemaMeta(tool, {
    ...data,
    _receipt: outputReceipt,
  });
  if (deps.tripwires.length > 0) {
    fullData.tripwire = deps.tripwires;
  }

  // Stabilize self-referential size fields (use UTF-8 byte length, not char count).
  // Equality means the encoded text already contains the byte count it reports.
  //
  // A rounded compressionRatio can make the JSON-width function non-monotonic:
  // for example, alternating between 13.86 and 13.842 changes the response by
  // one byte and can create a two-state cycle. The field is already optional,
  // so an impossible fixed point falls back to exact byte accounting without
  // projecting the derived ratio. The complete internal receipt still records
  // the ratio once the final byte count is known.
  const maxStabilizationPasses = 32;
  const updateAccounting = (byteLen: number, exposeCompressionRatio: boolean): void => {
    draft.returnedBytes = byteLen;
    outputReceipt.returnedBytes = byteLen;
    const burdenByKind = projectBurdenByKind(deps.metrics.burdenByKind, tool, byteLen);
    draft.compressionRatio = draft.fileBytes !== null && draft.fileBytes > 0
      ? Math.round((byteLen / draft.fileBytes) * 1000) / 1000
      : null;
    if (outputReceipt.mode === "full") {
      if (exposeCompressionRatio) {
        outputReceipt.compressionRatio = draft.compressionRatio;
      } else {
        delete outputReceipt.compressionRatio;
      }
    }
    draft.cumulative.bytesReturned = deps.metrics.bytesReturned + byteLen;
    draft.cumulative.nonReadBytesReturned = totalNonReadBytesReturned(burdenByKind);
    draft.cumulative.burdenByKind = burdenByKind;
  };
  const stabilize = (exposeCompressionRatio: boolean): string | null => {
    for (let i = 0; i < maxStabilizationPasses; i++) {
      const candidate = deps.codec.encode(fullData);
      const byteLen = Buffer.byteLength(candidate, "utf8");
      if (byteLen === outputReceipt.returnedBytes) {
        return candidate;
      }
      updateAccounting(byteLen, exposeCompressionRatio);
    }
    return null;
  };

  let text = stabilize(true);
  if (text === null && outputReceipt.mode === "full") {
    delete outputReceipt.compressionRatio;
    draft.returnedBytes = 0;
    outputReceipt.returnedBytes = 0;
    draft.cumulative.bytesReturned = 0;
    draft.cumulative.nonReadBytesReturned = totalNonReadBytesReturned(
      deps.metrics.burdenByKind,
    );
    draft.cumulative.burdenByKind = deps.metrics.burdenByKind;
    text = stabilize(false);
  }
  if (text === null) {
    throw new Error("MCP receipt byte accounting did not converge");
  }
  const exposesCompressionRatio = outputReceipt.mode === "full"
    && outputReceipt.compressionRatio !== undefined;
  updateAccounting(Buffer.byteLength(text, "utf8"), exposesCompressionRatio);
  if (
    outputReceipt.mode === "compact"
    && Buffer.byteLength(deps.codec.encode(outputReceipt), "utf8") > COMPACT_RECEIPT_MAX_BYTES
  ) {
    throw new Error("Compact MCP receipt exceeded its 512-byte contract");
  }

  Object.freeze(outputReceipt);
  const receipt = freezeReceipt(draft);
  const structuredContent = parseJsonObject(
    deps.codec.decode(text),
    `MCP ${tool} output`,
  );
  getMcpOutputSchema(tool).parse(structuredContent);
  getMcpDiscoveryOutputSchema(tool).parse(structuredContent);

  return {
    result: {
      content: [{ type: "text", text }],
      structuredContent,
    },
    textBytes: Buffer.byteLength(text, "utf8"),
    receipt,
  };
}
