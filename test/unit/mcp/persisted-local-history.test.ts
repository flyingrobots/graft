import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { CanonicalJsonCodec } from "../../../src/adapters/canonical-json.js";
import { nodeFs } from "../../../src/adapters/node-fs.js";
import {
  PersistedLocalHistoryStore,
  buildContinuityKey,
  type PersistedLocalHistoryContext,
} from "../../../src/mcp/persisted-local-history.js";

function context(overrides: Partial<PersistedLocalHistoryContext> = {}): PersistedLocalHistoryContext {
  return {
    repoId: "repo:one",
    worktreeId: "worktree:one",
    transportSessionId: "transport:one",
    workspaceSliceId: "slice-0001",
    causalSessionId: "causal:one",
    strandId: "strand:one",
    checkoutEpochId: "epoch:one",
    workspaceOverlayId: null,
    observedAt: "2026-04-10T01:00:00.000Z",
    ...overrides,
  };
}

describe("mcp: persisted local history", () => {
  const cleanups: string[] = [];

  afterEach(() => {
    while (cleanups.length > 0) {
      fs.rmSync(cleanups.pop()!, { recursive: true, force: true });
    }
  });

  it("records a start operation for the first bound continuity context", async () => {
    const graftDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-history-"));
    cleanups.push(graftDir);

    const store = new PersistedLocalHistoryStore({
      fs: nodeFs,
      codec: new CanonicalJsonCodec(),
      graftDir,
    });

    await store.noteBinding({ current: context() });
    const summary = await store.summarize(
      {
        sessionMode: "repo_local",
        bindState: "bound",
        repoId: "repo:one",
        worktreeId: "worktree:one",
        worktreeRoot: "/repo",
        gitCommonDir: "/repo/.git",
        graftDir,
        capabilityProfile: null,
      },
      {
        transportSessionId: "transport:one",
        workspaceSliceId: "slice-0001",
        causalSessionId: "causal:one",
        strandId: "strand:one",
        checkoutEpochId: "epoch:one",
        warpWriterId: "graft",
        stability: "runtime_local",
        provenanceLevel: "artifact_history",
      },
    );

    expect(summary.availability).toBe("present");
    if (summary.availability !== "present") {
      return;
    }
    expect(summary.lastOperation).toBe("start");
    expect(summary.totalContinuityRecords).toBe(1);
    expect(summary.continuityKey).toBe(buildContinuityKey("repo:one", "worktree:one"));
    expect(fs.existsSync(summary.historyPath)).toBe(true);
  });

  it("classifies a second transport on the same footing as attach and preserves lineage", async () => {
    const graftDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-history-"));
    cleanups.push(graftDir);

    const store = new PersistedLocalHistoryStore({
      fs: nodeFs,
      codec: new CanonicalJsonCodec(),
      graftDir,
    });

    await store.noteBinding({ current: context() });
    await store.noteBinding({
      current: context({
        transportSessionId: "transport:two",
        workspaceSliceId: "slice-0002",
        causalSessionId: "causal:two",
        strandId: "strand:two",
        observedAt: "2026-04-10T01:05:00.000Z",
      }),
    });

    const summary = await store.summarize(
      {
        sessionMode: "daemon",
        bindState: "bound",
        repoId: "repo:one",
        worktreeId: "worktree:one",
        worktreeRoot: "/repo",
        gitCommonDir: "/repo/.git",
        graftDir,
        capabilityProfile: null,
      },
      {
        transportSessionId: "transport:two",
        workspaceSliceId: "slice-0002",
        causalSessionId: "causal:two",
        strandId: "strand:two",
        checkoutEpochId: "epoch:one",
        warpWriterId: "graft_session_two",
        stability: "runtime_local",
        provenanceLevel: "artifact_history",
      },
    );

    expect(summary.availability).toBe("present");
    if (summary.availability !== "present") {
      return;
    }
    expect(summary.lastOperation).toBe("attach");
    expect(summary.totalContinuityRecords).toBe(3);
    expect(summary.causalSessionId).toBe("causal:two");
    expect(summary.continuedFromCausalSessionId).toBe("causal:one");
  });

  it("parks the previous continuity key when binding onto a different worktree", async () => {
    const graftDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-history-"));
    cleanups.push(graftDir);

    const store = new PersistedLocalHistoryStore({
      fs: nodeFs,
      codec: new CanonicalJsonCodec(),
      graftDir,
    });

    await store.noteBinding({ current: context() });
    await store.noteBinding({
      previous: context(),
      current: context({
        repoId: "repo:two",
        worktreeId: "worktree:two",
        transportSessionId: "transport:two",
        workspaceSliceId: "slice-0002",
        causalSessionId: "causal:two",
        strandId: "strand:two",
        checkoutEpochId: "epoch:two",
        observedAt: "2026-04-10T01:10:00.000Z",
      }),
    });

    const firstSummary = await store.summarize(
      {
        sessionMode: "daemon",
        bindState: "bound",
        repoId: "repo:one",
        worktreeId: "worktree:one",
        worktreeRoot: "/repo-one",
        gitCommonDir: "/repo-one/.git",
        graftDir,
        capabilityProfile: null,
      },
      {
        transportSessionId: "transport:two",
        workspaceSliceId: "slice-0002",
        causalSessionId: "causal:two",
        strandId: "strand:two",
        checkoutEpochId: "epoch:two",
        warpWriterId: "graft_session_two",
        stability: "runtime_local",
        provenanceLevel: "artifact_history",
      },
    );

    expect(firstSummary.availability).toBe("present");
    if (firstSummary.availability !== "present") {
      return;
    }
    expect(firstSummary.active).toBe(false);
    expect(firstSummary.lastOperation).toBe("park");
    expect(firstSummary.nextAction).toBe("inspect_or_resume_local_history");
  });
});
