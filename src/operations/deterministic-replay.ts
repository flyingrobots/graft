// ---------------------------------------------------------------------------
// Deterministic Scenario Replay — re-drive sessions for CI regression
// ---------------------------------------------------------------------------

import type { FileSystem } from "../ports/filesystem.js";

/** A recorded tool call with its expected result. */
export interface RecordedToolCall {
  readonly tool: string;
  readonly args: Readonly<Record<string, unknown>>;
  readonly expectedResult: Readonly<Record<string, unknown>>;
}

/** A replay scenario: filesystem snapshot + recorded calls. */
interface _ReplayScenario {
  readonly files: Readonly<Record<string, string>>;
  readonly calls: readonly RecordedToolCall[];
}

/** A single mismatch between expected and actual. */
export interface ReplayFailure {
  readonly index: number;
  readonly tool: string;
  readonly expected: Readonly<Record<string, unknown>>;
  readonly actual: Readonly<Record<string, unknown>>;
}

/** Result of replaying a scenario. */
export interface ReplayResult {
  readonly passed: boolean;
  readonly total: number;
  readonly matched: number;
  readonly mismatched: number;
  readonly failures: readonly ReplayFailure[];
}

/** Handler that executes a tool call and returns the result. */
export type ToolCallHandler = (
  tool: string,
  args: Readonly<Record<string, unknown>>,
) => Promise<Readonly<Record<string, unknown>>>;

/**
 * Create a mock FileSystem from a snapshot map.
 *
 * Keys are file paths, values are file contents. Provides readFile,
 * readdir, stat, and other FileSystem methods backed by the map.
 */
export function createSnapshotFs(
  files: Readonly<Record<string, string>>,
): FileSystem {
  const fileMap = new Map(Object.entries(files));

  return {
    readFile(path: string, _encoding?: string): Promise<string> {
      const content = fileMap.get(path);
      if (content === undefined) {
        return Promise.reject(new Error(`File not found in snapshot: ${path}`));
      }
      return Promise.resolve(content);
    },

    readFileSync(path: string): string {
      const content = fileMap.get(path);
      if (content === undefined) {
        throw new Error(`File not found in snapshot: ${path}`);
      }
      return content;
    },

    readdir(dirPath: string): Promise<string[]> {
      const prefix = dirPath.endsWith("/") ? dirPath : `${dirPath}/`;
      const entries = new Set<string>();
      for (const key of fileMap.keys()) {
        if (key.startsWith(prefix)) {
          const rest = key.slice(prefix.length);
          const firstSegment = rest.split("/")[0];
          if (firstSegment !== undefined && firstSegment.length > 0) {
            entries.add(firstSegment);
          }
        }
      }
      return Promise.resolve([...entries].sort());
    },

    writeFile(): Promise<void> {
      return Promise.resolve();
    },

    appendFile(): Promise<void> {
      return Promise.resolve();
    },

    mkdir(): Promise<void> {
      return Promise.resolve();
    },

    stat(path: string): Promise<{ size: number }> {
      const content = fileMap.get(path);
      return Promise.resolve({ size: content?.length ?? 0 });
    },
  } as FileSystem;
}

/**
 * Replay a sequence of recorded tool calls against a handler.
 *
 * Compares each actual result to the expected result from the
 * recording. Returns pass/fail with details on mismatches.
 */
export async function replayToolCalls(
  calls: readonly RecordedToolCall[],
  handler: ToolCallHandler,
): Promise<ReplayResult> {
  const failures: ReplayFailure[] = [];
  let matched = 0;

  for (let i = 0; i < calls.length; i++) {
    const call = calls[i] ?? { tool: "", args: {}, expectedResult: {} };
    const actual = await handler(call.tool, call.args);
    const expectedJson = JSON.stringify(call.expectedResult);
    const actualJson = JSON.stringify(actual);

    if (expectedJson === actualJson) {
      matched++;
    } else {
      failures.push({
        index: i,
        tool: call.tool,
        expected: call.expectedResult,
        actual,
      });
    }
  }

  return {
    passed: failures.length === 0,
    total: calls.length,
    matched,
    mismatched: failures.length,
    failures,
  };
}
