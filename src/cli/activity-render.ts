interface AttributionActor {
  readonly actorId: string;
  readonly actorKind: string;
}

interface AttributionSummary {
  readonly actor: AttributionActor;
  readonly confidence: string;
}

interface CausalFootprint {
  readonly paths: readonly string[];
  readonly symbols: readonly string[];
}

interface ContinuityActivityItem {
  readonly itemKind: "continuity";
  readonly operation: string;
  readonly occurredAt: string;
  readonly causalSessionId: string;
  readonly strandId: string;
  readonly attribution: AttributionSummary;
  readonly continuedFromCausalSessionId: string | null;
  readonly continuedFromStrandId: string | null;
}

interface ReadActivityItem {
  readonly eventKind: "read";
  readonly occurredAt: string;
  readonly attribution: AttributionSummary;
  readonly footprint: CausalFootprint;
  readonly payload: {
    readonly surface: string;
    readonly projection: string;
  };
}

interface StageActivityItem {
  readonly eventKind: "stage";
  readonly occurredAt: string;
  readonly attribution: AttributionSummary;
  readonly footprint: CausalFootprint;
  readonly payload: {
    readonly selectionKind: string;
  };
}

interface TransitionActivityItem {
  readonly eventKind: "transition";
  readonly occurredAt: string;
  readonly attribution: AttributionSummary;
  readonly payload: {
    readonly summary: string;
  };
}

type ActivityItem =
  | ContinuityActivityItem
  | ReadActivityItem
  | StageActivityItem
  | TransitionActivityItem;

interface ActivityGroup {
  readonly label: string;
  readonly summary: string;
  readonly items: readonly ActivityItem[];
}

interface DiagActivityOutput {
  readonly repoId: string | null;
  readonly worktreeId: string | null;
  readonly truthClass: string;
  readonly anchor: {
    readonly posture: string;
    readonly headRef: string | null;
    readonly headSha: string | null;
  };
  readonly summary: {
    readonly headline: string;
    readonly anchor: string;
    readonly workspace: string;
    readonly groups: readonly string[];
  };
  readonly activityWindow: {
    readonly returned: number;
    readonly totalMatchingItems: number;
    readonly truncated: boolean;
    readonly groups: readonly ActivityGroup[];
  };
  readonly degradedReasons: readonly string[];
  readonly nextAction: string;
}

function trimId(value: string | null | undefined): string {
  if (value === null || value === undefined || value.length === 0) {
    return "unknown";
  }
  const parts = value.split(":");
  return parts.at(-1) ?? value;
}

function shortSha(value: string | null): string {
  return value === null ? "unknown" : value.slice(0, 7);
}

function actorLabel(attribution: AttributionSummary): string {
  const actorId = trimId(attribution.actor.actorId);
  const actorKind = attribution.actor.actorKind;
  return actorKind === "unknown" ? `actor:${actorId}` : `${actorKind}:${actorId}`;
}

function summarizePaths(paths: readonly string[]): string {
  if (paths.length === 0) {
    return "no paths";
  }
  if (paths.length === 1) {
    return paths[0] ?? "no paths";
  }
  if (paths.length === 2) {
    return `${paths[0] ?? ""}, ${paths[1] ?? ""}`;
  }
  return `${paths[0] ?? ""}, ${paths[1] ?? ""} +${String(paths.length - 2)} more`;
}

function formatContinuityItem(item: ContinuityActivityItem): string {
  const origin = item.continuedFromCausalSessionId === null
    ? ""
    : ` from session:${trimId(item.continuedFromCausalSessionId)}`;
  return `${item.occurredAt}  continuity:${item.operation}  ${actorLabel(item.attribution)}  session:${trimId(item.causalSessionId)}  strand:${trimId(item.strandId)}${origin}`;
}

function formatReadItem(item: ReadActivityItem): string {
  return `${item.occurredAt}  read:${item.payload.surface}/${item.payload.projection}  ${actorLabel(item.attribution)}  ${summarizePaths(item.footprint.paths)}`;
}

function formatStageItem(item: StageActivityItem): string {
  return `${item.occurredAt}  stage:${item.payload.selectionKind}  ${actorLabel(item.attribution)}  ${summarizePaths(item.footprint.paths)}`;
}

function formatTransitionItem(item: TransitionActivityItem): string {
  return `${item.occurredAt}  transition  ${actorLabel(item.attribution)}  ${item.payload.summary}`;
}

function formatActivityItem(item: ActivityItem): string {
  if ("itemKind" in item) {
    return formatContinuityItem(item);
  }
  if (item.eventKind === "read") {
    return formatReadItem(item);
  }
  if (item.eventKind === "stage") {
    return formatStageItem(item);
  }
  return formatTransitionItem(item);
}

export function renderActivityView(output: DiagActivityOutput): string {
  const lines = [
    "Activity",
    `repo: ${output.repoId ?? "unknown"}`,
    `worktree: ${output.worktreeId ?? "unknown"}`,
    `anchor: ${output.anchor.headRef ?? output.anchor.posture} @ ${shortSha(output.anchor.headSha)}`,
    `truth: ${output.truthClass}`,
    `next: ${output.nextAction}`,
    `degraded: ${output.degradedReasons.length === 0 ? "none" : output.degradedReasons.join(", ")}`,
    "",
    output.summary.headline,
    output.summary.anchor,
    output.summary.workspace,
  ];

  if (output.activityWindow.returned === 0) {
    lines.push("", "No activity items found in the requested window.");
    return lines.join("\n");
  }

  lines.push("");
  lines.push(`window: ${String(output.activityWindow.returned)} shown / ${String(output.activityWindow.totalMatchingItems)} matching${output.activityWindow.truncated ? " (truncated)" : ""}`);
  lines.push("");
  lines.push("Groups");

  for (const group of output.activityWindow.groups) {
    lines.push("");
    lines.push(`${group.label} (${String(group.items.length)})`);
    lines.push(group.summary);
    for (const item of group.items) {
      lines.push(`  ${formatActivityItem(item)}`);
    }
  }

  return lines.join("\n").trimEnd();
}
