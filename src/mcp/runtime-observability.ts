import * as path from "node:path";
import { ZodError } from "zod";
import type { JsonCodec } from "../ports/codec.js";
import type { FileSystem } from "../ports/filesystem.js";
import type { MetricsSnapshot } from "./metrics.js";
import type { BurdenKind } from "./burden.js";
import type { SessionDepth } from "../session/types.js";

export type RuntimeLogPolicy = "metadata_only";

export interface RuntimeObservabilityState {
  readonly enabled: boolean;
  readonly logPath: string;
  readonly maxBytes: number;
  readonly logPolicy: RuntimeLogPolicy;
}

export interface ResolveRuntimeObservabilityOptions {
  readonly graftDir: string;
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly overrides?: Partial<RuntimeObservabilityState>;
}

const DEFAULT_MAX_BYTES = 1_048_576;
const DEFAULT_POLICY: RuntimeLogPolicy = "metadata_only";

function parseBooleanFlag(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  const normalized = value.trim().toLowerCase();
  if ([ "0", "false", "no", "off" ].includes(normalized)) return false;
  if ([ "1", "true", "yes", "on" ].includes(normalized)) return true;
  return fallback;
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function resolveRuntimeObservabilityState(
  options: ResolveRuntimeObservabilityOptions,
): RuntimeObservabilityState {
  const env = options.env ?? process.env;
  const base: RuntimeObservabilityState = {
    enabled: parseBooleanFlag(env["GRAFT_ENABLE_MCP_RUNTIME_LOG"], true),
    logPath: env["GRAFT_MCP_RUNTIME_LOG_PATH"]?.trim() ?? path.join(options.graftDir, "logs", "mcp-runtime.ndjson"),
    maxBytes: parsePositiveInteger(env["GRAFT_MCP_RUNTIME_LOG_MAX_BYTES"], DEFAULT_MAX_BYTES),
    logPolicy: DEFAULT_POLICY,
  };
  return {
    ...base,
    ...options.overrides,
  };
}

export interface RuntimeSessionStartedEvent {
  readonly event: "session_started";
  readonly sessionId: string;
  readonly logPath: string;
  readonly logPolicy: RuntimeLogPolicy;
}

export interface RuntimeToolCallStartedEvent {
  readonly event: "tool_call_started";
  readonly sessionId: string;
  readonly traceId: string;
  readonly tool: string;
  readonly argKeys: readonly string[];
  readonly sessionDepth: SessionDepth;
}

export interface RuntimeToolCallCompletedEvent {
  readonly event: "tool_call_completed";
  readonly sessionId: string;
  readonly traceId: string;
  readonly seq: number;
  readonly tool: string;
  readonly latencyMs: number;
  readonly projection: string;
  readonly reason: string;
  readonly burdenKind: BurdenKind;
  readonly nonReadBurden: boolean;
  readonly returnedBytes: number;
  readonly fileBytes: number | null;
  readonly sessionDepth: SessionDepth;
  readonly tripwireSignals: readonly string[];
  readonly metrics: MetricsSnapshot;
}

export type RuntimeFailureKind = "validation_error" | "tool_error" | "unknown_error";

export interface RuntimeToolCallFailedEvent {
  readonly event: "tool_call_failed";
  readonly sessionId: string;
  readonly traceId: string;
  readonly tool: string;
  readonly latencyMs: number;
  readonly sessionDepth: SessionDepth;
  readonly argKeys: readonly string[];
  readonly errorKind: RuntimeFailureKind;
  readonly errorName: string;
}

type RuntimeEvent =
  | RuntimeSessionStartedEvent
  | RuntimeToolCallStartedEvent
  | RuntimeToolCallCompletedEvent
  | RuntimeToolCallFailedEvent;

export interface RuntimeEventLoggerOptions {
  readonly fs: FileSystem;
  readonly codec: JsonCodec;
  readonly logPath: string;
  readonly maxBytes: number;
}

export async function ensureGraftDirExcluded(
  projectRoot: string,
  graftDir: string,
  fs: FileSystem,
): Promise<void> {
  const relative = path.relative(projectRoot, graftDir);
  if (relative.length === 0 || relative.startsWith("..") || path.isAbsolute(relative)) {
    return;
  }

  const entry = relative.replaceAll(path.sep, "/").replace(/\/?$/, "/");
  const excludePath = path.join(projectRoot, ".git", "info", "exclude");

  let existing: string;
  try {
    existing = await fs.readFile(excludePath, "utf-8");
  } catch {
    return;
  }

  const entries = existing
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (entries.includes(entry)) {
    return;
  }

  const prefix = existing.length === 0 || existing.endsWith("\n") ? "" : "\n";
  await fs.appendFile(excludePath, `${prefix}${entry}\n`, "utf-8");
}

export function classifyRuntimeFailure(error: unknown): {
  kind: RuntimeFailureKind;
  name: string;
} {
  if (error instanceof ZodError) {
    return { kind: "validation_error", name: error.name };
  }
  if (error instanceof Error) {
    return { kind: "tool_error", name: error.name };
  }
  return { kind: "unknown_error", name: "UnknownError" };
}

export function sanitizeArgKeys(args: Record<string, unknown>): string[] {
  return Object.keys(args).sort();
}

export class RuntimeEventLogger {
  private readonly fs: FileSystem;
  private readonly codec: JsonCodec;
  private readonly logPath: string;
  private readonly maxBytes: number;
  private queue: Promise<void> = Promise.resolve();

  constructor(options: RuntimeEventLoggerOptions) {
    this.fs = options.fs;
    this.codec = options.codec;
    this.logPath = options.logPath;
    this.maxBytes = options.maxBytes;
  }

  log(event: RuntimeEvent): Promise<void> {
    const prior = this.queue.catch((_error: unknown) => undefined);
    this.queue = prior
      .then(async () => {
        const line = this.codec.encode({ ts: new Date().toISOString(), ...event }) + "\n";
        const dir = path.dirname(this.logPath);
        await this.fs.mkdir(dir, { recursive: true });
        await this.fs.appendFile(this.logPath, line, "utf-8");
        await this.rotateIfNeeded();
      });
    return this.queue;
  }

  private async rotateIfNeeded(): Promise<void> {
    let stat: { size: number };
    try {
      stat = await this.fs.stat(this.logPath);
    } catch {
      return;
    }

    if (stat.size <= this.maxBytes) {
      return;
    }

    const content = await this.fs.readFile(this.logPath, "utf-8");
    const lines = content.trimEnd().split("\n");
    let kept = lines.slice(Math.ceil(lines.length / 2));
    let result = kept.join("\n") + "\n";

    while (Buffer.byteLength(result, "utf-8") > this.maxBytes && kept.length > 1) {
      kept = kept.slice(Math.ceil(kept.length / 2));
      result = kept.join("\n") + "\n";
    }

    await this.fs.writeFile(this.logPath, result, "utf-8");
  }
}
