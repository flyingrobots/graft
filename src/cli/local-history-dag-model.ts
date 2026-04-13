import { z } from "zod";
import { nodeGit } from "../adapters/node-git.js";
import { resolveWorkspaceRequest } from "../mcp/workspace-router.js";
import { openWarp } from "../warp/open.js";

export const DEFAULT_LOCAL_HISTORY_DAG_LIMIT = 12;

const LOCAL_HISTORY_OBSERVER_MATCH = ["lh:*", "repo:*", "worktree:*", "file:*", "sym:*"] as const;
const LOCAL_HISTORY_OBSERVER_EXPOSE = [
  "actorId",
  "actorKind",
  "authority",
  "causalSessionId",
  "checkoutEpochId",
  "continuityOperation",
  "entityKind",
  "eventId",
  "eventKind",
  "name",
  "occurredAt",
  "openedAt",
  "path",
  "phase",
  "projection",
  "reason",
  "repoId",
  "selectionKind",
  "semanticKind",
  "source",
  "sourceLayer",
  "startedAt",
  "strandId",
  "summary",
  "surface",
  "symbols",
  "targetId",
  "transportSessionId",
  "worktreeId",
  "workspaceOverlayId",
  "workspaceSliceId",
  "paths",
] as const;
const optionalString = z.string().nullish().transform((value) => value ?? undefined);
const optionalStringArray = z.array(z.string()).nullish().transform((value) => value ?? undefined);
const LOCAL_EDGE_LABELS = new Set([
  "follows",
  "continues_from",
  "creates_strand",
  "parks_strand",
  "in_session",
  "in_strand",
  "in_worktree",
  "in_checkout_epoch",
  "in_workspace_slice",
  "attributed_to",
  "has_footprint",
  "captures_target",
  "creates_epoch",
  "has_worktree",
  "entered_epoch",
  "has_causal_session",
  "owns_strand",
  "has_workspace_slice",
  "bound_to",
  "opened_at_epoch",
  "anchored_to",
  "selected_from",
  "supported_by",
  "has_region",
  "references_file",
  "touches_file",
  "targets_file",
  "targets_symbol",
]);
const SUPPORTING_ENTITY_KINDS = new Set([
  "repo",
  "worktree",
  "checkout_epoch",
  "causal_session",
  "strand",
  "workspace_slice",
  "actor",
  "workspace_overlay",
  "staged_target",
  "causal_footprint",
  "causal_region",
  "evidence",
]);

const observedNodePropsSchema = z.looseObject({
  actorId: optionalString,
  actorKind: optionalString,
  authority: optionalString,
  causalSessionId: optionalString,
  checkoutEpochId: optionalString,
  continuityOperation: optionalString,
  entityKind: optionalString,
  eventId: optionalString,
  eventKind: optionalString,
  name: optionalString,
  occurredAt: optionalString,
  openedAt: optionalString,
  path: optionalString,
  paths: optionalStringArray,
  phase: optionalString,
  projection: optionalString,
  reason: optionalString,
  repoId: optionalString,
  selectionKind: optionalString,
  semanticKind: optionalString,
  source: optionalString,
  sourceLayer: optionalString,
  startedAt: optionalString,
  strandId: optionalString,
  summary: optionalString,
  surface: optionalString,
  symbols: optionalStringArray,
  targetId: optionalString,
  transportSessionId: optionalString,
  worktreeId: optionalString,
  workspaceOverlayId: optionalString,
  workspaceSliceId: optionalString,
});
const observedEdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
  label: z.string(),
}).strict();

type ObservedNodeProps = z.infer<typeof observedNodePropsSchema>;

export interface LocalHistoryDagNode {
  readonly id: string;
  readonly label: string;
  readonly entityKind: string;
  readonly eventKind?: string | undefined;
  readonly occurredAt?: string | undefined;
}

export interface LocalHistoryDagEdge {
  readonly from: string;
  readonly to: string;
  readonly label: string;
}

export interface LocalHistoryDagModel {
  readonly cwd: string;
  readonly repoId: string;
  readonly worktreeId: string;
  readonly requestedEventLimit: number;
  readonly totalEventCount: number;
  readonly shownEventCount: number;
  readonly nodeCount: number;
  readonly edgeCount: number;
  readonly truncated: boolean;
  readonly nodes: readonly LocalHistoryDagNode[];
  readonly edges: readonly LocalHistoryDagEdge[];
}

export interface LocalHistoryDagObservedNodeInput {
  readonly id: string;
  readonly props: Record<string, unknown>;
}

interface ObservedNode {
  readonly id: string;
  readonly props: ObservedNodeProps;
}

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

function trimId(value: string): string {
  const parts = value.split(":");
  return parts.at(-1) ?? value;
}

