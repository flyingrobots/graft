function formatBoolean(value: boolean): string {
  return value ? "healthy" : "degraded";
}

function formatUnknownRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function formatOptionalString(value: unknown, fallback = "unknown"): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function formatOptionalNumber(value: unknown, fallback = "unknown"): string {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : fallback;
}

function formatRepoConcurrency(value: unknown): string {
  if (value === null || value === undefined) {
    return "unknown";
  }
  const concurrency = formatUnknownRecord(value);
  return `${formatOptionalString(concurrency["posture"])} (${formatOptionalString(concurrency["authority"])})`;
}

function formatRuntimeLog(value: unknown): string {
  const runtime = formatUnknownRecord(value);
  const logPath = runtime["logPath"];
  return typeof logPath === "string" && logPath.length > 0 ? logPath : "not configured";
}

function formatWorkspaceFooting(value: unknown): string {
  const footing = formatUnknownRecord(value);
  const mode = formatOptionalString(footing["observationMode"], "unknown");
  const degraded = footing["degraded"] === true ? "degraded" : "ready";
  return `${mode} (${degraded})`;
}

function formatSludge(value: unknown): string {
  if (value === undefined) {
    return "not requested";
  }
  const sludge = formatUnknownRecord(value);
  const files = Array.isArray(sludge["files"]) ? sludge["files"] : [];
  const signals = files.reduce(
    (sum: number, file: unknown) => {
      const record = formatUnknownRecord(file);
      const fileSignals = Array.isArray(record["signals"]) ? record["signals"] : [];
      return sum + fileSignals.length;
    },
    0,
  );
  return `${formatOptionalNumber(sludge["scannedFiles"], "0")} files scanned, ${formatOptionalNumber(sludge["filesWithSignals"], "0")} files with signals, ${String(signals)} signals`;
}

export function renderDoctorPosture(output: unknown): string {
  const parsed = formatUnknownRecord(output);
  const thresholds = formatUnknownRecord(parsed["thresholds"]);
  const burdenSummary = formatUnknownRecord(parsed["burdenSummary"]);
  const stagedTarget = formatUnknownRecord(parsed["stagedTarget"]);
  const target = formatUnknownRecord(stagedTarget["target"]);
  const targetKind = formatOptionalString(target["kind"], "none");

  const lines = [
    "Graft Doctor",
    "",
    "Health",
    `  parser: ${formatBoolean(parsed["parserHealthy"] === true)}`,
    `  session: ${formatOptionalString(parsed["sessionDepth"])} (${formatOptionalNumber(parsed["totalMessages"], "0")} messages)`,
    `  next: ${formatOptionalString(parsed["recommendedNextAction"])}`,
    "",
    "Capability posture",
    `  runtime log: ${formatRuntimeLog(parsed["runtimeObservability"])}`,
    `  read thresholds: ${formatOptionalNumber(thresholds["lines"], "0")} lines / ${formatOptionalNumber(thresholds["bytes"], "0")} bytes`,
    `  burden: ${formatOptionalNumber(burdenSummary["totalBytesReturned"], "0")} bytes returned, ${formatOptionalNumber(burdenSummary["totalNonReadBytesReturned"], "0")} non-read bytes`,
    `  top burden: ${formatOptionalString(burdenSummary["topKind"], "none")} (${formatOptionalNumber(burdenSummary["topBytesReturned"], "0")} bytes, ${formatOptionalNumber(burdenSummary["topCalls"], "0")} calls)`,
    "",
    "Repo footing",
    `  root: ${formatOptionalString(parsed["projectRoot"])}`,
    `  concurrency: ${formatRepoConcurrency(parsed["repoConcurrency"])}`,
    `  checkout epoch: ${formatOptionalNumber(parsed["checkoutEpoch"])}`,
    `  workspace overlay: ${formatOptionalString(parsed["workspaceOverlayId"], "none")}`,
    `  workspace footing: ${formatWorkspaceFooting(parsed["workspaceOverlayFooting"])}`,
    `  staged target: ${targetKind}`,
    "",
    "Sludge scan",
    `  ${formatSludge(parsed["sludge"])}`,
  ];

  return lines.join("\n").trimEnd();
}
