import { CanonicalJsonCodec } from "../adapters/canonical-json.js";
import { nodeGit } from "../adapters/node-git.js";
import { attachCliSchemaMeta, validateCliOutput } from "../contracts/output-schemas.js";
import { resolveWorkspaceRequest } from "../mcp/workspace-router.js";
import { openWarp } from "../warp/open.js";

const codec = new CanonicalJsonCodec();
const DEFAULT_EVENT_LIMIT = 12;
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

interface Writer {
  write(chunk: string): unknown;
}

export interface RunLocalHistoryDagOptions {
  readonly cwd: string;
  readonly limit: number;
  readonly json: boolean;
  readonly stdout?: Writer | undefined;
  readonly stderr?: Writer | undefined;
}

interface LocalHistoryDagNode {
  readonly id: string;
  readonly label: string;
  readonly entityKind: string;
  readonly eventKind?: string | undefined;
  readonly occurredAt?: string | undefined;
}

interface LocalHistoryDagEdge {
  readonly from: string;
  readonly to: string;
  readonly label: string;
}

interface LocalHistoryDagPayload {
  readonly cwd: string;
  readonly repoId: string;
  readonly worktreeId: string;
  readonly requestedEventLimit: number;
  readonly totalEventCount: number;
  readonly shownEventCount: number;
  readonly nodeCount: number;
  readonly edgeCount: number;
  readonly truncated: boolean;
  readonly rendered: string;
  readonly nodes: readonly LocalHistoryDagNode[];
  readonly edges: readonly LocalHistoryDagEdge[];
  readonly error?: string | undefined;
}

function writeLine(writer: Writer, line = ""): void {
  writer.write(`${line}\n`);
}

