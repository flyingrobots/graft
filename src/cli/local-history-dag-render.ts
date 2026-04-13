import { dag, type DagNode } from "@flyingrobots/bijou";
import { initDefaultContext } from "@flyingrobots/bijou-node";
import type { TokenValue } from "@flyingrobots/bijou";
import type { LocalHistoryDagModel, LocalHistoryDagNode } from "./local-history-dag-model.js";

function compareByTimeThenId(
  left: { readonly occurredAt?: string | undefined; readonly id: string },
  right: { readonly occurredAt?: string | undefined; readonly id: string },
): number {
  const leftTime = left.occurredAt ?? "";
  const rightTime = right.occurredAt ?? "";
  const byTime = leftTime.localeCompare(rightTime);
  if (byTime !== 0) {
    return byTime;
  }
  return left.id.localeCompare(right.id);
}

function eventPath(model: LocalHistoryDagModel): string[] {
  return model.nodes
    .filter((node) => node.entityKind === "local_history_event")
    .sort(compareByTimeThenId)
    .map((node) => node.id);
}

function tokenForNode(node: LocalHistoryDagNode): TokenValue | undefined {
  if (node.entityKind === "local_history_event") {
    if (node.eventKind === "continuity") {
      return { hex: "#22c55e" };
    }
    if (node.eventKind === "read") {
      return { hex: "#3b82f6" };
    }
    if (node.eventKind === "stage") {
      return { hex: "#f59e0b" };
    }
    if (node.eventKind === "transition") {
      return { hex: "#ef4444" };
    }
    return { hex: "#0ea5e9" };
  }

  if (node.entityKind === "repo" || node.entityKind === "worktree") {
    return { hex: "#14b8a6" };
  }
  if (node.entityKind === "causal_session" || node.entityKind === "strand" || node.entityKind === "workspace_slice") {
    return { hex: "#06b6d4" };
  }
  if (node.entityKind === "checkout_epoch") {
    return { hex: "#84cc16" };
  }
  if (node.entityKind === "causal_footprint" || node.entityKind === "staged_target") {
    return { hex: "#f59e0b" };
  }
  if (node.entityKind === "evidence" || node.entityKind === "actor" || node.entityKind === "causal_region") {
    return { hex: "#94a3b8" };
  }

  return undefined;
}

function badgeForNode(node: LocalHistoryDagNode): string | undefined {
  if (node.entityKind === "local_history_event") {
    return node.eventKind?.toUpperCase();
  }
  if (node.entityKind === "repo") return "REPO";
  if (node.entityKind === "worktree") return "WT";
  if (node.entityKind === "causal_session") return "SESSION";
  if (node.entityKind === "strand") return "STRAND";
  if (node.entityKind === "workspace_slice") return "SLICE";
  if (node.entityKind === "checkout_epoch") return "EPOCH";
  if (node.entityKind === "causal_footprint") return "FOOTPRINT";
  if (node.entityKind === "evidence") return "EVID";
  return undefined;
}

function toBijouDagNodes(model: LocalHistoryDagModel): DagNode[] {
  const outgoingEdges = new Map<string, string[]>();
  for (const edge of model.edges) {
    const bucket = outgoingEdges.get(edge.from) ?? [];
    bucket.push(edge.to);
    outgoingEdges.set(edge.from, bucket);
  }

  return model.nodes.map((node) => {
    const dagNode: DagNode = {
      id: node.id,
      label: node.label,
    };
    const edges = outgoingEdges.get(node.id);
    if (edges !== undefined) {
      dagNode.edges = edges;
    }
    const badge = badgeForNode(node);
    if (badge !== undefined) {
      dagNode.badge = badge;
    }
    const token = tokenForNode(node);
    if (token !== undefined) {
      dagNode.token = token;
    }
    return dagNode;
  });
}

export function renderLocalHistoryDag(model: LocalHistoryDagModel): string {
  if (model.shownEventCount === 0) {
    return [
      "Local History DAG",
      `repo: ${model.repoId}`,
      `worktree: ${model.worktreeId}`,
      "",
      "No local history event nodes found in the WARP graph.",
    ].join("\n");
  }

  const ctx = initDefaultContext();
  const header = [
    "Local History DAG",
    `repo: ${model.repoId}`,
    `worktree: ${model.worktreeId}`,
    `events: ${String(model.shownEventCount)}/${String(model.totalEventCount)} (limit ${String(model.requestedEventLimit)})`,
    `nodes: ${String(model.nodeCount)}`,
    `edges: ${String(model.edgeCount)}`,
  ].join("\n");
  const graph = dag(toBijouDagNodes(model), {
    ctx,
    highlightPath: eventPath(model),
    highlightToken: { hex: "#f97316" },
  });

  return `${header}\n\n${graph}`.trimEnd();
}
