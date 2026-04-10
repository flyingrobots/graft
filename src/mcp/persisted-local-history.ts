import * as crypto from "node:crypto";
import * as path from "node:path";
import { z } from "zod";
import {
  localHistoryContinuityOperationSchema,
  type LocalHistoryContinuityOperation,
} from "../contracts/causal-ontology.js";
import type { JsonCodec } from "../ports/codec.js";
import type { FileSystem } from "../ports/filesystem.js";
import type { RepoObservation } from "./repo-state.js";
import type { RuntimeCausalContext } from "./runtime-causal-context.js";
import type { WorkspaceStatus } from "./workspace-router.js";

const PERSISTED_LOCAL_HISTORY_PRESERVES = Object.freeze([
  "continuity_operations",
  "runtime_context_ids",
  "workspace_overlay_snapshots",
] as const);

const PERSISTED_LOCAL_HISTORY_EXCLUDES = Object.freeze([
  "raw_chat_transcripts",
  "queue_bookkeeping",
  "canonical_provenance",
  "canonical_structural_truth",
] as const);

const continuityRecordSchema = z.object({
  recordId: z.string().min(1),
  continuityKey: z.string().min(1),
  operation: localHistoryContinuityOperationSchema,
  repoId: z.string().min(1),
  worktreeId: z.string().min(1),
  transportSessionId: z.string().min(1),
  workspaceSliceId: z.string().min(1),
  causalSessionId: z.string().min(1),
  strandId: z.string().min(1),
  checkoutEpochId: z.string().min(1),
  workspaceOverlayId: z.string().min(1).nullable(),
  occurredAt: z.string().min(1),
  continuedFromRecordId: z.string().min(1).nullable(),
  continuedFromCausalSessionId: z.string().min(1).nullable(),
  continuedFromStrandId: z.string().min(1).nullable(),
}).strict();

type ContinuityRecord = z.infer<typeof continuityRecordSchema>;

const continuityStateSchema = z.object({
  continuityKey: z.string().min(1),
  repoId: z.string().min(1),
  worktreeId: z.string().min(1),
  activeRecordId: z.string().min(1).nullable(),
  records: z.array(continuityRecordSchema),
}).strict();

type ContinuityState = z.infer<typeof continuityStateSchema>;

export interface PersistedLocalHistoryContext {
  readonly repoId: string;
  readonly worktreeId: string;
  readonly transportSessionId: string;
  readonly workspaceSliceId: string;
  readonly causalSessionId: string;
  readonly strandId: string;
  readonly checkoutEpochId: string;
  readonly workspaceOverlayId: string | null;
  readonly observedAt: string;
}

export interface PersistedLocalHistorySummaryNone {
  readonly availability: "none";
  readonly persistence: "persisted_local_history";
  readonly historyPath: null;
  readonly totalContinuityRecords: 0;
  readonly active: false;
  readonly lastOperation: null;
  readonly lastObservedAt: null;
  readonly continuityKey: null;
  readonly causalSessionId: null;
  readonly strandId: null;
  readonly checkoutEpochId: null;
  readonly continuedFromCausalSessionId: null;
  readonly preserves: readonly string[];
  readonly excludes: readonly string[];
  readonly nextAction: "bind_workspace_to_begin_local_history";
}

export interface PersistedLocalHistorySummaryPresent {
  readonly availability: "present";
  readonly persistence: "persisted_local_history";
  readonly historyPath: string;
  readonly totalContinuityRecords: number;
  readonly active: boolean;
  readonly lastOperation: LocalHistoryContinuityOperation;
  readonly lastObservedAt: string;
  readonly continuityKey: string;
  readonly causalSessionId: string;
  readonly strandId: string;
  readonly checkoutEpochId: string;
  readonly continuedFromCausalSessionId: string | null;
  readonly preserves: readonly string[];
  readonly excludes: readonly string[];
  readonly nextAction: "continue_active_causal_workspace" | "inspect_or_resume_local_history";
}

export type PersistedLocalHistorySummary =
  | PersistedLocalHistorySummaryNone
  | PersistedLocalHistorySummaryPresent;

function stableId(prefix: string, input: string): string {
  return `${prefix}:${crypto.createHash("sha256").update(input).digest("hex").slice(0, 16)}`;
}

export function buildContinuityKey(repoId: string, worktreeId: string): string {
  return stableId("continuity", `${repoId}:${worktreeId}`);
}