function parseObservedNode(input: LocalHistoryDagObservedNodeInput): ObservedNode | null {
  const parsed = observedNodePropsSchema.safeParse(input.props);
  if (!parsed.success) {
    return null;
  }
  return {
    id: input.id,
    props: parsed.data,
  };
}

function parseObservedEdge(input: LocalHistoryDagEdge): LocalHistoryDagEdge | null {
  const parsed = observedEdgeSchema.safeParse(input);
  return parsed.success ? parsed.data : null;
}

function buildNodeLabel(node: ObservedNode): string {
  const { id, props } = node;
  const entityKind = props.entityKind ?? "node";
  const occurredAt = props.occurredAt;

  if (entityKind === "local_history_event") {
    const eventKind = props.eventKind ?? "event";
    if (eventKind === "continuity") {
      const operation = props.continuityOperation ?? "continuity";
      return occurredAt !== undefined ? `continuity:${operation} @ ${occurredAt}` : `continuity:${operation}`;
    }
    if (eventKind === "read") {
      const surface = props.surface ?? "read";
      const projection = props.projection ?? "unknown";
      return occurredAt !== undefined ? `read:${surface}/${projection} @ ${occurredAt}` : `read:${surface}/${projection}`;
    }
    if (eventKind === "stage") {
      const selectionKind = props.selectionKind ?? "stage";
      return occurredAt !== undefined ? `stage:${selectionKind} @ ${occurredAt}` : `stage:${selectionKind}`;
    }
    if (eventKind === "transition") {
      const semanticKind = props.semanticKind ?? "transition";
      return occurredAt !== undefined ? `transition:${semanticKind} @ ${occurredAt}` : `transition:${semanticKind}`;
    }
    return occurredAt !== undefined ? `${eventKind} @ ${occurredAt}` : eventKind;
  }

  if (entityKind === "causal_session") {
    return `session:${trimId(props.causalSessionId ?? id)}`;
  }
  if (entityKind === "strand") {
    return `strand:${trimId(props.strandId ?? id)}`;
  }
  if (entityKind === "workspace_slice") {
    return `slice:${trimId(props.workspaceSliceId ?? id)}`;
  }
  if (entityKind === "checkout_epoch") {
    return `epoch:${trimId(props.checkoutEpochId ?? id)}`;
  }
  if (entityKind === "actor") {
    return `${props.actorKind ?? "actor"}:${trimId(props.actorId ?? id)}`;
  }
  if (entityKind === "workspace_overlay") {
    return `overlay:${trimId(props.workspaceOverlayId ?? id)}`;
  }
  if (entityKind === "staged_target") {
    return `target:${props.selectionKind ?? trimId(props.targetId ?? id)}`;
  }
  if (entityKind === "causal_footprint") {
    const pathCount = props.paths?.length ?? 0;
    const symbolCount = props.symbols?.length ?? 0;
    return `footprint:${String(pathCount)}p/${String(symbolCount)}s`;
  }
  if (entityKind === "repo") {
    return `repo:${trimId(props.repoId ?? id)}`;
  }
  if (entityKind === "worktree") {
    return `worktree:${trimId(props.worktreeId ?? id)}`;
  }
  if (props.path !== undefined) {
    return `file:${props.path}`;
  }
  if (props.name !== undefined) {
    return `symbol:${props.name}`;
  }

  return `${entityKind}:${trimId(id)}`;
}

function toDagNode(node: ObservedNode): LocalHistoryDagNode {
  return {
    id: node.id,
    label: buildNodeLabel(node),
    entityKind: node.props.entityKind ?? "unknown",
    ...(node.props.eventKind !== undefined ? { eventKind: node.props.eventKind } : {}),
    ...(node.props.occurredAt !== undefined ? { occurredAt: node.props.occurredAt } : {}),
  };
}

function resolveSelectedWorktreeId(
  resolvedWorktreeId: string,
  repoId: string,
  nodes: readonly ObservedNode[],
): string {
  const graphWorktreeIds = nodes
    .filter((node) => node.props.entityKind === "worktree" && node.props.repoId === repoId && node.props.worktreeId !== undefined)
    .map((node) => node.props.worktreeId)
    .sort();

  if (graphWorktreeIds.includes(resolvedWorktreeId)) {
    return resolvedWorktreeId;
  }
  if (graphWorktreeIds.length === 1) {
    return graphWorktreeIds[0] ?? resolvedWorktreeId;
  }
  return resolvedWorktreeId;
}

function collectEventNodes(
  repoId: string,
  worktreeId: string,
  nodes: readonly ObservedNode[],
): readonly { id: string; occurredAt?: string | undefined }[] {
  return nodes
    .filter((node) =>
      node.props.entityKind === "local_history_event" &&
      node.props.repoId === repoId &&
      node.props.worktreeId === worktreeId
    )
    .map((node) => ({
      id: node.id,
      occurredAt: node.props.occurredAt,
    }))
    .sort(compareByTimeThenId);
}