function stringProp(props: Record<string, unknown>, key: string): string | undefined {
  const value = props[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function stringArrayProp(props: Record<string, unknown>, key: string): string[] {
  const value = props[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
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

function buildNodeLabel(id: string, props: Record<string, unknown>): string {
  const entityKind = stringProp(props, "entityKind") ?? "node";
  const occurredAt = stringProp(props, "occurredAt");

  if (entityKind === "local_history_event") {
    const eventKind = stringProp(props, "eventKind") ?? "event";
    if (eventKind === "continuity") {
      const op = stringProp(props, "continuityOperation") ?? "continuity";
      return occurredAt !== undefined ? `continuity:${op} @ ${occurredAt}` : `continuity:${op}`;
    }
    if (eventKind === "read") {
      const surface = stringProp(props, "surface") ?? "read";
      const projection = stringProp(props, "projection") ?? "unknown";
      return occurredAt !== undefined ? `read:${surface}/${projection} @ ${occurredAt}` : `read:${surface}/${projection}`;
    }
    if (eventKind === "stage") {
      const selectionKind = stringProp(props, "selectionKind") ?? "stage";
      return occurredAt !== undefined ? `stage:${selectionKind} @ ${occurredAt}` : `stage:${selectionKind}`;
    }
    if (eventKind === "transition") {
      const semanticKind = stringProp(props, "semanticKind") ?? "transition";
      return occurredAt !== undefined ? `transition:${semanticKind} @ ${occurredAt}` : `transition:${semanticKind}`;
    }
    return occurredAt !== undefined ? `${eventKind} @ ${occurredAt}` : eventKind;
  }

  if (entityKind === "causal_session") {
    return `session:${trimId(stringProp(props, "causalSessionId") ?? id)}`;
  }
  if (entityKind === "strand") {
    return `strand:${trimId(stringProp(props, "strandId") ?? id)}`;
  }
  if (entityKind === "workspace_slice") {
    return `slice:${trimId(stringProp(props, "workspaceSliceId") ?? id)}`;
  }
  if (entityKind === "checkout_epoch") {
    return `epoch:${trimId(stringProp(props, "checkoutEpochId") ?? id)}`;
  }
  if (entityKind === "actor") {
    return `${stringProp(props, "actorKind") ?? "actor"}:${trimId(stringProp(props, "actorId") ?? id)}`;
  }
  if (entityKind === "workspace_overlay") {
    return `overlay:${trimId(stringProp(props, "workspaceOverlayId") ?? id)}`;
  }
  if (entityKind === "staged_target") {
    return `target:${stringProp(props, "selectionKind") ?? trimId(stringProp(props, "targetId") ?? id)}`;
  }
  if (entityKind === "causal_footprint") {
    const paths = stringArrayProp(props, "paths").length;
    const symbols = stringArrayProp(props, "symbols").length;
    return `footprint:${String(paths)}p/${String(symbols)}s`;
  }
  if (entityKind === "repo") {
    return `repo:${trimId(stringProp(props, "repoId") ?? id)}`;
  }
  if (entityKind === "worktree") {
    return `worktree:${trimId(stringProp(props, "worktreeId") ?? id)}`;
  }
  const filePath = stringProp(props, "path");
  if (filePath !== undefined) {
    return `file:${filePath}`;
  }
  const symbolName = stringProp(props, "name");
  if (symbolName !== undefined) {
    return `symbol:${symbolName}`;
  }

  return `${entityKind}:${trimId(id)}`;
}

function buildNodeSummary(id: string, props: Record<string, unknown>): LocalHistoryDagNode {
  return {
    id,
    label: buildNodeLabel(id, props),
    entityKind: stringProp(props, "entityKind") ?? "unknown",
    ...(stringProp(props, "eventKind") !== undefined ? { eventKind: stringProp(props, "eventKind") } : {}),
    ...(stringProp(props, "occurredAt") !== undefined ? { occurredAt: stringProp(props, "occurredAt") } : {}),
  };
}

function renderDag(input: {
  readonly repoId: string;
  readonly worktreeId: string;
  readonly requestedEventLimit: number;
  readonly totalEventCount: number;
  readonly shownEventCount: number;
  readonly nodeById: ReadonlyMap<string, LocalHistoryDagNode>;
  readonly edges: readonly LocalHistoryDagEdge[];
}): string {
  if (input.shownEventCount === 0) {
    return [
      "Local History DAG",
      `repo: ${input.repoId}`,
      `worktree: ${input.worktreeId}`,
      "",
      "No local history event nodes found in the WARP graph.",
    ].join("\n");
  }

  const outgoing = new Map<string, LocalHistoryDagEdge[]>();
  for (const edge of input.edges) {
    const bucket = outgoing.get(edge.from) ?? [];
    bucket.push(edge);
    outgoing.set(edge.from, bucket);
  }

  const events = [...input.nodeById.values()]
    .filter((node) => node.entityKind === "local_history_event")
    .sort(compareByTimeThenId);

  const lines = [
    "Local History DAG",
    `repo: ${input.repoId}`,
    `worktree: ${input.worktreeId}`,
    `events: ${String(input.shownEventCount)}/${String(input.totalEventCount)} (limit ${String(input.requestedEventLimit)})`,
    `nodes: ${String(input.nodeById.size)}`,
    `edges: ${String(input.edges.length)}`,
    "",
  ];

  for (const [index, node] of events.entries()) {
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
      const target = input.nodeById.get(edge.to);
      const connector = edgeIndex === nodeEdges.length - 1 ? "└─" : "├─";
      lines.push(`    ${connector} ${edge.label} -> ${target?.label ?? edge.to}`);
    }
    lines.push("");
  }

  const supporting = [...input.nodeById.values()]
    .filter((node) => node.entityKind !== "local_history_event")
    .sort((left, right) => left.label.localeCompare(right.label));
  if (supporting.length > 0) {
    lines.push("Support nodes:");
    for (const node of supporting) {
      lines.push(`  - ${node.label}`);
    }
  }

  return lines.join("\n").trimEnd();
}

function emitJson(payload: LocalHistoryDagPayload, writer: Writer): void {
  writer.write(
    `${codec.encode(validateCliOutput("diag_local_history_dag", attachCliSchemaMeta("diag_local_history_dag", payload)))}\n`,
  );
}

export async function runLocalHistoryDag(options: RunLocalHistoryDagOptions): Promise<void> {
  const stdout = options.stdout ?? process.stdout;
  const stderr = options.stderr ?? process.stderr;
  const limit = options.limit > 0 ? options.limit : DEFAULT_EVENT_LIMIT;

  try {
    const resolved = await resolveWorkspaceRequest(nodeGit, { cwd: options.cwd });
    if ("code" in resolved) {
      throw new Error(resolved.message);
    }

    const warp = await openWarp({ cwd: options.cwd });
    const observer = await warp.observer({
      match: [...LOCAL_HISTORY_OBSERVER_MATCH],
      expose: [...LOCAL_HISTORY_OBSERVER_EXPOSE],
    });
    const candidateIds = await observer.getNodes();
    const candidateIdSet = new Set(candidateIds);
    const propsEntries: (readonly [string, Record<string, unknown> | null])[] = await Promise.all(
      candidateIds.map(async (id): Promise<readonly [string, Record<string, unknown> | null]> => [
        id,
        await observer.getNodeProps(id),
      ] as const),
    );
    const propsById = new Map<string, Record<string, unknown>>(
      propsEntries.filter((entry): entry is readonly [string, Record<string, unknown>] => entry[1] !== null),
    );
    const graphWorktreeIds = [...propsById.entries()]
      .filter(([, props]) =>
        stringProp(props, "entityKind") === "worktree" &&
        stringProp(props, "repoId") === resolved.repoId &&
        stringProp(props, "worktreeId") !== undefined
      )
      .map(([, props]) => stringProp(props, "worktreeId"))
      .filter((worktreeId): worktreeId is string => worktreeId !== undefined)
      .sort();
    const selectedWorktreeId: string = graphWorktreeIds.includes(resolved.worktreeId)
      ? resolved.worktreeId
      : (graphWorktreeIds.length === 1 ? (graphWorktreeIds[0] ?? resolved.worktreeId) : resolved.worktreeId);

    const eventNodes = [...propsById.entries()]
      .filter(([, props]) =>
        stringProp(props, "entityKind") === "local_history_event" &&
        stringProp(props, "repoId") === resolved.repoId &&
        stringProp(props, "worktreeId") === selectedWorktreeId
      )
      .map(([id, props]) => ({
        id,
        occurredAt: stringProp(props, "occurredAt"),
      }))
      .sort(compareByTimeThenId);

    const selectedEventIds = new Set(eventNodes.slice(-limit).map((entry) => entry.id));
    const localEdgeLabels = new Set([
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
    const supportingEntityKinds = new Set([
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

    const allEdges = (await observer.getEdges())
      .filter((edge) => candidateIdSet.has(edge.from) && candidateIdSet.has(edge.to))
      .map((edge) => ({
        from: edge.from,
        to: edge.to,
        label: edge.label,
      }));

    const included = new Set<string>(selectedEventIds);
    let changed = true;
    while (changed) {
      changed = false;
      for (const edge of allEdges) {
        if (!localEdgeLabels.has(edge.label)) {
          continue;
        }
        const fromIncluded = included.has(edge.from);
        const toIncluded = included.has(edge.to);
        if (!fromIncluded && !toIncluded) {
          continue;
        }
        const fromProps = propsById.get(edge.from);
        const toProps = propsById.get(edge.to);
        const fromKind = fromProps !== undefined ? stringProp(fromProps, "entityKind") : undefined;
        const toKind = toProps !== undefined ? stringProp(toProps, "entityKind") : undefined;

        if (
          fromIncluded &&
          !toIncluded &&
          toKind !== undefined &&
          supportingEntityKinds.has(toKind)
        ) {
          included.add(edge.to);
          changed = true;
        }
        if (
          toIncluded &&
          !fromIncluded &&
          fromKind !== undefined &&
          supportingEntityKinds.has(fromKind)
        ) {
          included.add(edge.from);
          changed = true;
        }
      }
    }

    const nodes = [...included]
      .map((id) => {
        const props = propsById.get(id);
        return props === undefined ? null : buildNodeSummary(id, props);
      })
      .filter((node): node is LocalHistoryDagNode => node !== null)
      .sort(compareByTimeThenId);
    const nodeById = new Map(nodes.map((node) => [node.id, node] as const));
    const edges = allEdges
      .filter((edge) => included.has(edge.from) && included.has(edge.to))
      .map((edge) => ({
        from: edge.from,
        to: edge.to,
        label: edge.label,
      }));

    const payload: LocalHistoryDagPayload = {
      cwd: options.cwd,
      repoId: resolved.repoId,
      worktreeId: selectedWorktreeId,
      requestedEventLimit: limit,
      totalEventCount: eventNodes.length,
      shownEventCount: [...selectedEventIds].length,
      nodeCount: nodes.length,
      edgeCount: edges.length,
      truncated: eventNodes.length > selectedEventIds.size,
      rendered: renderDag({
        repoId: resolved.repoId,
        worktreeId: selectedWorktreeId,
        requestedEventLimit: limit,
        totalEventCount: eventNodes.length,
        shownEventCount: selectedEventIds.size,
        nodeById,
        edges,
      }),
      nodes,
      edges,
    };

    if (options.json) {
      emitJson(payload, stdout);
      return;
    }

    writeLine(stdout, payload.rendered);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    process.exitCode = 1;
    if (options.json) {
      emitJson({
        cwd: options.cwd,
        repoId: "unknown",
        worktreeId: "unknown",
        requestedEventLimit: limit,
        totalEventCount: 0,
        shownEventCount: 0,
        nodeCount: 0,
        edgeCount: 0,
        truncated: false,
        rendered: "",
        nodes: [],
        edges: [],
        error: message,
      }, stdout);
      return;
    }
    writeLine(stderr, `Error: ${message}`);
  }
}
