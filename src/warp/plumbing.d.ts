declare module "@git-stunts/plumbing" {
  import type { GitPlumbing as GitPlumbingInterface } from "@git-stunts/git-warp";

  export default class GitPlumbing implements GitPlumbingInterface {
    readonly emptyTree: string;
    constructor(options: { cwd: string });
    execute(options: { args: string[]; input?: string | Uint8Array }): Promise<string>;
    executeStream(options: { args: string[] }): Promise<AsyncIterable<Uint8Array> & { collect(opts?: { asString?: boolean }): Promise<Uint8Array | string> }>;
  }
}
