import * as path from "node:path";
import type { JsonCodec } from "../ports/codec.js";
import type { FileSystem } from "../ports/filesystem.js";
import {
  persistedMonitorStateSchema,
  type PersistedMonitorRecord,
  type PersistedMonitorState,
} from "./monitor-types.js";

/**
 * Clone a persisted monitor record (shallow copy — all fields are primitives).
 */
export function cloneRecord(record: PersistedMonitorRecord): PersistedMonitorRecord {
  return { ...record };
}

/**
 * Load monitor records from disk.
 * Returns an empty array when the file does not exist yet.
 */
export async function loadMonitorRecords(
  fs: FileSystem,
  codec: JsonCodec,
  statePath: string,
): Promise<readonly PersistedMonitorRecord[]> {
  const raw = await fs.readFile(statePath, "utf-8").catch((error: unknown) => {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return null;
    }
    throw error;
  });
  if (raw === null) return [];
  const decoded = persistedMonitorStateSchema.parse(codec.decode(raw));
  return decoded.monitors.map(cloneRecord);
}

/**
 * Persist monitor records to disk, creating parent directories as needed.
 */
export async function persistMonitorRecords(
  fs: FileSystem,
  codec: JsonCodec,
  statePath: string,
  records: ReadonlyMap<string, PersistedMonitorRecord>,
): Promise<void> {
  const payload: PersistedMonitorState = {
    version: 1,
    monitors: [...records.values()]
      .map(cloneRecord)
      .sort((left, right) => left.gitCommonDir.localeCompare(right.gitCommonDir)),
  };
  await fs.mkdir(path.dirname(statePath), { recursive: true });
  await fs.writeFile(statePath, codec.encode(payload), "utf-8");
}