function buildRecordId(
  continuityKey: string,
  operation: LocalHistoryContinuityOperation,
  context: PersistedLocalHistoryContext,
): string {
  return stableId(
    "history",
    JSON.stringify({
      continuityKey,
      operation,
      occurredAt: context.observedAt,
      causalSessionId: context.causalSessionId,
      strandId: context.strandId,
      workspaceSliceId: context.workspaceSliceId,
    }),
  );
}

function createEmptyState(continuityKey: string, repoId: string, worktreeId: string): ContinuityState {
  return {
    continuityKey,
    repoId,
    worktreeId,
    activeRecordId: null,
    records: [],
  };
}

function findRecord(state: ContinuityState, recordId: string | null): ContinuityRecord | null {
  if (recordId === null) return null;
  return state.records.find((record) => record.recordId === recordId) ?? null;
}

function appendRecord(state: ContinuityState, record: ContinuityRecord, activeAfter: boolean): void {
  state.records = [...state.records, record];
  state.activeRecordId = activeAfter ? record.recordId : null;
}

export class PersistedLocalHistoryStore {
  constructor(
    private readonly deps: {
      readonly fs: FileSystem;
      readonly codec: JsonCodec;
      readonly graftDir: string;
    },
  ) {}

  async noteBinding(input: {
    readonly current: PersistedLocalHistoryContext;
    readonly previous?: PersistedLocalHistoryContext | null;
  }): Promise<void> {
    const previous = input.previous ?? null;
    const currentKey = buildContinuityKey(input.current.repoId, input.current.worktreeId);

    if (previous !== null) {
      const previousKey = buildContinuityKey(previous.repoId, previous.worktreeId);
      if (previousKey !== currentKey) {
        const previousState = await this.loadState(previousKey, previous.repoId, previous.worktreeId);
        const previousActive = findRecord(previousState, previousState.activeRecordId);
        if (previousActive !== null) {
          appendRecord(
            previousState,
            this.createRecord("park", previousKey, previous, previousActive),
            false,
          );
          await this.saveState(previousState);
        }
      }
    }

    const currentState = await this.loadState(currentKey, input.current.repoId, input.current.worktreeId);
    const previousCurrentActive = findRecord(currentState, currentState.activeRecordId);
    if (previousCurrentActive !== null) {
      appendRecord(
        currentState,
        this.createRecord("park", currentKey, input.current, previousCurrentActive),
        false,
      );
    }

    const operation = this.classifyOperation(previousCurrentActive, input.current);
    appendRecord(
      currentState,
      this.createRecord(operation, currentKey, input.current, previousCurrentActive),
      true,
    );
    await this.saveState(currentState);
  }

  async noteCheckoutBoundary(input: {
    readonly previous: PersistedLocalHistoryContext;
    readonly current: PersistedLocalHistoryContext;
  }): Promise<void> {
    const continuityKey = buildContinuityKey(input.current.repoId, input.current.worktreeId);
    const state = await this.loadState(continuityKey, input.current.repoId, input.current.worktreeId);
    const activeRecord = findRecord(state, state.activeRecordId);
    const baseRecord = activeRecord ?? state.records.at(-1) ?? null;
    if (baseRecord === null) {
      appendRecord(
        state,
        this.createRecord("start", continuityKey, input.current, null),
        true,
      );
      await this.saveState(state);
      return;
    }
    if (baseRecord.checkoutEpochId === input.current.checkoutEpochId) {
      return;
    }

    appendRecord(
      state,
      this.createRecord("park", continuityKey, input.previous, baseRecord),
      false,
    );
    appendRecord(
      state,
      this.createRecord("fork", continuityKey, input.current, baseRecord),
      true,
    );
    await this.saveState(state);
  }

