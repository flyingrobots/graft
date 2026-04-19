import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { CanonicalJsonCodec } from "../../../src/adapters/canonical-json.js";
import { nodeFs } from "../../../src/adapters/node-fs.js";
import {
  PersistedLocalHistoryAttachUnavailableError,
  PersistedLocalHistoryStore,
  buildContinuityKey,
  type PersistedLocalHistoryContext,
} from "../../../src/mcp/persisted-local-history.js";
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

function createGraphHarness(graftDir: string, worktreeRoot = "/repo") {
  const warp = new FakePersistedLocalHistoryWarp();
  const graph = persistedLocalHistoryGraphContext(warp, worktreeRoot);
  return {
    warp,
    graph,
    status: (overrides: Partial<{
      sessionMode: "repo_local" | "daemon";
      bindState: "bound" | "unbound";
      repoId: string;
      worktreeId: string;
      worktreeRoot: string;
      gitCommonDir: string;
    }> = {}) => persistedLocalHistoryWorkspaceStatus(graftDir, {
      worktreeRoot,
      ...overrides,
    }),
    causal: persistedLocalHistoryCausalContext,
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
    const harness = createGraphHarness(graftDir);

    await store.noteBinding({ current: context(), currentGraph: harness.graph });
    const summary = await store.summarize(
      harness.status(),
      harness.causal(context()),
      harness.graph,
    );

    expect(summary.availability).toBe("present");
    if (summary.availability !== "present") {
      return;
    }
    expect(summary.lastOperation).toBe("start");
    expect(summary.totalContinuityRecords).toBe(1);
    expect(summary.continuityKey).toBe(buildContinuityKey("repo:one", "worktree:one"));
    expect(summary.continuityConfidence).toBe("high");
    expect(summary.continuityEvidence.map((evidence) => evidence.evidenceKind)).toEqual(
      expect.arrayContaining([
        "mcp_transport_binding",
        "worktree_fs_observation",
        "writer_lane_identity",
      ]),
    );
    expect(summary.attribution.actor.actorKind).toBe("unknown");
    expect(summary.attribution.confidence).toBe("unknown");
    expect(summary.latestReadEvent).toBeNull();
    expect(summary.latestStageEvent).toBeNull();
    expect(summary.historyPath).toBeNull();
  });

  it("classifies a second transport on the same footing as attach and preserves lineage", async () => {
    const graftDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-history-"));
    cleanups.push(graftDir);

    const store = new PersistedLocalHistoryStore({
      fs: nodeFs,
      codec: new CanonicalJsonCodec(),
      graftDir,
    });
    const harness = createGraphHarness(graftDir);

    await store.noteBinding({ current: context(), currentGraph: harness.graph });
    await store.noteBinding({
      current: context({
        transportSessionId: "transport:two",
        workspaceSliceId: "slice-0002",
        causalSessionId: "causal:two",
        strandId: "strand:two",
        observedAt: "2026-04-10T01:05:00.000Z",
      }),
      currentGraph: harness.graph,
    });

    const summary = await store.summarize(
      harness.status({ sessionMode: "daemon" }),
      harness.causal(context({
        transportSessionId: "transport:two",
        workspaceSliceId: "slice-0002",
        causalSessionId: "causal:two",
        strandId: "strand:two",
        checkoutEpochId: "epoch:one",
        warpWriterId: "graft_session_two",
      })),
      harness.graph,
    );

    expect(summary.availability).toBe("present");
    if (summary.availability !== "present") {
      return;
    }
    expect(summary.lastOperation).toBe("attach");
    expect(summary.totalContinuityRecords).toBe(3);
    expect(summary.causalSessionId).toBe("causal:two");
    expect(summary.continuedFromCausalSessionId).toBe("causal:one");
    expect(summary.continuityConfidence).toBe("medium");
    expect(summary.continuityEvidence.map((evidence) => evidence.evidenceKind)).toContain(
      "writer_lane_identity",
    );
    expect(summary.attribution.actor.actorKind).toBe("unknown");
    expect(summary.latestReadEvent).toBeNull();
  });

  it("parks the previous continuity key when binding onto a different worktree", async () => {
    const graftDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-history-"));
    cleanups.push(graftDir);

    const store = new PersistedLocalHistoryStore({
      fs: nodeFs,
      codec: new CanonicalJsonCodec(),
      graftDir,
    });
    const harness = createGraphHarness(graftDir);

    await store.noteBinding({ current: context(), currentGraph: harness.graph });
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
      currentGraph: harness.graph,
      previousGraph: harness.graph,
    });

    const firstSummary = await store.summarize(
      harness.status({
        sessionMode: "daemon",
        worktreeRoot: "/repo-one",
        gitCommonDir: "/repo-one/.git",
      }),
      harness.causal(context({
        transportSessionId: "transport:two",
        workspaceSliceId: "slice-0002",
        causalSessionId: "causal:two",
        strandId: "strand:two",
        checkoutEpochId: "epoch:two",
        warpWriterId: "graft_session_two",
      })),
      harness.graph,
    );

    expect(firstSummary.availability).toBe("present");
    if (firstSummary.availability !== "present") {
      return;
    }
    expect(firstSummary.active).toBe(false);
    expect(firstSummary.lastOperation).toBe("park");
    expect(firstSummary.nextAction).toBe("inspect_or_resume_local_history");
    expect(firstSummary.latestReadEvent).toBeNull();
  });

  it("records direct declaration and handoff evidence for explicit attach", async () => {
    const graftDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-history-"));
    cleanups.push(graftDir);

    const store = new PersistedLocalHistoryStore({
      fs: nodeFs,
      codec: new CanonicalJsonCodec(),
      graftDir,
    });
    const harness = createGraphHarness(graftDir);

    await store.noteBinding({ current: context(), currentGraph: harness.graph });
    const current = context({
      transportSessionId: "transport:two",
      workspaceSliceId: "slice-0002",
      causalSessionId: "causal:two",
      strandId: "strand:two",
      observedAt: "2026-04-10T01:05:00.000Z",
      warpWriterId: "graft_session_two",
    });
    await store.noteBinding({ current, currentGraph: harness.graph });
    await store.declareAttach({
      current,
      declaration: {
        actorKind: "agent",
        actorId: "agent:two",
        fromActorId: "human:james",
        note: "continuing the same line of work",
      },
      graph: harness.graph,
    });

    const summary = await store.summarize(
      harness.status({ sessionMode: "daemon" }),
      harness.causal({
        ...current,
        checkoutEpochId: "epoch:one",
      }),
      harness.graph,
    );

    expect(summary.availability).toBe("present");
    if (summary.availability !== "present") {
      return;
    }
    expect(summary.lastOperation).toBe("attach");
    expect(summary.continuityConfidence).toBe("high");
    expect(summary.continuityEvidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ evidenceKind: "explicit_agent_declaration" }),
        expect.objectContaining({ evidenceKind: "explicit_handoff" }),
      ]),
    );
    expect(summary.attribution.actor.actorKind).toBe("agent");
    expect(summary.attribution.actor.actorId).toBe("agent:two");
    expect(summary.attribution.confidence).toBe("high");
    expect(summary.latestReadEvent).toBeNull();
    expect(summary.latestStageEvent).toBeNull();
  });

  it("records cross-session attach evidence when a lawful same-worktree source session is provided", async () => {
    const graftDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-history-"));
    cleanups.push(graftDir);

    const store = new PersistedLocalHistoryStore({
      fs: nodeFs,
      codec: new CanonicalJsonCodec(),
      graftDir,
    });
    const harness = createGraphHarness(graftDir);

    await store.noteBinding({ current: context(), currentGraph: harness.graph });
    const current = context({
      transportSessionId: "transport:two",
      workspaceSliceId: "slice-0002",
      causalSessionId: "causal:two",
      strandId: "strand:two",
      observedAt: "2026-04-10T01:05:00.000Z",
      warpWriterId: "graft_session_two",
    });
    await store.noteBinding({ current, currentGraph: harness.graph });
    await store.declareSharedAttach({
      current,
      declaration: {
        actorKind: "agent",
        actorId: "agent:two",
        fromActorId: "agent:one",
        note: "continuing after cross-session handoff",
      },
      source: {
        sourceSessionId: "transport:one",
        causalSessionId: "causal:one",
        strandId: "strand:one",
      },
      graph: harness.graph,
    });

    const summary = await store.summarize(
      harness.status({ sessionMode: "daemon" }),
      harness.causal({
        ...current,
        checkoutEpochId: "epoch:one",
      }),
      harness.graph,
    );

    expect(summary.availability).toBe("present");
    if (summary.availability !== "present") {
      return;
    }
    expect(summary.lastOperation).toBe("attach");
    expect(summary.continuedFromCausalSessionId).toBe("causal:one");
    expect(summary.continuityEvidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ evidenceKind: "explicit_handoff" }),
        expect.objectContaining({ evidenceKind: "daemon_session_observation" }),
      ]),
    );
    expect(summary.nextAction).toBe("continue_active_causal_workspace");
  });

  it("retains full read-event history in the WARP graph", async () => {
    const graftDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-history-"));
    cleanups.push(graftDir);

    const store = new PersistedLocalHistoryStore({
      fs: nodeFs,
      codec: new CanonicalJsonCodec(),
      graftDir,
    });
    const harness = createGraphHarness(graftDir);

    const current = context();
    await store.noteBinding({ current, currentGraph: harness.graph });
    for (let index = 0; index < 300; index += 1) {
      await store.noteReadObservation({
        current: {
          ...current,
          observedAt: `2026-04-10T01:00:00.${String(index).padStart(3, "0")}Z`,
        },
        attribution: {
          actor: {
            actorId: "agent:one",
            actorKind: "agent",
            displayName: "Agent One",
            source: "test",
            authorityScope: "declared",
          },
          confidence: "high",
          basis: "explicit_declaration",
          evidence: [
            {
              evidenceId: `evidence:${String(index)}`,
              evidenceKind: "explicit_agent_declaration",
              source: "test",
              capturedAt: `2026-04-10T01:00:00.${String(index).padStart(3, "0")}Z`,
              strength: "direct",
              details: {},
            },
          ],
        },
        surface: "safe_read",
        projection: "content",
        sourceLayer: "workspace_overlay",
        reason: "CONTENT",
        footprint: {
          paths: [`src/file-${String(index)}.ts`],
          symbols: [],
          regions: [],
        },
        graph: harness.graph,
      });
    }

    const summary = await store.summarize(
      harness.status(),
      harness.causal({
        ...current,
        warpWriterId: "graft_session_one",
      }),
      harness.graph,
    );

    expect(summary.availability).toBe("present");
    if (summary.availability !== "present") {
      return;
    }
    expect(summary.latestReadEvent?.footprint.paths).toEqual(["src/file-299.ts"]);
    expect(summary.historyPath).toBeNull();
    expect(harness.warp.findNodes((props) =>
      props["entityKind"] === "local_history_event" &&
      props["eventKind"] === "read"
    )).toHaveLength(300);
  });

  it("records direct hook transition evidence for checkout-boundary continuity", async () => {
    const graftDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-history-"));
    cleanups.push(graftDir);

    const store = new PersistedLocalHistoryStore({
      fs: nodeFs,
      codec: new CanonicalJsonCodec(),
      graftDir,
    });
    const harness = createGraphHarness(graftDir);

    const first = context();
    await store.noteBinding({ current: first, currentGraph: harness.graph });
    await store.noteCheckoutBoundary({
      previous: first,
      current: context({
        transportSessionId: "transport:two",
        workspaceSliceId: "slice-0002",
        causalSessionId: "causal:two",
        strandId: "strand:two",
        checkoutEpochId: "epoch:two",
        observedAt: "2026-04-10T01:10:00.000Z",
        transitionKind: "checkout",
        transitionReflogSubject: "checkout: moving from main to feature/test",
        hookTransitionName: "post-checkout",
        hookTransitionArgs: ["oldsha", "newsha", "1"],
        hookTransitionObservedAt: "2026-04-10T01:09:59.000Z",
      }),
      graph: harness.graph,
    });

    const summary = await store.summarize(
      harness.status(),
      harness.causal(context({
        transportSessionId: "transport:two",
        workspaceSliceId: "slice-0002",
        causalSessionId: "causal:two",
        strandId: "strand:two",
        checkoutEpochId: "epoch:two",
        warpWriterId: "graft_session_two",
      })),
      harness.graph,
    );

    expect(summary.availability).toBe("present");
    if (summary.availability !== "present") {
      return;
    }
    expect(summary.lastOperation).toBe("fork");
    expect(summary.continuityConfidence).toBe("high");
    expect(summary.continuityEvidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          evidenceKind: "git_transition_observation",
        }),
        expect.objectContaining({
          evidenceKind: "git_hook_transition",
          details: expect.objectContaining({
            hookName: "post-checkout",
            hookArgs: ["oldsha", "newsha", "1"],
          }),
        }),
      ]),
    );
    expect(summary.attribution.actor.actorKind).toBe("git");
    expect(summary.attribution.confidence).toBe("high");
    expect(summary.attribution.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ evidenceKind: "git_transition_observation" }),
        expect.objectContaining({ evidenceKind: "git_hook_transition" }),
      ]),
    );
  });

  it("records a bounded attributed read event with explicit footprint", async () => {
    const graftDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-history-"));
    cleanups.push(graftDir);

    const store = new PersistedLocalHistoryStore({
      fs: nodeFs,
      codec: new CanonicalJsonCodec(),
      graftDir,
    });
    const harness = createGraphHarness(graftDir);

    const current = context({
      workspaceOverlayId: "overlay:one",
    });
    await store.noteBinding({ current, currentGraph: harness.graph });

    await store.noteReadObservation({
      current,
      attribution: {
        actor: {
          actorId: "agent:test",
          actorKind: "agent",
          displayName: "Codex",
          source: "causal_attach.declaration",
          authorityScope: "declared",
        },
        confidence: "high",
        basis: "explicit_declaration",
        evidence: [{
          evidenceId: "evidence_read_1",
          evidenceKind: "explicit_agent_declaration",
          source: "causal_attach.declaration",
          capturedAt: current.observedAt,
          strength: "direct",
          details: { actorId: "agent:test" },
        }],
      },
      surface: "safe_read",
      projection: "outline",
      sourceLayer: "workspace_overlay",
      reason: "TOO_LARGE",
      footprint: {
        paths: ["app.ts"],
        symbols: [],
        regions: [],
      },
      graph: harness.graph,
    });

    const summary = await store.summarize(
      harness.status(),
      harness.causal(current),
      harness.graph,
    );

    expect(summary.availability).toBe("present");
    if (summary.availability !== "present") {
      return;
    }
    expect(summary.latestReadEvent?.eventKind).toBe("read");
    expect(summary.latestReadEvent?.payload.surface).toBe("safe_read");
    expect(summary.latestReadEvent?.payload.projection).toBe("outline");
    expect(summary.latestReadEvent?.payload.sourceLayer).toBe("workspace_overlay");
    expect(summary.latestReadEvent?.footprint.paths).toEqual(["app.ts"]);
    expect(summary.latestReadEvent?.attribution.actor.actorKind).toBe("agent");
    expect(summary.latestStageEvent).toBeNull();
  });

  it("records a deduplicated stage event for a full-file staged target", async () => {
    const graftDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-history-"));
    cleanups.push(graftDir);

    const store = new PersistedLocalHistoryStore({
      fs: nodeFs,
      codec: new CanonicalJsonCodec(),
      graftDir,
    });
    const harness = createGraphHarness(graftDir);

    const current = context({
      workspaceOverlayId: "overlay:one",
    });
    await store.noteBinding({ current, currentGraph: harness.graph });

    const attribution = {
      actor: {
        actorId: "agent:test",
        actorKind: "agent" as const,
        displayName: "Codex",
        source: "causal_attach.declaration",
        authorityScope: "declared" as const,
      },
      confidence: "high" as const,
      basis: "explicit_declaration" as const,
      evidence: [{
        evidenceId: "evidence_stage_1",
        evidenceKind: "explicit_agent_declaration" as const,
        source: "causal_attach.declaration",
        capturedAt: current.observedAt,
        strength: "direct" as const,
        details: { actorId: "agent:test" },
      }],
    };

    const stagedTarget = {
      availability: "full_file" as const,
      stability: "runtime_local" as const,
      provenanceLevel: "artifact_history" as const,
      attribution,
      target: {
        targetId: "target:one",
        targetKind: "staged_target" as const,
        repoId: current.repoId,
        worktreeId: current.worktreeId,
        checkoutEpochId: current.checkoutEpochId,
        workspaceOverlayId: "overlay:one",
        selectedAt: current.observedAt,
        selectionKind: "full_file" as const,
        selectionEntries: [{ path: "app.ts", symbols: [], regions: [] }],
        base: {
          headCommitSha: "abc123",
          indexTreeSha: null,
        },
      },
    };

    await store.noteStageObservation({ current, stagedTarget, attribution, graph: harness.graph });
    await store.noteStageObservation({ current, stagedTarget, attribution, graph: harness.graph });

    const summary = await store.summarize(
      harness.status({
        repoId: current.repoId,
        worktreeId: current.worktreeId,
      }),
      harness.causal(current),
      harness.graph,
    );

    expect(summary.availability).toBe("present");
    if (summary.availability !== "present") {
      return;
    }
    expect(summary.latestStageEvent?.eventKind).toBe("stage");
    expect(summary.latestStageEvent?.actorId).toBe("agent:test");
    expect(summary.latestStageEvent?.attribution.actor.actorKind).toBe("agent");
    expect(summary.latestStageEvent?.payload.targetId).toBe("target:one");

    expect(harness.warp.findNodes((props) =>
      props["entityKind"] === "local_history_event" &&
      props["eventKind"] === "stage"
    )).toHaveLength(1);
  });

  it("records a deduplicated semantic transition event as local artifact history", async () => {
    const graftDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-history-"));
    cleanups.push(graftDir);

    const store = new PersistedLocalHistoryStore({
      fs: nodeFs,
      codec: new CanonicalJsonCodec(),
      graftDir,
    });
    const harness = createGraphHarness(graftDir);

    const current = context({
      checkoutEpochId: "epoch:two",
      observedAt: "2026-04-10T01:10:00.000Z",
      transitionKind: "merge",
      transitionReflogSubject: "merge feature: Merge made by the ort strategy.",
    });
    await store.noteBinding({ current, currentGraph: harness.graph });

    const attribution = {
      actor: {
        actorId: "git:transition",
        actorKind: "git" as const,
        displayName: "Git transition",
        source: "persisted_local_history.checkout_transition",
        authorityScope: "inferred" as const,
      },
      confidence: "medium" as const,
      basis: "git_transition" as const,
      evidence: [{
        evidenceId: "evidence_transition_1",
        evidenceKind: "git_transition_observation" as const,
        source: "persisted_local_history.checkout_transition",
        capturedAt: current.observedAt,
        strength: "strong" as const,
        details: {
          transitionKind: "merge",
        },
      }],
    };

    const semanticTransition = {
      kind: "merge_phase" as const,
      authority: "repo_snapshot" as const,
      phase: "completed_or_cleared" as const,
      summary: "Merge transition completed or merge state has cleared.",
      evidence: {
        totalPaths: 0,
        stagedPaths: 0,
        changedPaths: 0,
        untrackedPaths: 0,
        unmergedPaths: 0,
        mergeInProgress: false,
        rebaseInProgress: false,
        rebaseStep: null,
        rebaseTotalSteps: null,
        lastTransitionKind: "merge" as const,
        reflogSubject: current.transitionReflogSubject,
      },
    };

    const transition = {
      kind: "merge" as const,
      fromRef: "feature",
      toRef: "main",
      fromCommit: "abc123",
      toCommit: "def456",
      evidence: {
        reflogSubject: current.transitionReflogSubject,
      },
    };

    await store.noteSemanticTransitionObservation({
      current,
      semanticTransition,
      transition,
      attribution,
      graph: harness.graph,
    });
    await store.noteSemanticTransitionObservation({
      current,
      semanticTransition,
      transition,
      attribution,
      graph: harness.graph,
    });

    const summary = await store.summarize(
      harness.status({
        repoId: current.repoId,
        worktreeId: current.worktreeId,
      }),
      harness.causal(current),
      harness.graph,
    );

    expect(summary.availability).toBe("present");
    if (summary.availability !== "present") {
      return;
    }
    expect(summary.latestTransitionEvent?.eventKind).toBe("transition");
    expect(summary.latestTransitionEvent?.payload.semanticKind).toBe("merge_phase");
    expect(summary.latestTransitionEvent?.payload.transitionKind).toBe("merge");
    expect(summary.latestTransitionEvent?.payload.phase).toBe("completed_or_cleared");
    expect(summary.latestTransitionEvent?.attribution.actor.actorKind).toBe("git");

    expect(harness.warp.findNodes((props) =>
      props["entityKind"] === "local_history_event" &&
      props["eventKind"] === "transition"
    )).toHaveLength(1);
  });

  it("summarizes shared repo posture when another worktree is active on the same checkout", async () => {
    const graftDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-history-"));
    cleanups.push(graftDir);

    const store = new PersistedLocalHistoryStore({
      fs: nodeFs,
      codec: new CanonicalJsonCodec(),
      graftDir,
    });
    const harness = createGraphHarness(graftDir);

    const first = context();
    const second = context({
      worktreeId: "worktree:two",
      transportSessionId: "transport:two",
      workspaceSliceId: "slice-0002",
      causalSessionId: "causal:two",
      strandId: "strand:two",
      observedAt: "2026-04-10T01:15:00.000Z",
    });

    await store.noteBinding({ current: first, currentGraph: harness.graph });
    await store.noteBinding({ current: second, currentGraph: harness.graph });

    const summary = await store.summarizeRepoConcurrency(
      harness.status({
        repoId: first.repoId,
        worktreeId: first.worktreeId,
        worktreeRoot: "/repo-one",
        gitCommonDir: "/repo/.git",
      }),
      harness.graph,
    );

    expect(summary).toEqual(expect.objectContaining({
      posture: "shared_repo_only",
      authority: "repo_identity_only",
      observedWorktreeCount: 2,
      observedCausalSessionCount: 2,
    }));
  });

  it("summarizes overlapping actors when the same worktree records overlapping path activity without handoff", async () => {
    const graftDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-history-"));
    cleanups.push(graftDir);

    const store = new PersistedLocalHistoryStore({
      fs: nodeFs,
      codec: new CanonicalJsonCodec(),
      graftDir,
    });
    const harness = createGraphHarness(graftDir);

    const first = context({
      workspaceOverlayId: "overlay:one",
    });
    await store.noteBinding({ current: first, currentGraph: harness.graph });
    const firstSummary = await store.summarize(
      harness.status({
        repoId: first.repoId,
        worktreeId: first.worktreeId,
      }),
      harness.causal(first),
      harness.graph,
    );
    if (firstSummary.availability !== "present") {
      return;
    }
    await store.noteReadObservation({
      current: first,
      attribution: firstSummary.attribution,
      surface: "safe_read",
      projection: "content",
      sourceLayer: "canonical_structural_truth",
      reason: "CONTENT",
      footprint: {
        paths: ["app.ts"],
        symbols: [],
        regions: [],
      },
      graph: harness.graph,
    });

    const second = context({
      transportSessionId: "transport:two",
      workspaceSliceId: "slice-0002",
      causalSessionId: "causal:two",
      strandId: "strand:two",
      observedAt: "2026-04-10T01:20:00.000Z",
      workspaceOverlayId: "overlay:one",
      warpWriterId: "graft_session_two",
    });
    await store.noteBinding({ current: second, currentGraph: harness.graph });
    const secondSummary = await store.summarize(
      harness.status({
        repoId: second.repoId,
        worktreeId: second.worktreeId,
      }),
      harness.causal(second),
      harness.graph,
    );
    if (secondSummary.availability !== "present") {
      return;
    }
    await store.noteReadObservation({
      current: second,
      attribution: secondSummary.attribution,
      surface: "safe_read",
      projection: "content",
      sourceLayer: "canonical_structural_truth",
      reason: "CONTENT",
      footprint: {
        paths: ["app.ts"],
        symbols: [],
        regions: [],
      },
      graph: harness.graph,
    });

    const concurrency = await store.summarizeRepoConcurrency(
      harness.status({
        repoId: second.repoId,
        worktreeId: second.worktreeId,
      }),
      harness.graph,
    );

    expect(concurrency).toEqual(expect.objectContaining({
      posture: "overlapping_actors",
      authority: "footprint_overlap",
      observedWorktreeCount: 1,
      observedCausalSessionCount: 2,
      overlappingPathCount: 1,
    }));
  });

  it("refuses explicit attach when no prior lineage exists", async () => {
    const graftDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-history-"));
    cleanups.push(graftDir);

    const store = new PersistedLocalHistoryStore({
      fs: nodeFs,
      codec: new CanonicalJsonCodec(),
      graftDir,
    });
    const harness = createGraphHarness(graftDir);

    await store.noteBinding({ current: context(), currentGraph: harness.graph });

    await expect(store.declareAttach({
      current: context(),
      declaration: {
        actorKind: "agent",
      },
      graph: harness.graph,
    })).rejects.toBeInstanceOf(PersistedLocalHistoryAttachUnavailableError);
  });
});
