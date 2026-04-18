import * as path from "node:path";
import type { JsonCodec } from "../ports/codec.js";
import type { FileSystem } from "../ports/filesystem.js";

export interface RotatingNdjsonLogOptions {
  readonly fs: FileSystem;
  readonly codec: JsonCodec;
  readonly logPath: string;
  readonly maxBytes?: number;
}

const DEFAULT_MAX_BYTES = 1_048_576;

export class RotatingNdjsonLog {
  private readonly fs: FileSystem;
  private readonly codec: JsonCodec;
  private readonly logPath: string;
  private readonly maxBytes: number;

  constructor(options: RotatingNdjsonLogOptions) {
    this.fs = options.fs;
    this.codec = options.codec;
    this.logPath = options.logPath;
    this.maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  }

  async append(entry: object): Promise<void> {
    const line = this.codec.encode(entry) + "\n";
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
    let kept = lines.slice(Math.ceil(lines.length / 2));

    // If slicing left nothing (e.g. a single oversized entry), skip rotation —
    // the file is already at minimum size (one entry).
    if (kept.length === 0) {
      return;
    }

    let result = kept.join("\n") + "\n";

    while (Buffer.byteLength(result, "utf-8") > this.maxBytes && kept.length > 1) {
      kept = kept.slice(Math.ceil(kept.length / 2));
      result = kept.join("\n") + "\n";
    }

    await this.fs.writeFile(this.logPath, result, "utf-8");
  }
}
