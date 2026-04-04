import * as path from "node:path";
import type { FileSystem } from "../ports/filesystem.js";
import type { JsonCodec } from "../ports/codec.js";
import type { DecisionEntry } from "./types.js";

export interface MetricsLoggerOptions {
  readonly fs: FileSystem;
  readonly codec: JsonCodec;
  readonly maxBytes?: number;
}

const DEFAULT_MAX_BYTES = 1_048_576; // 1 MB

export class MetricsLogger {
  private readonly logPath: string;
  private readonly fs: FileSystem;
  private readonly codec: JsonCodec;
  private readonly maxBytes: number;

  constructor(logPath: string, options: MetricsLoggerOptions) {
    this.logPath = logPath;
    this.fs = options.fs;
    this.codec = options.codec;
    this.maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  }

  async log(entry: Omit<DecisionEntry, "ts">): Promise<void> {
    const full: DecisionEntry = {
      ts: new Date().toISOString(),
      ...entry,
    };

    const line = this.codec.encode(full) + "\n";

    const dir = path.dirname(this.logPath);
    await this.fs.mkdir(dir, { recursive: true });
    await this.fs.appendFile(this.logPath, line, "utf-8");

    await this.rotateIfNeeded();
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

    // Keep the most recent half of lines to get well under the limit
    let kept = lines.slice(Math.ceil(lines.length / 2));
    let result = kept.join("\n") + "\n";

    // If still over, keep halving
    while (Buffer.byteLength(result, "utf-8") > this.maxBytes && kept.length > 1) {
      kept = kept.slice(Math.ceil(kept.length / 2));
      result = kept.join("\n") + "\n";
    }

    await this.fs.writeFile(this.logPath, result, "utf-8");
  }
}
