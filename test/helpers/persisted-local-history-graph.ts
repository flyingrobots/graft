import type { PersistedLocalHistoryContext } from "../../src/mcp/persisted-local-history.js";
import type {
  PersistedLocalHistoryGraphContext,
  PersistedLocalHistoryGraphWarp,
} from "../../src/mcp/persisted-local-history-graph.js";

export class FakePersistedLocalHistoryWarp implements PersistedLocalHistoryGraphWarp {
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
    const patterns: string[] = [];
    const match = lens.match;
    if (typeof match === "string") {
      patterns.push(match);
    } else {
      for (const pattern of match) {
        patterns.push(pattern);
      }
    }
    const matchingNodeIds = [...this.nodes.keys()].filter((nodeId) =>
      patterns.some((pattern) => pattern.endsWith("*")
        ? nodeId.startsWith(pattern.slice(0, -1))
        : nodeId === pattern)
    );
    const matchingNodeIdSet = new Set(matchingNodeIds);

    return Promise.resolve({
      getNodes: () => Promise.resolve(matchingNodeIds),
      getNodeProps: (nodeId: string) => Promise.resolve(this.nodes.get(nodeId) ?? null),
      getEdges: () => Promise.resolve(
        [...this.edges.values()].filter((edge) =>
          matchingNodeIdSet.has(edge.from) && matchingNodeIdSet.has(edge.to)
        ),
      ),
    });
  }

  async patch(build: (patch: {
    addNode(id: string): unknown;
    setProperty(id: string, key: string, value: unknown): unknown;
    addEdge(from: string, to: string, label: string): unknown;
    removeNode(id: string): unknown;
    removeEdge(from: string, to: string, label: string): unknown;
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
      removeNode: (id: string) => {
        this.nodes.delete(id);
        return patch;
      },
      removeEdge: (from: string, to: string, label: string) => {
        this.edges.delete(`${from}\u0000${label}\u0000${to}`);
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

  findNodes(predicate: (props: Record<string, unknown>) => boolean): [string, Record<string, unknown>][] {
    return [...this.nodes.entries()].filter((entry) => predicate(entry[1]));
  }
}

export function persistedLocalHistoryGraphContext(
  warp: PersistedLocalHistoryGraphWarp,
  worktreeRoot = "/repo",
): PersistedLocalHistoryGraphContext {
  return {
    warp,
    worktreeRoot,
  };
}

export function persistedLocalHistoryWorkspaceStatus(
  graftDir: string,
  overrides: Partial<{
    sessionMode: "repo_local" | "daemon";
    bindState: "bound" | "unbound";
    repoId: string;
    worktreeId: string;
    worktreeRoot: string;
    gitCommonDir: string;
  }> = {},
) {
  return {
    sessionMode: overrides.sessionMode ?? "repo_local",
    bindState: overrides.bindState ?? "bound",
    repoId: overrides.repoId ?? "repo:one",
    worktreeId: overrides.worktreeId ?? "worktree:one",
    worktreeRoot: overrides.worktreeRoot ?? "/repo",
    gitCommonDir: overrides.gitCommonDir ?? "/repo/.git",
    graftDir,
    capabilityProfile: null,
  } as const;
}

export function persistedLocalHistoryCausalContext(current: PersistedLocalHistoryContext) {
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
