declare module "@git-stunts/plumbing" {
  import type { GitPlumbing as GitPlumbingInterface } from "@git-stunts/git-warp";

  export default class GitPlumbing implements GitPlumbingInterface {
    readonly emptyTree: string;
    constructor(options: { runner: unknown; cwd?: string });
    static createDefault(options?: { cwd?: string; env?: string }): GitPlumbing;
    execute(options: { args: string[]; input?: string | Uint8Array }): Promise<string>;
    executeStream(options: { args: string[] }): Promise<{
      finished: Promise<{ code: number; stderr: string; error?: Error }>;
      collect(opts?: { maxBytes?: number; asString?: boolean; encoding?: string }): Promise<Uint8Array | string>;
      [Symbol.asyncIterator](): AsyncIterator<Uint8Array>;
    }>;
  }
}
