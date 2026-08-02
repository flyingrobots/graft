// SPDX-License-Identifier: Apache-2.0
// © James Ross Ω FLYING•ROBOTS <https://github.com/flyingrobots>

import { describe, expect, it } from "vitest";
import { RepoWorkspace } from "../../../src/operations/repo-workspace.js";
import { CanonicalJsonCodec } from "../../../src/adapters/canonical-json.js";
import type { WorkspaceReadView } from "../../../src/operations/workspace-read-view.js";

const SOURCE = "export function greet(name: string): string {\n  return `hello ${name}`;\n}\n";

/** Counts observations, and can be told to answer differently each time. */
class ScriptedReadView implements WorkspaceReadView {
  readonly reads: string[] = [];

  constructor(private readonly answers: readonly string[]) {}

  readBytes(path: string): Promise<Uint8Array> {
    const answer = this.answers[Math.min(this.reads.length, this.answers.length - 1)] ?? "";
    this.reads.push(path);
    return Promise.resolve(new TextEncoder().encode(answer));
  }
}

function workspaceOver(view: WorkspaceReadView): RepoWorkspace {
  return new RepoWorkspace({
    projectRoot: "/workspace",
    codec: new CanonicalJsonCodec(),
    readView: view,
  });
}

/**
 * These pin one physical observation per operation.
 *
 * An operation that reads twice can evaluate policy against one version of a
 * file and project a different one, then cache the pair as though they came
 * from the same read. Under a settled snapshot the two reads agree by
 * construction, so this is a defect in the live path — which is every
 * production read Graft currently performs.
 */
describe("one observation per operation", () => {
  it("observes once for safeRead", async () => {
    const view = new ScriptedReadView([SOURCE]);

    await workspaceOver(view).safeRead({ path: "app.ts" });

    expect(view.reads).toEqual(["app.ts"]);
  });

  it("observes once for fileOutline", async () => {
    const view = new ScriptedReadView([SOURCE]);

    await workspaceOver(view).fileOutline({ path: "app.ts" });

    expect(view.reads).toEqual(["app.ts"]);
  });

  it("observes once for readRange", async () => {
    const view = new ScriptedReadView([SOURCE]);

    await workspaceOver(view).readRange({ path: "app.ts", start: 1, end: 2 });

    expect(view.reads).toEqual(["app.ts"]);
  });

  it("cannot outline content it did not evaluate", async () => {
    // The mutant: a file rewritten between the policy read and the projection
    // read. A two-read implementation caches the hash of the first alongside
    // the outline of the second, so the cache then claims a symbol set the
    // recorded bytes never contained.
    const rewritten = "export function impostor(): void {}\n";
    const view = new ScriptedReadView([SOURCE, rewritten]);

    const result = await workspaceOver(view).fileOutline({ path: "app.ts" });

    const names = JSON.stringify(result);
    expect(names).toContain("greet");
    expect(names).not.toContain("impostor");
  });

  it("cannot range-read content it did not evaluate", async () => {
    const rewritten = "export function impostor(): void {}\n";
    const view = new ScriptedReadView([SOURCE, rewritten]);

    const result = await workspaceOver(view).readRange({ path: "app.ts", start: 1, end: 1 });

    expect(JSON.stringify(result)).not.toContain("impostor");
  });
});
