import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { CanonicalJsonCodec } from "../../../src/adapters/canonical-json.js";
import { nodeFs } from "../../../src/adapters/node-fs.js";
import type { AttributionSummary } from "../../../src/contracts/causal-ontology.js";
import { PersistedLocalHistoryStore, type PersistedLocalHistoryContext } from "../../../src/mcp/persisted-local-history.js";
import {
  FakePersistedLocalHistoryWarp,
  persistedLocalHistoryCausalContext,
  persistedLocalHistoryGraphContext,
  persistedLocalHistoryWorkspaceStatus,
} from "../../helpers/persisted-local-history-graph.js";

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
    warpWriterId: "graft",
    transitionKind: null,
    transitionReflogSubject: null,
    hookTransitionName: null,
    hookTransitionArgs: null,
    hookTransitionObservedAt: null,
    ...overrides,
  };
}

function attribution(overrides: Partial<AttributionSummary> = {}): AttributionSummary {
  return {
    actor: {
      actorId: "agent:test",
      actorKind: "agent",
      displayName: "Codex",
      source: "test",
      authorityScope: "declared",
    },
    confidence: "high",
    basis: "explicit_declaration",
    evidence: [
      {
        evidenceId: "evidence:test:1",
        evidenceKind: "explicit_agent_declaration",
        source: "test",
        capturedAt: "2026-04-10T01:00:00.000Z",
        strength: "direct",
        details: {
          actorId: "agent:test",
        },
      },
    ],
    ...overrides,
  };
}