  async summarize(status: WorkspaceStatus, causalContext: RuntimeCausalContext): Promise<PersistedLocalHistorySummary> {
    if (status.repoId === null || status.worktreeId === null) {
      return this.emptySummary();
    }

    const continuityKey = buildContinuityKey(status.repoId, status.worktreeId);
    const state = await this.loadState(continuityKey, status.repoId, status.worktreeId);
    const activeRecord = findRecord(state, state.activeRecordId);
    const lastRecord = state.records.at(-1) ?? null;
    if (lastRecord === null || status.graftDir === null) {
      return this.emptySummary();
    }

    const effectiveRecord = activeRecord ?? lastRecord;
    return {
      availability: "present",
      persistence: "persisted_local_history",
      historyPath: this.historyPathFor(continuityKey),
      totalContinuityRecords: state.records.length,
      active: activeRecord !== null,
      lastOperation: lastRecord.operation,
      lastObservedAt: lastRecord.occurredAt,
      continuityKey,
      causalSessionId: effectiveRecord.causalSessionId,
      strandId: effectiveRecord.strandId,
      checkoutEpochId: effectiveRecord.checkoutEpochId,
      continuedFromCausalSessionId: lastRecord.continuedFromCausalSessionId,
      preserves: PERSISTED_LOCAL_HISTORY_PRESERVES,
      excludes: PERSISTED_LOCAL_HISTORY_EXCLUDES,
      nextAction: activeRecord?.causalSessionId === causalContext.causalSessionId
        ? "continue_active_causal_workspace"
        : "inspect_or_resume_local_history",
    };
  }

  buildContext(
    status: WorkspaceStatus,
    causalContext: RuntimeCausalContext,
    repoState: RepoObservation,
  ): PersistedLocalHistoryContext | null {
    if (status.repoId === null || status.worktreeId === null) {
      return null;
    }
    return {
      repoId: status.repoId,
      worktreeId: status.worktreeId,
      transportSessionId: causalContext.transportSessionId,
      workspaceSliceId: causalContext.workspaceSliceId,
      causalSessionId: causalContext.causalSessionId,
      strandId: causalContext.strandId,
      checkoutEpochId: causalContext.checkoutEpochId,
      workspaceOverlayId: repoState.workspaceOverlayId,
      observedAt: repoState.observedAt,
    };
  }

  private classifyOperation(
    previous: ContinuityRecord | null,
    current: PersistedLocalHistoryContext,
  ): LocalHistoryContinuityOperation {
    if (previous === null) {
      return "start";
    }
    if (previous.transportSessionId === current.transportSessionId) {
      return "resume";
    }
    if (previous.checkoutEpochId === current.checkoutEpochId) {
      return "attach";
    }
    return "fork";
  }

  private createRecord(
    operation: LocalHistoryContinuityOperation,
    continuityKey: string,
    context: PersistedLocalHistoryContext,
    previous: ContinuityRecord | null,
  ): ContinuityRecord {
    return {
      recordId: buildRecordId(continuityKey, operation, context),
      continuityKey,
      operation,
      repoId: context.repoId,
      worktreeId: context.worktreeId,
      transportSessionId: context.transportSessionId,
      workspaceSliceId: context.workspaceSliceId,
      causalSessionId: context.causalSessionId,
      strandId: context.strandId,
      checkoutEpochId: context.checkoutEpochId,
      workspaceOverlayId: context.workspaceOverlayId,
      occurredAt: context.observedAt,
      continuedFromRecordId: previous?.recordId ?? null,
      continuedFromCausalSessionId: previous?.causalSessionId ?? null,
      continuedFromStrandId: previous?.strandId ?? null,
    };
  }

  private emptySummary(): PersistedLocalHistorySummaryNone {
    return {
      availability: "none",
      persistence: "persisted_local_history",
      historyPath: null,
      totalContinuityRecords: 0,
      active: false,
      lastOperation: null,
      lastObservedAt: null,
      continuityKey: null,
      causalSessionId: null,
      strandId: null,
      checkoutEpochId: null,
      continuedFromCausalSessionId: null,
      preserves: PERSISTED_LOCAL_HISTORY_PRESERVES,
      excludes: PERSISTED_LOCAL_HISTORY_EXCLUDES,
      nextAction: "bind_workspace_to_begin_local_history",
    };
  }

  private historyPathFor(continuityKey: string): string {
    return path.join(this.deps.graftDir, "local-history", `${continuityKey}.json`);
  }

  private async loadState(
    continuityKey: string,
    repoId: string,
    worktreeId: string,
  ): Promise<ContinuityState> {
    try {
      const raw = await this.deps.fs.readFile(this.historyPathFor(continuityKey), "utf-8");
      return continuityStateSchema.parse(this.deps.codec.decode(raw));
    } catch {
      return createEmptyState(continuityKey, repoId, worktreeId);
    }
  }

  private async saveState(state: ContinuityState): Promise<void> {
    const filePath = this.historyPathFor(state.continuityKey);
    await this.deps.fs.mkdir(path.dirname(filePath), { recursive: true });
    await this.deps.fs.writeFile(filePath, this.deps.codec.encode(state), "utf-8");
  }
}
