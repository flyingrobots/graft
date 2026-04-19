import * as path from "node:path";
import { z } from "zod";
import type { JsonCodec } from "../../ports/codec.js";
import type { FileSystem } from "../../ports/filesystem.js";
import type {
  WorkspaceCapabilityProfile,
} from "../workspace-router.js";
import type { AuthorizedWorkspaceRecord } from "./types.js";

// ---------------------------------------------------------------------------
// Zod schemas for persisted authorization state
// ---------------------------------------------------------------------------

const workspaceCapabilityProfileSchema = z.object({
  boundedReads: z.boolean(),
  structuralTools: z.boolean(),
  precisionTools: z.boolean(),
  stateBookmarks: z.boolean(),
  runtimeLogs: z.literal("session_local_only"),
  runCapture: z.boolean(),
}).strict();

const authorizedWorkspaceRecordSchema = z.object({
  repoId: z.string(),
  worktreeId: z.string(),
  worktreeRoot: z.string(),
  gitCommonDir: z.string(),
  capabilityProfile: workspaceCapabilityProfileSchema,
  authorizedAt: z.string(),
  lastBoundAt: z.string().nullable(),
}).strict();

const persistedControlPlaneStateSchema = z.object({
  version: z.literal(1),
  workspaces: z.array(authorizedWorkspaceRecordSchema),
}).strict();

export type PersistedControlPlaneState = z.infer<typeof persistedControlPlaneStateSchema>;

// ---------------------------------------------------------------------------
// Capability profile helpers
// ---------------------------------------------------------------------------

export function cloneCapabilityProfile(
  profile: WorkspaceCapabilityProfile,
): WorkspaceCapabilityProfile {
  return { ...profile };
}

export function capabilityProfilesEqual(
  left: WorkspaceCapabilityProfile,
  right: WorkspaceCapabilityProfile,
): boolean {
  return left.boundedReads === right.boundedReads
    && left.structuralTools === right.structuralTools
    && left.precisionTools === right.precisionTools
    && left.stateBookmarks === right.stateBookmarks
    && left.runCapture === right.runCapture;
}

export function resolveCapabilityProfile(
  current: WorkspaceCapabilityProfile | undefined,
  defaultProfile: WorkspaceCapabilityProfile,
  runCapture: boolean | undefined,
): WorkspaceCapabilityProfile {
  return {
    ...(current ?? defaultProfile),
    ...(runCapture !== undefined ? { runCapture } : {}),
  };
}

// ---------------------------------------------------------------------------
// Record helpers
// ---------------------------------------------------------------------------

export function sortByWorktreeRoot(records: readonly AuthorizedWorkspaceRecord[]): AuthorizedWorkspaceRecord[] {
  return [...records].sort((left, right) => left.worktreeRoot.localeCompare(right.worktreeRoot));
}

export function cloneAuthorizedWorkspaceRecord(record: AuthorizedWorkspaceRecord): AuthorizedWorkspaceRecord {
  return {
    ...record,
    capabilityProfile: cloneCapabilityProfile(record.capabilityProfile),
  };
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

const CONTROL_PLANE_DIR = "control-plane";
const AUTHORIZED_WORKSPACES_FILE = "authorized-workspaces.json";

export function buildStatePath(graftDir: string): string {
  return path.join(
    path.resolve(graftDir),
    CONTROL_PLANE_DIR,
    AUTHORIZED_WORKSPACES_FILE,
  );
}

export async function loadPersistedState(
  statePath: string,
  fs: FileSystem,
  codec: JsonCodec,
): Promise<PersistedControlPlaneState | null> {
  const raw = await fs.readFile(statePath, "utf-8").catch((error: unknown) => {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return null;
    }
    throw error;
  });
  if (raw === null) return null;
  return persistedControlPlaneStateSchema.parse(codec.decode(raw));
}

export async function persistState(
  statePath: string,
  fs: FileSystem,
  codec: JsonCodec,
  workspaces: ReadonlyMap<string, AuthorizedWorkspaceRecord>,
): Promise<void> {
  const payload: PersistedControlPlaneState = {
    version: 1,
    workspaces: sortByWorktreeRoot([...workspaces.values()]),
  };
  await fs.mkdir(path.dirname(statePath), { recursive: true });
  await fs.writeFile(statePath, codec.encode(payload), "utf-8");
}
