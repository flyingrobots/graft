import { describe, expect, it } from "vitest";
import { buildLocalHistoryDagModelFromObservedGraph } from "../../../src/cli/local-history-dag-model.js";

describe("local history dag model", () => {
  it("falls back to the sole graph worktree identity when path aliases drift", () => {
    const model = buildLocalHistoryDagModelFromObservedGraph({
      cwd: "/tmp/example",
      repoId: "repo:1",
      resolvedWorktreeId: "worktree:resolved",
      requestedEventLimit: 12,
      observedNodes: [
        {
          id: "repo:1",
          props: {
            entityKind: "repo",
            repoId: "repo:1",
          },
        },
        {
          id: "worktree:graph",
          props: {
            entityKind: "worktree",
            repoId: "repo:1",
            worktreeId: "worktree:graph",
          },
        },
        {
          id: "lh:event:history:1",
          props: {
            entityKind: "local_history_event",
            eventKind: "continuity",
            repoId: "repo:1",
            worktreeId: "worktree:graph",
            occurredAt: "2026-04-13T20:00:00.000Z",
          },
        },
        {
          id: "lh:event:event:2",
          props: {
            entityKind: "local_history_event",
            eventKind: "read",
            repoId: "repo:1",
            worktreeId: "worktree:graph",
            occurredAt: "2026-04-13T20:00:01.000Z",
            surface: "safe_read",
            projection: "content",
          },
        },
      ],
      observedEdges: [
        {
          from: "lh:event:event:2",
          to: "lh:event:history:1",
          label: "follows",
        },
        {
          from: "repo:1",
          to: "worktree:graph",
          label: "has_worktree",
        },
      ],
    });

    expect(model.worktreeId).toBe("worktree:graph");
    expect(model.totalEventCount).toBe(2);
    expect(model.nodes.filter((node) => node.entityKind === "local_history_event")).toHaveLength(2);
  });

  it("drops invalid observed node properties instead of treating them as valid graph facts", () => {
    const model = buildLocalHistoryDagModelFromObservedGraph({
      cwd: "/tmp/example",
      repoId: "repo:1",
      resolvedWorktreeId: "worktree:1",
      requestedEventLimit: 12,
      observedNodes: [
        {
          id: "repo:1",
          props: {
            entityKind: "repo",
            repoId: "repo:1",
          },
        },
        {
          id: "worktree:1",
          props: {
            entityKind: "worktree",
            repoId: "repo:1",
            worktreeId: "worktree:1",
          },
        },
        {
          id: "lh:event:bad",
          props: {
            entityKind: 42,
            repoId: "repo:1",
            worktreeId: "worktree:1",
          },
        },
        {
          id: "lh:event:good",
          props: {
            entityKind: "local_history_event",
            eventKind: "continuity",
            repoId: "repo:1",
            worktreeId: "worktree:1",
            occurredAt: "2026-04-13T20:00:00.000Z",
          },
        },
      ],
      observedEdges: [],
    });

    expect(model.totalEventCount).toBe(1);
    expect(model.nodes.some((node) => node.id === "lh:event:bad")).toBe(false);
    expect(model.nodes.some((node) => node.id === "lh:event:good")).toBe(true);
  });

  it("renders fallback actor nodes as actor:unknown instead of unknown:unknown", () => {
    const model = buildLocalHistoryDagModelFromObservedGraph({
      cwd: "/tmp/example",
      repoId: "repo:1",
      resolvedWorktreeId: "worktree:1",
      requestedEventLimit: 12,
      observedNodes: [
        {
          id: "repo:1",
          props: {
            entityKind: "repo",
            repoId: "repo:1",
          },
        },
        {
          id: "worktree:1",
          props: {
            entityKind: "worktree",
            repoId: "repo:1",
            worktreeId: "worktree:1",
          },
        },
        {
          id: "lh:actor:unknown",
          props: {
            entityKind: "actor",
            actorId: "unknown",
            actorKind: "unknown",
          },
        },
        {
          id: "lh:event:history:1",
          props: {
            entityKind: "local_history_event",
            eventKind: "continuity",
            continuityOperation: "start",
            repoId: "repo:1",
            worktreeId: "worktree:1",
            occurredAt: "2026-04-13T20:00:00.000Z",
          },
        },
      ],
      observedEdges: [
        {
          from: "lh:event:history:1",
          to: "lh:actor:unknown",
          label: "attributed_to",
        },
      ],
    });

    expect(model.nodes.find((node) => node.id === "lh:actor:unknown")?.label).toBe("actor:unknown");
  });
});
