// ---------------------------------------------------------------------------
// Diagnostic tool response models — explicit types for diagnostic tool outputs
// ---------------------------------------------------------------------------

import type { BurdenByKind, BurdenKind } from "../burden.js";
import type { RuntimeObservabilityState } from "../runtime-observability.js";
import type { RuntimeCausalContext } from "../runtime-causal-context.js";
import type { SessionDepth } from "../../session/types.js";
import type {
  PersistedLocalHistorySummary,
  RepoConcurrencySummary,
} from "../persisted-local-history.js";
import type { RuntimeWorkspaceOverlayFooting } from "../runtime-workspace-overlay.js";
import type { CausalSurfaceNextAction } from "../../contracts/causal-surface-next-action.js";

export interface SetBudgetResponse {
  readonly budget: {
    readonly total: number;
    readonly consumed: number;
    readonly remaining: number;
    readonly fraction: number;
  } | null;
}

export interface StatsResponse {
  readonly totalReads: number;
  readonly totalOutlines: number;
  readonly totalRefusals: number;
  readonly totalCacheHits: number;
  readonly totalBytesReturned: number;
  readonly totalBytesAvoidedByCache: number;
  readonly totalNonReadBytesReturned: number;
  readonly burdenByKind: Readonly<BurdenByKind>;
}

export interface ExplainResponse {
  readonly code: string;
  readonly meaning?: string | undefined;
  readonly action?: string | undefined;
  readonly error?: string | undefined;
  readonly knownCodes?: string | undefined;
}

export interface DoctorBurdenSummary {
  readonly totalBytesReturned: number;
  readonly totalNonReadBytesReturned: number;
  readonly topKind: BurdenKind | null;
  readonly topBytesReturned: number;
  readonly topCalls: number;
}

export interface DoctorResponse {
  readonly projectRoot: string;
  readonly parserHealthy: boolean;
  readonly thresholds: { readonly lines: number; readonly bytes: number };
  readonly sessionDepth: SessionDepth;
  readonly totalMessages: number;
  readonly burdenSummary: DoctorBurdenSummary;
  readonly runtimeObservability: RuntimeObservabilityState;
  readonly causalContext: RuntimeCausalContext;
  readonly latestReadEvent: PersistedLocalHistorySummary["latestReadEvent"];
  readonly latestStageEvent: PersistedLocalHistorySummary["latestStageEvent"];
  readonly latestTransitionEvent: PersistedLocalHistorySummary["latestTransitionEvent"];
  readonly repoConcurrency: RepoConcurrencySummary | null;
  readonly checkoutEpoch: unknown;
  readonly lastTransition: unknown;
  readonly semanticTransition: unknown;
  readonly workspaceOverlayId: unknown;
  readonly workspaceOverlay: unknown;
  readonly workspaceOverlayFooting: RuntimeWorkspaceOverlayFooting | null;
  readonly stagedTarget: unknown;
  readonly attribution: PersistedLocalHistorySummary["attribution"];
  readonly persistedLocalHistory: PersistedLocalHistorySummary;
  readonly recommendedNextAction: CausalSurfaceNextAction;
}

export interface RunCapturePolicyBoundary {
  readonly kind: "shell_escape_hatch";
  readonly boundedReadContract: false;
  readonly policyEnforced: false;
}

export interface RunCaptureResponse {
  readonly output: string;
  readonly totalLines: number;
  readonly tailedLines: number;
  readonly logPath: string | null;
  readonly logRedactions: number;
  readonly logPersistenceEnabled: boolean;
  readonly truncated: boolean;
  readonly policyBoundary: RunCapturePolicyBoundary;
  readonly disabled?: boolean | undefined;
  readonly error?: string | undefined;
  readonly stderr?: string | undefined;
}
