import { z } from "zod";
import { INSPECTION_LIMITS } from "./daemon-inspection-limits.js";
import { inspectionText } from "../format/inspection-text.js";
export { INSPECTION_LIMITS } from "./daemon-inspection-limits.js";

export const INSPECTION_SCHEMA_VERSION = "1.0.0";
export const INSPECTION_PATH = "/inspect/v1";
const text = z.string().max(INSPECTION_LIMITS.text).refine(value => inspectionText(value) === value, "Unsafe diagnostic detail");
const identity = text.min(1).regex(/^[^\p{Cc}\p{Cf}]+$/u);
const count = z.number().int().nonnegative();
const timestamp = z.iso.datetime();

export const inspectionRequestSchema = z.object({
  sessionId: identity.optional(), workspaceId: identity.optional(), repoId: identity.optional(),
  limit: z.number().int().min(1).max(INSPECTION_LIMITS.rows).optional(),
}).strict().refine(value => [value.sessionId, value.workspaceId, value.repoId].filter(v => v !== undefined).length <= 1, "Use only one identity selector");
export type InspectionRequest = z.infer<typeof inspectionRequestSchema>;

const completeness = z.enum(["complete", "truncated", "bounded", "unknown"]);
export function inspectionCollectionSchema<T extends z.ZodType>(row: T) {
  return z.object({
    availability: z.enum(["available", "unavailable"]), completeness,
    returned: count, matchingTotal: count.nullable(), reason: text.nullable(),
    rows: z.array(row).max(INSPECTION_LIMITS.rows),
  }).strict().superRefine((value, ctx) => {
    if (value.returned !== value.rows.length
      || (value.matchingTotal !== null && value.matchingTotal < value.returned)
      || (value.completeness === "complete" && (value.availability !== "available" || value.matchingTotal !== value.returned))
      || (value.availability === "unavailable" && (value.completeness !== "unknown" || value.matchingTotal !== null || value.returned !== 0))) {
      ctx.addIssue({ code: "custom", message: "Inconsistent inventory evidence" });
    }
  });
}
export interface InspectionCollection<T> {
  availability: "available" | "unavailable";
  completeness: "complete" | "truncated" | "bounded" | "unknown";
  returned: number; matchingTotal: number | null; reason: string | null; rows: T[];
}

export const inspectionWorkspaceIdentitySchema = z.object({ repoId: identity, worktreeId: identity, worktreeRoot: text }).strict();
export type InspectionWorkspaceIdentity = z.infer<typeof inspectionWorkspaceIdentitySchema>;
export const inspectionOpenedWorkspaceSchema = inspectionWorkspaceIdentitySchema.extend({ openedAt: timestamp, lastActivatedAt: timestamp.nullable() });
export type InspectionOpenedWorkspace = z.infer<typeof inspectionOpenedWorkspaceSchema>;

export const inspectionIndexEvidenceSchema = z.object({
  availability: z.enum(["available", "unsupported", "unavailable", "not_retained"]),
  entryCount: count.nullable(), countScope: z.enum(["current_index_entries", "distinct_files", "file_versions", "historical_records"]).nullable(),
  completeness,
  sourceObservations: z.enum(["single", "mixed", "unknown"]),
  basis: z.object({ kind: z.enum(["git_commit", "workspace_observation"]), id: identity }).strict().nullable(),
  // v1 has no authority to validate current source content.
  currentSourceValidation: z.literal("unavailable"),
}).strict().superRefine((value, ctx) => {
  if ((value.sourceObservations !== "single" && value.basis !== null)
    || (value.sourceObservations === "single" && value.basis === null)
    || ((value.entryCount === null) !== (value.countScope === null))
    || (value.availability !== "available" && (value.entryCount !== null || value.basis !== null || value.completeness !== "unknown"))) {
    ctx.addIssue({ code: "custom", message: "Index basis, coverage, and current-source evidence must be independent and supported" });
  }
});
export type InspectionIndexEvidence = z.infer<typeof inspectionIndexEvidenceSchema>;

