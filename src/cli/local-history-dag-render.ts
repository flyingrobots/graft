import type { LocalHistoryDagEdge, LocalHistoryDagModel } from "./local-history-dag-model.js";

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

function buildOutgoingIndex(edges: readonly LocalHistoryDagEdge[]): ReadonlyMap<string, readonly LocalHistoryDagEdge[]> {
  const outgoing = new Map<string, LocalHistoryDagEdge[]>();
  for (const edge of edges) {
    const bucket = outgoing.get(edge.from) ?? [];
    bucket.push(edge);
    outgoing.set(edge.from, bucket);
  }
  return outgoing;
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

  const nodeById = new Map(model.nodes.map((node) => [node.id, node] as const));
  const outgoing = buildOutgoingIndex(model.edges);
  const eventNodes = model.nodes
    .filter((node) => node.entityKind === "local_history_event")
    .sort(compareByTimeThenId);
  const lines = [
    "Local History DAG",
    `repo: ${model.repoId}`,
    `worktree: ${model.worktreeId}`,
    `events: ${String(model.shownEventCount)}/${String(model.totalEventCount)} (limit ${String(model.requestedEventLimit)})`,
    `nodes: ${String(model.nodeCount)}`,
    `edges: ${String(model.edgeCount)}`,
    "",
  ];

  for (const [index, node] of eventNodes.entries()) {
    lines.push(`[${String(index + 1)}] ${node.label}`);
    lines.push(`    id: ${node.id}`);
    const nodeEdges = [...(outgoing.get(node.id) ?? [])].sort((left, right) => {
      const byLabel = left.label.localeCompare(right.label);
      if (byLabel !== 0) {
        return byLabel;
      }
      return left.to.localeCompare(right.to);
    });

    if (nodeEdges.length === 0) {
      lines.push("    (no outgoing edges in bounded view)");
      lines.push("");
      continue;
    }

    for (const [edgeIndex, edge] of nodeEdges.entries()) {
      const target = nodeById.get(edge.to);
      const connector = edgeIndex === nodeEdges.length - 1 ? "└─" : "├─";
      lines.push(`    ${connector} ${edge.label} -> ${target?.label ?? edge.to}`);
    }
    lines.push("");
  }

  const supportNodes = model.nodes
    .filter((node) => node.entityKind !== "local_history_event")
    .sort((left, right) => left.label.localeCompare(right.label));
  if (supportNodes.length > 0) {
    lines.push("Support nodes:");
    for (const node of supportNodes) {
      lines.push(`  - ${node.label}`);
    }
  }

  return lines.join("\n").trimEnd();
}
