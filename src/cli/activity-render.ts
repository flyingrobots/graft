import { type z } from "zod";
import { DIAG_ACTIVITY_CLI_SCHEMA } from "../contracts/output-schemas.js";

type DiagActivityOutput = z.infer<typeof DIAG_ACTIVITY_CLI_SCHEMA>;
type ActivityGroup = DiagActivityOutput["activityWindow"]["groups"][number];
type ActivityItem = ActivityGroup["items"][number];
type AttributionSummary = ActivityItem["attribution"];
type ContinuityActivityItem = Extract<ActivityItem, { itemKind: "continuity" }>;
type ReadActivityItem = Extract<ActivityItem, { eventKind: "read" }>;
type StageActivityItem = Extract<ActivityItem, { eventKind: "stage" }>;
type TransitionActivityItem = Extract<ActivityItem, { eventKind: "transition" }>;

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

export function renderActivityView(output: unknown): string {
  const parsed = DIAG_ACTIVITY_CLI_SCHEMA.parse(output);
  const lines = [
    "Activity",
    `repo: ${parsed.repoId ?? "unknown"}`,
    `worktree: ${parsed.worktreeId ?? "unknown"}`,
    `anchor: ${parsed.anchor.headRef ?? parsed.anchor.posture} @ ${shortSha(parsed.anchor.headSha)}`,
    `truth: ${parsed.truthClass}`,
    `next: ${parsed.nextAction}`,
    `degraded: ${parsed.degradedReasons.length === 0 ? "none" : parsed.degradedReasons.join(", ")}`,
    "",
    parsed.summary.headline,
    parsed.summary.anchor,
    parsed.summary.workspace,
  ];

  if (parsed.activityWindow.returned === 0) {
    lines.push("", "No activity items found in the requested window.");
    return lines.join("\n");
  }

  lines.push("");
  lines.push(`window: ${String(parsed.activityWindow.returned)} shown / ${String(parsed.activityWindow.totalMatchingItems)} matching${parsed.activityWindow.truncated ? " (truncated)" : ""}`);
  lines.push("");
  lines.push("Groups");

  for (const group of parsed.activityWindow.groups) {
    lines.push("");
    lines.push(`${group.label} (${String(group.items.length)})`);
    lines.push(group.summary);
    for (const item of group.items) {
      lines.push(`  ${formatActivityItem(item)}`);
    }
  }

  return lines.join("\n").trimEnd();
}