const sessionRow = z.object({
  sessionId: identity, startedAt: timestamp, lastActivityAt: timestamp,
  activeWorkspace: inspectionWorkspaceIdentitySchema.nullable(),
  reportedClient: z.object({ name: text, version: text, verification: z.literal("client_reported") }).strict().nullable(),
  reportedClientAvailability: z.enum(["available", "not_retained"]),
  openedWorkspaces: inspectionCollectionSchema(inspectionOpenedWorkspaceSchema),
}).strict();
export type InspectionSessionRow = z.infer<typeof sessionRow>;
const workspaceRow = inspectionWorkspaceIdentitySchema.extend({
  authorizedAt: timestamp, authorization: z.literal("authorized"),
  indexEvidence: inspectionIndexEvidenceSchema,
  storageAssociation: z.literal("not_retained"), residency: z.literal("not_retained"),
});
export type InspectionWorkspaceRow = z.infer<typeof workspaceRow>;
export const inspectionJobSchema = z.object({
  jobId: identity, sessionId: identity.nullable(), repoId: identity, worktreeId: identity.nullable(),
  sliceId: identity.nullable(), writerId: identity, tool: text,
  kind: z.enum(["repo_tool", "persistent_monitor"]), priority: z.enum(["interactive", "background"]),
  state: z.enum(["queued", "running"]), enqueuedAt: timestamp, startedAt: timestamp.nullable(),
}).strict();
const jobRow = inspectionJobSchema.extend({
  originatingSession: z.enum(["registered", "not_registered", "not_applicable", "unavailable"]),
  waitReason: z.literal("not_exposed"), workerCorrelation: z.literal("not_retained"),
});
export type InspectionJobRow = z.infer<typeof jobRow>;
export const inspectionWorkerSchema = z.object({
  workerId: identity, pid: count.nullable(), requestId: identity.nullable(),
  state: z.enum(["idle", "assigned"]), sessionId: identity.nullable(),
  repoId: identity.nullable(), worktreeId: identity.nullable(),
}).strict();
export const inspectionMonitorSchema = z.object({
  repoId: identity, anchorWorktreeRoot: text, lifecycleState: z.enum(["running", "paused", "stopped"]),
  recordedHealth: z.enum(["ok", "lagging", "error", "unauthorized", "paused", "stopped"]),
  lastTickAt: timestamp.nullable(), lastSuccessAt: timestamp.nullable(), lastIndexedCommit: identity.nullable(),
  lastHeadCommit: identity.nullable(), backlogCommits: count,
  sourceCurrency: z.literal("not_validated"), errorDetail: z.literal("not_exported"),
}).strict();
export const inspectionRuntimeSchema = z.object({
  incarnationId: identity, startedAt: timestamp, pid: count, version: text,
  modulePath: text, executablePath: text, socketPath: text,
}).strict();
export type InspectionRuntime = z.infer<typeof inspectionRuntimeSchema>;
const counters = z.object({ completed: count, failed: count }).strict();
const observationBodySchema = z.object({
  schemaId: z.literal("graft.daemon.inspection"), schemaVersion: z.literal(INSPECTION_SCHEMA_VERSION),
  runtime: inspectionRuntimeSchema,
  capture: z.object({
    sequence: z.number().int().positive(), observedAt: timestamp,
    consistency: z.literal("synchronous_parent_state"),
    componentGenerations: z.literal("not_retained"), workUnits: count.max(INSPECTION_LIMITS.workUnits),
    workerEvidence: z.literal("parent_last_known_assignments"),
  }).strict(),
  scope: z.object({ authority: z.literal("same_user_operator"), filter: inspectionRequestSchema,
    jobs: z.literal("scheduler_jobs_only"), workers: z.literal("daemon_wide"), pool: z.literal("daemon_wide"), history: z.literal("daemon_lifetime_all_workspaces") }).strict(),
  sessions: inspectionCollectionSchema(sessionRow), workspaces: inspectionCollectionSchema(workspaceRow),
  jobs: inspectionCollectionSchema(jobRow), workers: inspectionCollectionSchema(inspectionWorkerSchema),
  monitors: inspectionCollectionSchema(inspectionMonitorSchema),
  pool: z.object({ repositoryKeys: count, meaning: z.literal("pool_keys_including_pending_opens"), workspaceAssociations: z.literal("not_retained") }).strict().nullable(),
  history: z.object({
    incarnationId: identity, accumulationStartedAt: timestamp,
    scheduler: counters.nullable(), workers: counters.nullable(), recentFailures: z.literal("not_retained"),
  }).strict(),
  serviceAssessment: z.object({ availability: z.literal("unsupported"), reason: z.literal("NO_CURRENT_HEALTH_RULE") }).strict(),
}).strict().refine(value => value.sessions.returned + value.workspaces.returned + value.jobs.returned + value.workers.returned + value.monitors.returned
  + value.sessions.rows.reduce((total, session) => total + session.openedWorkspaces.returned, 0) <= INSPECTION_LIMITS.totalRows, "Capture record limit exceeded");

/** Reject oversized inventories before running any per-record validators. */
function boundedObservation(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  let total = 0;
  const rows = (collection: unknown): unknown[] | null => {
    if (typeof collection !== "object" || collection === null || !("rows" in collection) || !Array.isArray(collection.rows)) return null;
    if (collection.rows.length > INSPECTION_LIMITS.rows) return null;
    total += collection.rows.length;
    return total <= INSPECTION_LIMITS.totalRows ? collection.rows : null;
  };
  for (const key of ["sessions", "workspaces", "jobs", "workers", "monitors"]) {
    const items = rows(record[key]);
    if (items === null) return false;
    if (key === "sessions") {
      for (const session of items) {
        if (typeof session !== "object" || session === null || !("openedWorkspaces" in session) || rows(session.openedWorkspaces) === null) return false;
      }
    }
  }
  return true;
}

export const inspectionObservationSchema = z.preprocess((value, ctx) => {
  if (!boundedObservation(value)) {
    ctx.addIssue({ code: "custom", message: "Invalid or oversized inspection inventory" });
    return z.NEVER;
  }
  return value;
}, observationBodySchema);
export type InspectionObservation = z.infer<typeof inspectionObservationSchema>;

export const inspectionResultSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("ok"), clientVersion: text, observation: inspectionObservationSchema }).strict(),
  z.object({ status: z.enum(["no_daemon", "unsupported", "observation_failed"]), clientVersion: text, reason: text }).strict(),
]);
export type InspectionResult = z.infer<typeof inspectionResultSchema>;