function collectIncludedNodeIds(
  selectedEventIds: ReadonlySet<string>,
  nodesById: ReadonlyMap<string, ObservedNode>,
  edges: readonly LocalHistoryDagEdge[],
): Set<string> {
  const included = new Set<string>(selectedEventIds);
  let changed = true;

  while (changed) {
    changed = false;
    for (const edge of edges) {
      if (!LOCAL_EDGE_LABELS.has(edge.label)) {
        continue;
      }
      const fromIncluded = included.has(edge.from);
      const toIncluded = included.has(edge.to);
      if (!fromIncluded && !toIncluded) {
        continue;
      }

      const fromKind = nodesById.get(edge.from)?.props.entityKind;
      const toKind = nodesById.get(edge.to)?.props.entityKind;

      if (fromIncluded && !toIncluded && toKind !== undefined && SUPPORTING_ENTITY_KINDS.has(toKind)) {
        included.add(edge.to);
        changed = true;
      }
      if (toIncluded && !fromIncluded && fromKind !== undefined && SUPPORTING_ENTITY_KINDS.has(fromKind)) {
        included.add(edge.from);
        changed = true;
      }
    }
  }

  return included;
}

export function buildLocalHistoryDagModelFromObservedGraph(input: {
  readonly cwd: string;
  readonly repoId: string;
  readonly resolvedWorktreeId: string;
  readonly requestedEventLimit: number;
  readonly observedNodes: readonly LocalHistoryDagObservedNodeInput[];
  readonly observedEdges: readonly LocalHistoryDagEdge[];
}): LocalHistoryDagModel {
  const nodes = input.observedNodes
    .map(parseObservedNode)
    .filter((node): node is ObservedNode => node !== null);
  const edges = input.observedEdges
    .map(parseObservedEdge)
    .filter((edge): edge is LocalHistoryDagEdge => edge !== null);
  const nodesById = new Map(nodes.map((node) => [node.id, node] as const));
  const candidateIdSet = new Set(nodesById.keys());
  const boundedEdges = edges.filter((edge) => candidateIdSet.has(edge.from) && candidateIdSet.has(edge.to));
  const selectedWorktreeId = resolveSelectedWorktreeId(input.resolvedWorktreeId, input.repoId, nodes);
  const eventNodes = collectEventNodes(input.repoId, selectedWorktreeId, nodes);
  const selectedEventIds = new Set(eventNodes.slice(-input.requestedEventLimit).map((node) => node.id));
  const includedNodeIds = collectIncludedNodeIds(selectedEventIds, nodesById, boundedEdges);
  const selectedNodes = [...includedNodeIds]
    .map((id) => nodesById.get(id))
    .filter((node): node is ObservedNode => node !== undefined)
    .map(toDagNode)
    .sort(compareByTimeThenId);
  const selectedEdges = boundedEdges.filter((edge) => includedNodeIds.has(edge.from) && includedNodeIds.has(edge.to));

  return {
    cwd: input.cwd,
    repoId: input.repoId,
    worktreeId: selectedWorktreeId,
    requestedEventLimit: input.requestedEventLimit,
    totalEventCount: eventNodes.length,
    shownEventCount: selectedEventIds.size,
    nodeCount: selectedNodes.length,
    edgeCount: selectedEdges.length,
    truncated: eventNodes.length > selectedEventIds.size,
    nodes: selectedNodes,
    edges: selectedEdges,
  };
}

export async function loadLocalHistoryDagModel(options: {
  readonly cwd: string;
  readonly limit: number;
}): Promise<LocalHistoryDagModel> {
  const resolved = await resolveWorkspaceRequest(nodeGit, { cwd: options.cwd });
  if ("code" in resolved) {
    throw new Error(resolved.message);
  }

  const warp = await openWarp({ cwd: options.cwd });
  const observer = await warp.observer({
    match: [...LOCAL_HISTORY_OBSERVER_MATCH],
    expose: [...LOCAL_HISTORY_OBSERVER_EXPOSE],
  });
  const observedNodeIds = await observer.getNodes();
  const observedNodes = (await Promise.all(
    observedNodeIds.map(async (id) => {
      const props = await observer.getNodeProps(id);
      return props === null ? null : { id, props };
    }),
  )).filter((node): node is LocalHistoryDagObservedNodeInput => node !== null);
  const observedEdges = (await observer.getEdges()).map((edge) => ({
    from: edge.from,
    to: edge.to,
    label: edge.label,
  }));

  return buildLocalHistoryDagModelFromObservedGraph({
    cwd: options.cwd,
    repoId: resolved.repoId,
    resolvedWorktreeId: resolved.worktreeId,
    requestedEventLimit: options.limit > 0 ? options.limit : DEFAULT_LOCAL_HISTORY_DAG_LIMIT,
    observedNodes,
    observedEdges,
  });
}
