import type { z } from "zod";
import type {
  InspectionWorkspaceIdentity, InspectionOpenedWorkspace,
  inspectionJobSchema, inspectionWorkerSchema, inspectionMonitorSchema,
} from "../contracts/daemon-inspection.js";

/** These readers must only copy already-owned memory; no I/O, lazy initialization,
 * touches, locks, or workload admission. Each iterator step must be bounded. */
export interface InspectionSession {
  readonly sessionId: string; readonly startedAt: string; readonly lastActivityAt: string;
  readonly activeWorkspace: InspectionWorkspaceIdentity | null;
  readonly reportedClient: { readonly name: string; readonly version: string } | null;
  readonly openedWorkspaces: () => Iterable<InspectionOpenedWorkspace>;
}
export interface InspectionWorkspace extends InspectionWorkspaceIdentity {
  readonly authorizedAt: string;
}
export type InspectionJob = z.infer<typeof inspectionJobSchema>;
export type InspectionWorker = z.infer<typeof inspectionWorkerSchema>;
export type InspectionMonitor = z.infer<typeof inspectionMonitorSchema>;
export interface InspectionSource {
  sessions(sessionId?: string): Iterable<InspectionSession | null>;
  workspaces(): Iterable<InspectionWorkspace | null>;
  jobs(): Iterable<InspectionJob | null>;
  workers(): Iterable<InspectionWorker | null>;
  monitors(): Iterable<InspectionMonitor | null>;
  hasSession(sessionId: string): boolean;
  counters(): { scheduler: { completed: number; failed: number }; workers: { completed: number; failed: number } };
  pool(): { repositoryKeys: number };
}
