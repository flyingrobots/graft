import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { createIsolatedServer, fixturePath, parse } from "../../helpers/mcp.js";
import { cleanupTestRepo, createTestRepo, git } from "../../helpers/git.js";

interface RuntimeEvent {
  readonly event: string;
  readonly sessionId: string;
  readonly traceId?: string;
  readonly seq?: number;
  readonly tool?: string;
  readonly projection?: string;
  readonly reason?: string;
  readonly burdenKind?: string;
  readonly nonReadBurden?: boolean;
  readonly latencyMs?: number;
  readonly argKeys?: readonly string[];
  readonly errorKind?: string;
  readonly errorName?: string;
  readonly logPath?: string;
  readonly logPolicy?: string;
}

function readRuntimeLog(logPath: string): RuntimeEvent[] {
  return fs.readFileSync(logPath, "utf-8")
    .trim()
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as RuntimeEvent);
}

describe("mcp: runtime observability", () => {
  it("writes correlated start and completion events for tool calls", async () => {
    const isolated = createIsolatedServer();
    try {
      const result = parse(await isolated.server.callTool("safe_read", {
        path: fixturePath("small.ts"),
      }));
      const receipt = result["_receipt"] as {
        sessionId: string;
        traceId: string;
        seq: number;
        projection: string;
        reason: string;
      };
      const doctor = parse(await isolated.server.callTool("doctor", {}));
      const runtime = doctor["runtimeObservability"] as { logPath: string };
      const latestReadEvent = doctor["latestReadEvent"] as {
        eventKind: string;
        attribution: { actor: { actorKind: string } };
        payload: { surface: string; projection: string; sourceLayer: string };
        footprint: { paths: string[] };
      } | null;
      const events = readRuntimeLog(runtime.logPath);

      expect(events[0]?.event).toBe("session_started");
      expect(events[0]?.sessionId).toBe(receipt.sessionId);

      const started = events.find((event) => event.event === "tool_call_started" && event.traceId === receipt.traceId);
      expect(started).toBeDefined();
      expect(started?.tool).toBe("safe_read");
      expect(started?.argKeys).toEqual(["path"]);

      const completed = events.find((event) => event.event === "tool_call_completed" && event.traceId === receipt.traceId);
      expect(completed).toBeDefined();
      expect(completed?.sessionId).toBe(receipt.sessionId);
      expect(completed?.seq).toBe(receipt.seq);
      expect(completed?.projection).toBe(receipt.projection);
      expect(completed?.reason).toBe(receipt.reason);
      expect(completed?.burdenKind).toBe("read");
      expect(completed?.nonReadBurden).toBe(false);
      expect(completed?.latencyMs).toBeGreaterThanOrEqual(0);
      expect(latestReadEvent?.eventKind).toBe("read");
      expect(latestReadEvent?.attribution.actor.actorKind).toBe("unknown");
      expect(latestReadEvent?.payload.surface).toBe("safe_read");
      expect(latestReadEvent?.payload.projection).toBe("content");
      expect(latestReadEvent?.payload.sourceLayer).toBe("canonical_structural_truth");
      expect(latestReadEvent?.footprint.paths).toEqual([fixturePath("small.ts")]);
    } finally {
      isolated.cleanup();
    }
  });

  it("writes metadata-only failure events for schema validation errors", async () => {
    const isolated = createIsolatedServer();
    try {
      await expect(
        isolated.server.callTool("safe_read", {
          path: fixturePath("small.ts"),
          bogus_key: "should be rejected",
        }),
      ).rejects.toThrow();

      const logPath = path.join(isolated.graftDir, "logs", "mcp-runtime.ndjson");
      const events = readRuntimeLog(logPath);
      const failure = events.find((event) => event.event === "tool_call_failed");
      expect(failure).toBeDefined();
      expect(failure?.tool).toBe("safe_read");
      expect(failure?.errorKind).toBe("validation_error");
      expect(failure?.errorName).toBe("ZodError");
      expect(failure?.argKeys).toEqual(["bogus_key", "path"]);
    } finally {
      isolated.cleanup();
    }
  });

  it("exposes runtime observability status in doctor", async () => {
    const isolated = createIsolatedServer();
    try {
      const doctor = parse(await isolated.server.callTool("doctor", {}));
      const runtime = doctor["runtimeObservability"] as {
        enabled: boolean;
        logPath: string;
        maxBytes: number;
        logPolicy: string;
      };
      const causal = doctor["causalContext"] as {
        transportSessionId: string;
        workspaceSliceId: string;
        causalSessionId: string;
        strandId: string;
        checkoutEpochId: string;
        warpWriterId: string;
        stability: string;
        provenanceLevel: string;
      };
      const stagedTarget = doctor["stagedTarget"] as {
        availability: string;
        stability: string;
        provenanceLevel: string;
        attribution?: {
          actor: { actorKind: string };
          confidence: string;
        };
      };
      const workspaceOverlayFooting = doctor["workspaceOverlayFooting"] as {
        observationMode: string;
        degraded: boolean;
        degradedReason: string;
        checkoutEpoch: number;
        lastTransition: unknown;
        workspaceOverlayId: string | null;
        workspaceOverlay: unknown;
        hookBootstrap: {
          posture: string;
          configuredCoreHooksPath: string | null;
          resolvedHooksPath: string;
          missingHooks: string[];
          supportsCheckoutBoundaries: boolean;
        };
      };
      const latestReadEvent = doctor["latestReadEvent"] as {
        eventKind: string;
        attribution: { actor: { actorKind: string }; confidence: string };
        payload: { surface: string; projection: string; sourceLayer: string };
        footprint: { paths: string[] };
      } | null;
      const persistedLocalHistory = doctor["persistedLocalHistory"] as {
        availability: string;
        persistence: string;
        totalContinuityRecords: number;
        lastOperation: string | null;
        continuityConfidence: string;
        continuityEvidence: { evidenceKind: string }[];
        attribution: { actor: { actorKind: string }; confidence: string };
        latestReadEvent: {
          eventKind: string;
          attribution: { actor: { actorKind: string }; confidence: string };
          payload: { surface: string; projection: string; sourceLayer: string };
          footprint: { paths: string[] };
        } | null;
        latestStageEvent: null;
        nextAction: string;
      };
      const attribution = doctor["attribution"] as {
        actor: { actorKind: string };
        confidence: string;
      };
      expect(runtime.enabled).toBe(true);
      expect(runtime.logPath).toBe(path.join(isolated.graftDir, "logs", "mcp-runtime.ndjson"));
      expect(runtime.maxBytes).toBeGreaterThan(0);
      expect(runtime.logPolicy).toBe("metadata_only");
      expect(causal.transportSessionId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      expect(causal.workspaceSliceId).toMatch(/^slice-\d{4}$/);
      expect(causal.causalSessionId).toMatch(/^causal:[a-f0-9]{16}$/);
      expect(causal.strandId).toMatch(/^strand:[a-f0-9]{16}$/);
      expect(causal.checkoutEpochId).toMatch(/^epoch:[a-f0-9]{16}$/);
      expect(causal.warpWriterId).toBe("graft");
      expect(causal.stability).toBe("runtime_local");
      expect(causal.provenanceLevel).toBe("artifact_history");
      expect(workspaceOverlayFooting.observationMode).toBe("inferred_between_tool_calls");
      expect(workspaceOverlayFooting.degraded).toBe(true);
      expect(workspaceOverlayFooting.degradedReason).toBe("target_repo_hooks_absent");
      expect(workspaceOverlayFooting.workspaceOverlayId).toBeNull();
      expect(workspaceOverlayFooting.workspaceOverlay).toBeNull();
      expect(workspaceOverlayFooting.hookBootstrap.posture).toBe("absent");
      expect(workspaceOverlayFooting.hookBootstrap.configuredCoreHooksPath).toBeNull();
      expect(workspaceOverlayFooting.hookBootstrap.resolvedHooksPath).toBe(
        path.join(isolated.projectRoot, "hooks"),
      );
      expect(workspaceOverlayFooting.hookBootstrap.missingHooks).toEqual([
        "post-checkout",
        "post-merge",
        "post-rewrite",
      ]);
      expect(workspaceOverlayFooting.hookBootstrap.supportsCheckoutBoundaries).toBe(false);
      expect(latestReadEvent).toBeNull();
      expect(doctor["workspaceOverlayId"]).toBeNull();
      expect(stagedTarget).toEqual({
        availability: "none",
        stability: "runtime_local",
        provenanceLevel: "artifact_history",
      });
      expect(persistedLocalHistory.availability).toBe("present");
      expect(persistedLocalHistory.persistence).toBe("persisted_local_history");
      expect(persistedLocalHistory.totalContinuityRecords).toBe(1);
      expect(persistedLocalHistory.lastOperation).toBe("start");
      expect(persistedLocalHistory.continuityConfidence).toBe("high");
      expect(
        persistedLocalHistory.continuityEvidence.map((evidence) => evidence.evidenceKind),
      ).toContain("mcp_transport_binding");
      expect(persistedLocalHistory.attribution.actor.actorKind).toBe("unknown");
      expect(persistedLocalHistory.attribution.confidence).toBe("unknown");
      expect(persistedLocalHistory.latestReadEvent).toBeNull();
      expect(persistedLocalHistory.latestStageEvent).toBeNull();
      expect(attribution.actor.actorKind).toBe("unknown");
      expect(persistedLocalHistory.nextAction).toBe("continue_active_causal_workspace");
    } finally {
      isolated.cleanup();
    }
  });

  it("surfaces a full-file runtime staged target for staged rename selections", async () => {
    const repoDir = createTestRepo("graft-runtime-staged-target-rename-");
    try {
      fs.writeFileSync(path.join(repoDir, "app.ts"), "export const ready = true;\n");
      git(repoDir, "add -A");
      git(repoDir, "commit -m init");

      git(repoDir, "mv app.ts renamed.ts");

      const isolated = createIsolatedServer({
        projectRoot: repoDir,
        graftDir: path.join(repoDir, ".graft"),
      });
      try {
        const doctor = parse(await isolated.server.callTool("doctor", {}));
        const stagedTarget = doctor["stagedTarget"] as {
          availability: string;
          reason?: string;
          ambiguousPaths?: string[];
          attribution?: {
            actor: { actorKind: string };
            confidence: string;
          };
          target?: {
            selectionKind?: string;
            selectionEntries?: { path: string }[];
            workspaceOverlayId?: string;
            targetId?: string;
          };
        };
        const workspaceOverlayFooting = doctor["workspaceOverlayFooting"] as {
          observationMode: string;
          degraded: boolean;
          degradedReason: string;
          workspaceOverlayId: string | null;
          workspaceOverlay: { stagedPaths: number; changedPaths: number } | null;
          hookBootstrap: { posture: string; supportsCheckoutBoundaries: boolean };
        };
        const persistedLocalHistory = doctor["persistedLocalHistory"] as {
          latestStageEvent: {
            eventKind: string;
            actorId: string | null;
            attribution: { actor: { actorKind: string }; confidence: string };
            payload: { targetId: string; selectionKind: string };
          } | null;
        };

        expect(doctor["workspaceOverlayId"]).toMatch(/^overlay:[a-f0-9]{16}$/);
        expect(workspaceOverlayFooting.observationMode).toBe("inferred_between_tool_calls");
        expect(workspaceOverlayFooting.degraded).toBe(true);
        expect(workspaceOverlayFooting.degradedReason).toBe("target_repo_hooks_absent");
        expect(workspaceOverlayFooting.workspaceOverlayId).toBe(doctor["workspaceOverlayId"]);
        expect(
          (workspaceOverlayFooting.workspaceOverlay?.stagedPaths ?? 0)
            + (workspaceOverlayFooting.workspaceOverlay?.changedPaths ?? 0),
        ).toBeGreaterThan(0);
        expect(workspaceOverlayFooting.hookBootstrap.posture).toBe("absent");
        expect(workspaceOverlayFooting.hookBootstrap.supportsCheckoutBoundaries).toBe(false);
        expect(["full_file", "ambiguous"]).toContain(stagedTarget.availability);
        expect(stagedTarget.attribution?.actor.actorKind).toBe("unknown");
        expect(stagedTarget.attribution?.confidence).toBe("unknown");
        if (stagedTarget.availability === "full_file") {
          expect(stagedTarget.target?.selectionKind).toBe("full_file");
          expect(stagedTarget.target?.selectionEntries).toEqual([
            { path: "renamed.ts", symbols: [], regions: [] },
          ]);
          expect(stagedTarget.target?.workspaceOverlayId).toBe(doctor["workspaceOverlayId"]);
        } else {
          expect(stagedTarget.reason).toBe("modified_path_selection_requires_deeper_evidence");
          expect(stagedTarget.ambiguousPaths).toEqual(expect.arrayContaining([expect.any(String)]));
        }
        expect(persistedLocalHistory.latestStageEvent?.eventKind).toBe("stage");
        expect(persistedLocalHistory.latestStageEvent?.actorId).toBe("unknown");
        expect(persistedLocalHistory.latestStageEvent?.attribution.actor.actorKind).toBe("unknown");
        expect(persistedLocalHistory.latestStageEvent?.payload.selectionKind).toBe("full_file");
        if (stagedTarget.availability === "full_file") {
          expect(persistedLocalHistory.latestStageEvent?.payload.targetId).toBe(
            stagedTarget.target?.targetId,
          );
        }
      } finally {
        isolated.cleanup();
      }
    } finally {
      cleanupTestRepo(repoDir);
    }
  });

  it("forks persisted local history when checkout footing changes", async () => {
    const repoDir = createTestRepo("graft-runtime-history-checkout-");
    try {
      fs.writeFileSync(path.join(repoDir, "app.ts"), "export const ready = true;\n");
      git(repoDir, "add -A");
      git(repoDir, "commit -m init");

      const isolated = createIsolatedServer({
        projectRoot: repoDir,
        graftDir: path.join(repoDir, ".graft"),
      });
      try {
        const first = parse(await isolated.server.callTool("doctor", {}));
        const firstHistory = first["persistedLocalHistory"] as {
          availability: string;
          totalContinuityRecords: number;
          lastOperation: string | null;
        };
        const firstCausal = first["causalContext"] as {
          strandId: string;
          checkoutEpochId: string;
        };

        git(repoDir, "checkout -b feature/history");

        const second = parse(await isolated.server.callTool("doctor", {}));
        const secondHistory = second["persistedLocalHistory"] as {
          availability: string;
          active: boolean;
          totalContinuityRecords: number;
          lastOperation: string | null;
          continuityConfidence: string;
          continuityEvidence: { evidenceKind: string; details: { previousCheckoutEpochId?: string | null } }[];
          attribution: {
            actor: { actorKind: string };
            confidence: string;
            evidence: { evidenceKind: string }[];
          };
          nextAction: string;
        };
        const secondAttribution = second["attribution"] as {
          actor: { actorKind: string };
          confidence: string;
        };
        const secondCausal = second["causalContext"] as {
          strandId: string;
          checkoutEpochId: string;
        };

        expect(firstHistory.availability).toBe("present");
        expect(firstHistory.totalContinuityRecords).toBe(1);
        expect(firstHistory.lastOperation).toBe("start");

        expect(secondHistory.availability).toBe("present");
        expect(secondHistory.active).toBe(true);
        expect(secondHistory.totalContinuityRecords).toBe(3);
        expect(secondHistory.lastOperation).toBe("fork");
        expect(secondHistory.continuityConfidence).toBe("medium");
        expect(secondHistory.continuityEvidence).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              evidenceKind: "worktree_fs_observation",
              details: expect.objectContaining({
                previousCheckoutEpochId: firstCausal.checkoutEpochId,
              }),
            }),
          ]),
        );
        expect(secondHistory.attribution.actor.actorKind).toBe("git");
        expect(secondHistory.attribution.confidence).toBe("medium");
        expect(secondHistory.attribution.evidence).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ evidenceKind: "git_transition_observation" }),
          ]),
        );
        expect(secondAttribution.actor.actorKind).toBe("git");
        expect(secondHistory.nextAction).toBe("continue_active_causal_workspace");
        expect(secondCausal.checkoutEpochId).not.toBe(firstCausal.checkoutEpochId);
        expect(secondCausal.strandId).not.toBe(firstCausal.strandId);
      } finally {
        isolated.cleanup();
      }
    } finally {
      cleanupTestRepo(repoDir);
    }
  });

  it("keeps internal graft logs out of workspace overlay and clean-head checks", async () => {
    const repoDir = createTestRepo("graft-runtime-ignore-");
    try {
      fs.writeFileSync(path.join(repoDir, "app.ts"), "export const ready = true;\n");
      git(repoDir, "add -A");
      git(repoDir, "commit -m init");

      const isolated = createIsolatedServer({
        projectRoot: repoDir,
        graftDir: path.join(repoDir, ".graft"),
      });
      try {
        const safeRead = parse(await isolated.server.callTool("safe_read", { path: "app.ts" }));
        expect(safeRead["projection"]).toBe("content");

        const doctor = parse(await isolated.server.callTool("doctor", {}));
        expect(doctor["workspaceOverlay"]).toBeNull();

        const excludePath = path.join(repoDir, ".git", "info", "exclude");
        const exclude = fs.readFileSync(excludePath, "utf-8");
        expect(exclude).toContain(".graft/");
      } finally {
        isolated.cleanup();
      }
    } finally {
      cleanupTestRepo(repoDir);
    }
  });
});
