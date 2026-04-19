import type { FileSystem } from "../ports/filesystem.js";

const MAX_STATE_BYTES = 8192;
export const STATE_FILENAME = "state.md";

export class StateSaveResult {
  readonly ok: boolean;
  readonly reason?: string | undefined;

  private constructor(ok: boolean, reason?: string) {
    this.ok = ok;
    this.reason = reason;
  }

  static success(): StateSaveResult {
    return new StateSaveResult(true);
  }

  static rejected(reason: string): StateSaveResult {
    return new StateSaveResult(false, reason);
  }
}

export class StateLoadResult {
  readonly content: string | null;

  private constructor(content: string | null) {
    this.content = content;
  }

  static found(content: string): StateLoadResult {
    return new StateLoadResult(content);
  }

  static empty(): StateLoadResult {
    return new StateLoadResult(null);
  }
}

export async function stateSave(
  content: string,
  opts: { stateDir: string; statePath: string; fs: FileSystem },
): Promise<StateSaveResult> {
  const bytes = Buffer.byteLength(content, "utf-8");
  if (bytes > MAX_STATE_BYTES) {
    return StateSaveResult.rejected(
      `State exceeds 8 KB limit (${String(bytes)} bytes)`,
    );
  }

  await opts.fs.mkdir(opts.stateDir, { recursive: true });
  await opts.fs.writeFile(opts.statePath, content, "utf-8");

  return StateSaveResult.success();
}

export async function stateLoad(
  opts: { statePath: string; fs: FileSystem },
): Promise<StateLoadResult> {
  try {
    const content = await opts.fs.readFile(opts.statePath, "utf-8");
    return StateLoadResult.found(content);
  } catch {
    return StateLoadResult.empty();
  }
}
