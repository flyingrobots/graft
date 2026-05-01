import type {
  BacklogStatusItem,
  BacklogStatusModel,
  BacklogStatusWarning,
} from "./backlog-status-model.js";

function compareText(left: string, right: string): number {
  return left.localeCompare(right);
}

function bySourceThenId(left: BacklogStatusItem, right: BacklogStatusItem): number {
  const sourceCompare = compareText(left.sourcePath, right.sourcePath);
  return sourceCompare === 0 ? compareText(left.id, right.id) : sourceCompare;
}

function sortedItems(model: BacklogStatusModel, statuses: readonly BacklogStatusItem["status"][]): BacklogStatusItem[] {
  const wanted = new Set(statuses);
  return model.items
    .filter((item) => wanted.has(item.status))
    .slice()
    .sort(bySourceThenId);
}

function sortedWarnings(model: BacklogStatusModel): BacklogStatusWarning[] {
  return model.warnings.slice().sort((left, right) => {
    const sourceCompare = compareText(left.sourcePath, right.sourcePath);
    if (sourceCompare !== 0) return sourceCompare;
    const typeCompare = compareText(left.type, right.type);
    if (typeCompare !== 0) return typeCompare;
    return compareText(left.itemId, right.itemId);
  });
}

function laneLabel(item: BacklogStatusItem): string {
  return item.lane ?? item.sourceLane ?? "unknown";
}

function joinRefs(refs: readonly string[]): string {
  return refs.slice().sort(compareText).join(", ");
}

function pushSection(lines: string[], title: string, body: readonly string[]): void {
  lines.push("", title);
  if (body.length === 0) {
    lines.push("  none");
    return;
  }
  lines.push(...body);
}

function renderSummary(model: BacklogStatusModel): string[] {
  const lanes = Object.entries(model.summary.activeBacklogByLane)
    .slice()
    .sort(([left], [right]) => compareText(left, right));

  const lines = [
    "Summary",
    "  active backlog:",
  ];

  if (lanes.length === 0) {
    lines.push("    none");
  } else {
    for (const [lane, count] of lanes) {
      lines.push(`    ${lane}: ${String(count)}`);
    }
  }

  lines.push(
    `  active designs: ${String(model.summary.activeDesignCount)}`,
    `  completed retros: ${String(model.summary.completedRetroCount)}`,
    `  blocked internal: ${String(model.summary.blockedInternalCount)}`,
    `  blocked external: ${String(model.summary.blockedExternalCount)}`,
    `  unresolved dependency refs: ${String(model.summary.unresolvedDependencyReferenceCount)}`,
  );

  return lines;
}

function renderPlainItem(item: BacklogStatusItem): string {
  return `  - ${item.id} [${laneLabel(item)}] ${item.title} (${item.sourcePath})`;
}

function renderActiveBacklog(model: BacklogStatusModel): string[] {
  return sortedItems(model, ["backlog", "stale_metadata", "unknown"]).map((item) => {
    const statusSuffix = item.status === "backlog" ? "" : `; status ${item.status}`;
    return `${renderPlainItem(item)}${statusSuffix}`;
  });
}

function renderActiveDesign(model: BacklogStatusModel): string[] {
  return sortedItems(model, ["active_design"]).map(renderPlainItem);
}

function renderCompleted(model: BacklogStatusModel): string[] {
  return sortedItems(model, ["completed"]).map((item) => {
    const retro = item.retroPath === undefined ? "retro: missing" : `retro: ${item.retroPath}`;
    return `${renderPlainItem(item)}; ${retro}`;
  });
}

function renderBlocked(model: BacklogStatusModel): string[] {
  return sortedItems(model, ["blocked_internal", "blocked_external"]).map((item) => {
    const internal = item.blockedBy.length === 0 ? "" : `blocked by ${joinRefs(item.blockedBy)}`;
    const external = item.blockedByExternal.length === 0 ? "" : `external ${joinRefs(item.blockedByExternal)}`;
    const reason = [internal, external].filter((part) => part.length > 0).join("; ");
    return `${renderPlainItem(item)}; ${reason}`;
  });
}

function renderWarning(warning: BacklogStatusWarning): string {
  if (warning.type === "unresolved_dependency_ref") {
    return `  - ${warning.itemId}: ${warning.field ?? "dependency"} -> ${warning.ref ?? "unknown"} (${warning.sourcePath})`;
  }

  if (warning.type === "lane_frontmatter_mismatch") {
    return [
      `  - ${warning.itemId}:`,
      `lane ${warning.expectedLane ?? "unknown"} has frontmatter lane ${warning.actualLane ?? "unknown"}`,
      `(${warning.sourcePath})`,
    ].join(" ");
  }

  return `  - ${warning.itemId}: completed design missing retro (${warning.sourcePath})`;
}

function renderWarnings(model: BacklogStatusModel): string[] {
  return sortedWarnings(model).map(renderWarning);
}

export function renderBacklogStatus(model: BacklogStatusModel): string {
  const lines = ["Backlog Status", "", ...renderSummary(model)];

  pushSection(lines, "Active Backlog", renderActiveBacklog(model));
  pushSection(lines, "Active Design", renderActiveDesign(model));
  pushSection(lines, "Completed", renderCompleted(model));
  pushSection(lines, "Blocked", renderBlocked(model));
  pushSection(lines, "Warnings", renderWarnings(model));

  return lines.join("\n").trimEnd();
}
