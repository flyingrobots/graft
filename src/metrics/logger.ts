import { RotatingNdjsonLog } from "../adapters/rotating-ndjson-log.js";
import type { FileSystem } from "../ports/filesystem.js";
import type { JsonCodec } from "../ports/codec.js";
import type { DecisionEntry } from "./types.js";

export interface MetricsLoggerOptions {
  readonly fs: FileSystem;
  readonly codec: JsonCodec;
  readonly maxBytes?: number;
}

export class MetricsLogger {
  private readonly writer: RotatingNdjsonLog;

  constructor(logPath: string, options: MetricsLoggerOptions) {
    const writerOptions = {
      logPath,
      fs: options.fs,
      codec: options.codec,
      ...(options.maxBytes === undefined ? {} : { maxBytes: options.maxBytes }),
    };
    this.writer = new RotatingNdjsonLog(writerOptions);
  }

  async log(entry: Omit<DecisionEntry, "ts">): Promise<void> {
    const full: DecisionEntry = {
      ts: new Date().toISOString(),
      ...entry,
    };
    await this.writer.append(full);
  }
}
