declare module "@git-stunts/plumbing" {
  interface GitStream {
    readonly finished: Promise<{ code: number; stderr: string; error?: Error }>;
    collect(options?: {
      maxBytes?: number;
      asString?: boolean;
      encoding?: string;
    }): Promise<Uint8Array | string>;
    [Symbol.asyncIterator](): AsyncIterator<Uint8Array>;
  }

  export default class GitPlumbing {
    readonly emptyTree: string;
    constructor(options: { runner: unknown; cwd?: string });
    static createDefault(options?: { cwd?: string; env?: string }): Promise<GitPlumbing>;
    execute(options: {
      args: string[];
      input?: string | Uint8Array;
      env?: Record<string, string>;
      maxBytes?: number;
    }): Promise<string>;
    executeStream(options: {
      args: string[];
      input?: string | Uint8Array;
      env?: Record<string, string>;
    }): Promise<GitStream>;
  }
}