describe("mcp: persisted local history graph storage", () => {
  const cleanups: string[] = [];

  afterEach(() => {
    while (cleanups.length > 0) {
      fs.rmSync(cleanups.pop()!, { recursive: true, force: true });
    }
  });

  function createStore(): { store: PersistedLocalHistoryStore; graftDir: string } {
    const graftDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-history-graph-"));
    cleanups.push(graftDir);
    return {
      graftDir,
      store: new PersistedLocalHistoryStore({
        fs: nodeFs,
        codec: new CanonicalJsonCodec(),
        graftDir,
      }),
    };
  }

  it("writes continuity anchors and start events into the WARP graph", async () => {
    const { store } = createStore();
    const fakeWarp = new FakePersistedLocalHistoryWarp();

    await store.noteBinding({
      current: context(),
      currentGraph: persistedLocalHistoryGraphContext(fakeWarp),
    });

    const continuityEvent = fakeWarp.findNode((props) =>
      props["entityKind"] === "local_history_event" &&
      props["eventKind"] === "continuity" &&
      props["continuityOperation"] === "start"
    );
    expect(continuityEvent).toBeDefined();
    const continuityEventId = continuityEvent?.[0] ?? "";

    expect(fakeWarp.getNode("repo:one")).toEqual(expect.objectContaining({
      entityKind: "repo",
      repoId: "repo:one",
    }));
    expect(fakeWarp.getNode("worktree:one")).toEqual(expect.objectContaining({
      entityKind: "worktree",
      repoId: "repo:one",
      worktreeId: "worktree:one",
      worktreeRoot: "/repo",
    }));
    expect(fakeWarp.getNode("lh:epoch:epoch:one")).toEqual(expect.objectContaining({
      entityKind: "checkout_epoch",
      checkoutEpochId: "epoch:one",
      openedAt: "2026-04-10T01:00:00.000Z",
    }));
    expect(fakeWarp.hasEdge("repo:one", "worktree:one", "has_worktree")).toBe(true);
    expect(fakeWarp.hasEdge(continuityEventId, "lh:session:causal:one", "in_session")).toBe(true);
    expect(fakeWarp.hasEdge(continuityEventId, "lh:strand:strand:one", "creates_strand")).toBe(true);
    expect(fakeWarp.hasEdge(continuityEventId, "lh:actor:unknown", "attributed_to")).toBe(true);

    const evidenceNode = fakeWarp.findNode((props) =>
      props["entityKind"] === "evidence" &&
      props["evidenceKind"] === "writer_lane_identity"
    );
    expect(evidenceNode).toBeDefined();
    expect(fakeWarp.hasEdge(continuityEventId, evidenceNode?.[0] ?? "", "supported_by")).toBe(true);
  });

  it("writes read events with footprints and follows the prior continuity event", async () => {
    const { store } = createStore();
    const fakeWarp = new FakePersistedLocalHistoryWarp();
    const current = context({
      workspaceOverlayId: "overlay:one",
    });

    await store.noteBinding({
      current,
      currentGraph: persistedLocalHistoryGraphContext(fakeWarp),
    });
    await store.noteReadObservation({
      current,
      attribution: attribution(),
      surface: "safe_read",
      projection: "content",
      sourceLayer: "workspace_overlay",
      reason: "CONTENT",
      footprint: {
        paths: ["app.ts"],
        symbols: ["App.render"],
        regions: [{
          path: "app.ts",
          startLine: 1,
          endLine: 3,
        }],
      },
      graph: persistedLocalHistoryGraphContext(fakeWarp),
    });

    const continuityEventId = fakeWarp.findNode((props) =>
      props["entityKind"] === "local_history_event" &&
      props["eventKind"] === "continuity"
    )?.[0] ?? "";
    const readEvent = fakeWarp.findNode((props) =>
      props["entityKind"] === "local_history_event" &&
      props["eventKind"] === "read"
    );
    expect(readEvent).toBeDefined();
    const readEventId = readEvent?.[0] ?? "";

    expect(fakeWarp.hasEdge(readEventId, continuityEventId, "follows")).toBe(true);

    const footprintNode = fakeWarp.findNode((props) =>
      props["entityKind"] === "causal_footprint" &&
      Array.isArray(props["paths"]) &&
      (props["paths"] as string[]).includes("app.ts")
    );
    expect(footprintNode).toBeDefined();
    const footprintNodeId = footprintNode?.[0] ?? "";

    expect(fakeWarp.hasEdge(readEventId, footprintNodeId, "has_footprint")).toBe(true);
    expect(fakeWarp.hasEdge(footprintNodeId, "file:app.ts", "references_file")).toBe(true);
    expect(fakeWarp.hasEdge("lh:overlay:overlay:one", "file:app.ts", "touches_file")).toBe(true);

    const regionNode = fakeWarp.findNode((props) =>
      props["entityKind"] === "causal_region" &&
      props["path"] === "app.ts" &&
      props["startLine"] === 1
    );
    expect(regionNode).toBeDefined();
    expect(fakeWarp.hasEdge(footprintNodeId, regionNode?.[0] ?? "", "has_region")).toBe(true);
  });

  it("writes stage events with staged-target nodes and structural target edges", async () => {
    const { store } = createStore();
    const fakeWarp = new FakePersistedLocalHistoryWarp();
    const current = context({
      workspaceOverlayId: "overlay:one",
    });

    await store.noteBinding({
      current,
      currentGraph: persistedLocalHistoryGraphContext(fakeWarp),
    });
    await store.noteStageObservation({
      current,
      stagedTarget: {
        availability: "full_file",
        stability: "runtime_local",
        provenanceLevel: "artifact_history",
        attribution: attribution(),
        target: {
          targetId: "target:one",
          targetKind: "staged_target",
          repoId: current.repoId,
          worktreeId: current.worktreeId,
          checkoutEpochId: current.checkoutEpochId,
          workspaceOverlayId: "overlay:one",
          selectedAt: current.observedAt,
          selectionKind: "full_file",
          selectionEntries: [{
            path: "app.ts",
            symbols: ["App.render"],
            regions: [],
          }],
          base: {
            headCommitSha: "abc123",
            indexTreeSha: null,
          },
        },
      },
      attribution: attribution(),
      graph: persistedLocalHistoryGraphContext(fakeWarp),
    });

    const stageEventId = fakeWarp.findNode((props) =>
      props["entityKind"] === "local_history_event" &&
      props["eventKind"] === "stage" &&
      props["targetId"] === "target:one"
    )?.[0] ?? "";

    expect(stageEventId).not.toBe("");
    expect(fakeWarp.getNode("lh:target:target:one")).toEqual(expect.objectContaining({
      entityKind: "staged_target",
      targetId: "target:one",
      selectionKind: "full_file",
    }));
    expect(fakeWarp.hasEdge(stageEventId, "lh:target:target:one", "captures_target")).toBe(true);
    expect(fakeWarp.hasEdge("lh:target:target:one", "lh:overlay:overlay:one", "selected_from")).toBe(true);
    expect(fakeWarp.hasEdge("lh:target:target:one", "file:app.ts", "targets_file")).toBe(true);
    expect(fakeWarp.hasEdge("lh:target:target:one", "sym:app.ts:App.render", "targets_symbol")).toBe(true);
  });

  it("summarizes from the WARP graph even when the JSON sidecar is absent", async () => {
    const { store: writingStore } = createStore();
    const { store: readingStore, graftDir: readingGraftDir } = createStore();
    const fakeWarp = new FakePersistedLocalHistoryWarp();
    const current = context({
      workspaceOverlayId: "overlay:one",
    });

    await writingStore.noteBinding({
      current,
      currentGraph: persistedLocalHistoryGraphContext(fakeWarp),
    });
    await writingStore.noteReadObservation({
      current,
      attribution: attribution(),
      surface: "safe_read",
      projection: "content",
      sourceLayer: "workspace_overlay",
      reason: "CONTENT",
      footprint: {
        paths: ["app.ts"],
        symbols: ["App.render"],
        regions: [],
      },
      graph: persistedLocalHistoryGraphContext(fakeWarp),
    });

    const summary = await readingStore.summarize(
      persistedLocalHistoryWorkspaceStatus(readingGraftDir),
      persistedLocalHistoryCausalContext(current),
      persistedLocalHistoryGraphContext(fakeWarp),
    );

    expect(summary.availability).toBe("present");
    if (summary.availability !== "present") {
      return;
    }
    expect(summary.historyPath).toBeNull();
    expect(summary.totalContinuityRecords).toBe(1);
    expect(summary.lastOperation).toBe("start");
    expect(summary.latestReadEvent).toEqual(expect.objectContaining({
      eventKind: "read",
      payload: expect.objectContaining({
        surface: "safe_read",
        sourceLayer: "workspace_overlay",
      }),
    }));
  });

  it("lists recent activity from the WARP graph even when the JSON sidecar is absent", async () => {
    const { store: writingStore } = createStore();
    const { store: readingStore, graftDir: readingGraftDir } = createStore();
    const fakeWarp = new FakePersistedLocalHistoryWarp();
    const current = context({
      workspaceOverlayId: "overlay:one",
    });

    await writingStore.noteBinding({
      current,
      currentGraph: persistedLocalHistoryGraphContext(fakeWarp),
    });
    await writingStore.noteReadObservation({
      current,
      attribution: attribution(),
      surface: "safe_read",
      projection: "content",
      sourceLayer: "workspace_overlay",
      reason: "CONTENT",
      footprint: {
        paths: ["app.ts"],
        symbols: ["App.render"],
        regions: [],
      },
      graph: persistedLocalHistoryGraphContext(fakeWarp),
    });

    const window = await readingStore.listRecentActivity(
      persistedLocalHistoryWorkspaceStatus(readingGraftDir),
      persistedLocalHistoryCausalContext(current),
      12,
      persistedLocalHistoryGraphContext(fakeWarp),
    );

    expect(window.historyPath).toBeNull();
    expect(window.totalMatchingItems).toBe(2);
    expect(window.truncated).toBe(false);
    expect(window.items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        eventKind: "read",
      }),
      expect.objectContaining({
        itemKind: "continuity",
      }),
    ]));
  });

  it("summarizes repo concurrency from the WARP graph even when JSON sidecars are absent", async () => {
    const { store: writingStore } = createStore();
    const { store: readingStore, graftDir: readingGraftDir } = createStore();
    const fakeWarp = new FakePersistedLocalHistoryWarp();

    await writingStore.noteBinding({
      current: context(),
      currentGraph: persistedLocalHistoryGraphContext(fakeWarp),
    });
    await writingStore.noteBinding({
      current: context({
        worktreeId: "worktree:two",
        transportSessionId: "transport:two",
        workspaceSliceId: "slice-0002",
        causalSessionId: "causal:two",
        strandId: "strand:two",
        observedAt: "2026-04-10T01:15:00.000Z",
      }),
      currentGraph: persistedLocalHistoryGraphContext(fakeWarp),
    });

    const summary = await readingStore.summarizeRepoConcurrency(
      persistedLocalHistoryWorkspaceStatus(readingGraftDir),
      persistedLocalHistoryGraphContext(fakeWarp),
    );

    expect(summary).toEqual(expect.objectContaining({
      posture: "shared_repo_only",
      authority: "repo_identity_only",
      observedWorktreeCount: 2,
      observedCausalSessionCount: 2,
    }));
  });
});
