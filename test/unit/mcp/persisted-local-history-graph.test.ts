import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { CanonicalJsonCodec } from "../../../src/adapters/canonical-json.js";
import { nodeFs } from "../../../src/adapters/node-fs.js";
import type { AttributionSummary } from "../../../src/contracts/causal-ontology.js";
import { PersistedLocalHistoryStore, type PersistedLocalHistoryContext } from "../../../src/mcp/persisted-local-history.js";
import type { PersistedLocalHistoryGraphContext } from "../../../src/mcp/persisted-local-history-graph.js";

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

class FakeWarp {
  readonly nodes = new Map<string, Record<string, unknown>>();
  readonly edges = new Map<string, { from: string; to: string; label: string }>();

  hasNode(nodeId: string): Promise<boolean> {
    return Promise.resolve(this.nodes.has(nodeId));
  }

  observer(lens: {
    readonly match: string | readonly string[];
    readonly expose?: readonly string[] | undefined;
  }): Promise<{
    getNodes(): Promise<string[]>;
    getNodeProps(nodeId: string): Promise<Record<string, unknown> | null>;
    getEdges(): Promise<{ from: string; to: string; label: string }[]>;
  }> {
    const patterns = Array.isArray(lens.match) ? [...lens.match] : [lens.match];
    const matchingNodeIds = [...this.nodes.keys()].filter((nodeId) =>
      patterns.some((pattern) => pattern.endsWith("*")
        ? nodeId.startsWith(pattern.slice(0, -1))
        : nodeId === pattern),
    );
    const matchingNodeIdSet = new Set(matchingNodeIds);

    return Promise.resolve({
      getNodes: () => Promise.resolve(matchingNodeIds),
      getNodeProps: (nodeId: string) => Promise.resolve(this.nodes.get(nodeId) ?? null),
      getEdges: () => Promise.resolve(
        [...this.edges.values()].filter((edge) =>
          matchingNodeIdSet.has(edge.from) && matchingNodeIdSet.has(edge.to),
        ),
      ),
    });
  }

  async patch(build: (patch: {
    addNode(id: string): unknown;
    setProperty(id: string, key: string, value: unknown): unknown;
    addEdge(from: string, to: string, label: string): unknown;
  }) => void | Promise<void>): Promise<string> {
    const patch = {
      addNode: (id: string) => {
        this.nodes.set(id, this.nodes.get(id) ?? {});
        return patch;
      },
      setProperty: (id: string, key: string, value: unknown) => {
        this.nodes.set(id, {
          ...(this.nodes.get(id) ?? {}),
          [key]: value,
        });
        return patch;
      },
      addEdge: (from: string, to: string, label: string) => {
        this.edges.set(`${from}\u0000${label}\u0000${to}`, { from, to, label });
        return patch;
      },
    };

    await build(patch);
    return "patch:test";
  }

  getNode(nodeId: string): Record<string, unknown> | undefined {
    return this.nodes.get(nodeId);
  }

  hasEdge(from: string, to: string, label: string): boolean {
    return this.edges.has(`${from}\u0000${label}\u0000${to}`);
  }

  findNode(predicate: (props: Record<string, unknown>) => boolean): [string, Record<string, unknown>] | undefined {
    for (const entry of this.nodes.entries()) {
      if (predicate(entry[1])) {
        return entry;
      }
    }
    return undefined;
  }
}

describe("mcp: persisted local history graph dual write", () => {
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

  function graphContext(fakeWarp: FakeWarp): PersistedLocalHistoryGraphContext {
    return {
      warp: fakeWarp,
      worktreeRoot: "/repo",
    };
  }

  function workspaceStatus(graftDir: string, overrides: Partial<{
    repoId: string;
    worktreeId: string;
    worktreeRoot: string;
    gitCommonDir: string;
  }> = {}) {
    return {
      sessionMode: "repo_local" as const,
      bindState: "bound" as const,
      repoId: overrides.repoId ?? "repo:one",
      worktreeId: overrides.worktreeId ?? "worktree:one",
      worktreeRoot: overrides.worktreeRoot ?? "/repo",
      gitCommonDir: overrides.gitCommonDir ?? "/repo/.git",
      graftDir,
      capabilityProfile: null,
    };
  }

  function causalContextFor(current: PersistedLocalHistoryContext) {
    return {
      transportSessionId: current.transportSessionId,
      workspaceSliceId: current.workspaceSliceId,
      causalSessionId: current.causalSessionId,
      strandId: current.strandId,
      checkoutEpochId: current.checkoutEpochId,
      warpWriterId: current.warpWriterId,
      stability: "runtime_local" as const,
      provenanceLevel: "artifact_history" as const,
    };
  }

  it("writes continuity anchors and start events into the WARP graph while preserving JSON", async () => {
    const { store } = createStore();
    const fakeWarp = new FakeWarp();

    await store.noteBinding({
      current: context(),
      currentGraph: graphContext(fakeWarp),
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
    const fakeWarp = new FakeWarp();
    const current = context({
      workspaceOverlayId: "overlay:one",
    });

    await store.noteBinding({
      current,
      currentGraph: graphContext(fakeWarp),
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
      graph: graphContext(fakeWarp),
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
    const fakeWarp = new FakeWarp();
    const current = context({
      workspaceOverlayId: "overlay:one",
    });

    await store.noteBinding({
      current,
      currentGraph: graphContext(fakeWarp),
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
      graph: graphContext(fakeWarp),
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
    const fakeWarp = new FakeWarp();
    const current = context({
      workspaceOverlayId: "overlay:one",
    });

    await writingStore.noteBinding({
      current,
      currentGraph: graphContext(fakeWarp),
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
      graph: graphContext(fakeWarp),
    });

    const summary = await readingStore.summarize(
      workspaceStatus(readingGraftDir),
      causalContextFor(current),
      graphContext(fakeWarp),
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
    const fakeWarp = new FakeWarp();
    const current = context({
      workspaceOverlayId: "overlay:one",
    });

    await writingStore.noteBinding({
      current,
      currentGraph: graphContext(fakeWarp),
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
      graph: graphContext(fakeWarp),
    });

    const window = await readingStore.listRecentActivity(
      workspaceStatus(readingGraftDir),
      causalContextFor(current),
      12,
      graphContext(fakeWarp),
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
    const fakeWarp = new FakeWarp();

    await writingStore.noteBinding({
      current: context(),
      currentGraph: graphContext(fakeWarp),
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
      currentGraph: graphContext(fakeWarp),
    });

    const summary = await readingStore.summarizeRepoConcurrency(
      workspaceStatus(readingGraftDir),
      graphContext(fakeWarp),
    );

    expect(summary).toEqual(expect.objectContaining({
      posture: "shared_repo_only",
      authority: "repo_identity_only",
      observedWorktreeCount: 2,
      observedCausalSessionCount: 2,
    }));
  });
});
