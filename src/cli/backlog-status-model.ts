import type { FileSystem } from "../ports/filesystem.js";
import type { PathOps } from "../ports/paths.js";

type FrontmatterValue = string | string[];

export type BacklogStatus =
  | "backlog"
  | "active_design"
  | "completed"
  | "blocked_internal"
  | "blocked_external"
  | "stale_metadata"
  | "unknown";

export interface BacklogStatusSummary {
  readonly activeBacklogByLane: Readonly<Record<string, number>>;
  readonly activeDesignCount: number;
  readonly completedRetroCount: number;
  readonly blockedInternalCount: number;
  readonly blockedExternalCount: number;
  readonly unresolvedDependencyReferenceCount: number;
}

export interface BacklogStatusItem {
  readonly id: string;
  readonly title: string;
  readonly legend: string | undefined;
  readonly feature: string | undefined;
  readonly kind: string | undefined;
  readonly lane: string | undefined;
  readonly frontmatterLane: string | undefined;
  readonly sourceLane: string | undefined;
  readonly status: BacklogStatus;
  readonly sourcePath: string;
  readonly blockedBy: readonly string[];
  readonly blocking: readonly string[];
  readonly blockedByExternal: readonly string[];
  readonly retroPath: string | undefined;
}

export type BacklogStatusWarningType =
  | "unresolved_dependency_ref"
  | "lane_frontmatter_mismatch"
  | "completed_design_missing_retro";

export interface BacklogStatusWarning {
  readonly type: BacklogStatusWarningType;
  readonly itemId: string;
  readonly sourcePath: string;
  readonly field: "blocked_by" | "blocking" | undefined;
  readonly ref: string | undefined;
  readonly expectedLane: string | undefined;
  readonly actualLane: string | undefined;
}

export interface BacklogStatusModel {
  readonly summary: BacklogStatusSummary;
  readonly items: readonly BacklogStatusItem[];
  readonly warnings: readonly BacklogStatusWarning[];
}

export interface BuildBacklogStatusModelInput {
  readonly root: string;
  readonly fs: FileSystem;
  readonly pathOps: PathOps;
}

interface ParsedDocument {
  readonly id: string;
  readonly title: string;
  readonly legend: string | undefined;
  readonly feature: string | undefined;
  readonly kind: string | undefined;
  readonly status: string | undefined;
  readonly lane: string | undefined;
  readonly sourceLane: string | undefined;
  readonly blockedBy: readonly string[];
  readonly blocking: readonly string[];
  readonly blockedByExternal: readonly string[];
  readonly sourcePath: string;
}

function stripQuotes(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length >= 2) {
    const first = trimmed[0];
    const last = trimmed[trimmed.length - 1];
    if ((first === "\"" && last === "\"") || (first === "'" && last === "'")) {
      return trimmed.slice(1, -1);
    }
  }
  return trimmed;
}

function extractFrontmatter(markdown: string): string | undefined {
  if (!markdown.startsWith("---\n")) return undefined;
  const end = markdown.indexOf("\n---", 4);
  if (end === -1) return undefined;
  return markdown.slice(4, end);
}

function parseFrontmatter(markdown: string): Record<string, FrontmatterValue> {
  const block = extractFrontmatter(markdown);
  const fields: Record<string, FrontmatterValue> = {};
  if (block === undefined) return fields;

  let currentArrayKey: string | undefined;
  for (const line of block.split(/\r?\n/u)) {
    const arrayItem = /^\s+-\s+(.*)$/u.exec(line);
    if (currentArrayKey !== undefined && arrayItem !== null) {
      const currentValue = fields[currentArrayKey];
      if (Array.isArray(currentValue)) {
        currentValue.push(stripQuotes(arrayItem[1] ?? ""));
      }
      continue;
    }

    currentArrayKey = undefined;
    const field = /^([A-Za-z0-9_-]+):(?:\s*(.*))?$/u.exec(line);
    if (field === null) continue;

    const key = field[1] ?? "";
    const rawValue = field[2] ?? "";
    if (rawValue.trim() === "") {
      fields[key] = [];
      currentArrayKey = key;
      continue;
    }

    fields[key] = stripQuotes(rawValue);
  }

  return fields;
}

function frontmatterString(fields: Record<string, FrontmatterValue>, key: string): string | undefined {
  const value = fields[key];
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function frontmatterArray(fields: Record<string, FrontmatterValue>, key: string): string[] {
  const value = fields[key];
  if (Array.isArray(value)) {
    return value.map((item) => item.trim()).filter((item) => item.length > 0);
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return [value.trim()];
  }
  return [];
}

function fileStem(fileName: string): string {
  return fileName.endsWith(".md") ? fileName.slice(0, -3) : fileName;
}

function normalizeRef(ref: string): string {
  const trimmed = ref.trim();
  return trimmed.endsWith(".md") ? trimmed.slice(0, -3) : trimmed;
}

function compareText(left: string, right: string): number {
  return left.localeCompare(right);
}

function rootPath(pathOps: PathOps, root: string, relativePath: string): string {
  return pathOps.join(root, relativePath);
}

async function readTextOrUndefined(fs: FileSystem, path: string): Promise<string | undefined> {
  try {
    return await fs.readFile(path, "utf-8");
  } catch {
    return undefined;
  }
}

async function readDirOrEmpty(fs: FileSystem, path: string): Promise<string[]> {
  try {
    return (await fs.readdir(path)).slice().sort(compareText);
  } catch {
    return [];
  }
}

async function parseMarkdownDocument(
  input: {
    readonly root: string;
    readonly relativePath: string;
    readonly fallbackTitle: string;
    readonly fs: FileSystem;
    readonly pathOps: PathOps;
  },
): Promise<ParsedDocument | undefined> {
  const markdown = await readTextOrUndefined(input.fs, rootPath(input.pathOps, input.root, input.relativePath));
  if (markdown === undefined) return undefined;

  const fields = parseFrontmatter(markdown);
  const id = fileStem(input.fallbackTitle);
  return {
    id,
    title: frontmatterString(fields, "title") ?? id,
    legend: frontmatterString(fields, "legend"),
    feature: frontmatterString(fields, "feature"),
    kind: frontmatterString(fields, "kind"),
    status: frontmatterString(fields, "status"),
    lane: frontmatterString(fields, "lane"),
    sourceLane: frontmatterString(fields, "source_lane"),
    blockedBy: frontmatterArray(fields, "blocked_by").map(normalizeRef),
    blocking: frontmatterArray(fields, "blocking").map(normalizeRef),
    blockedByExternal: frontmatterArray(fields, "blocked_by_external"),
    sourcePath: input.relativePath,
  };
}

async function readBacklogDocuments(input: BuildBacklogStatusModelInput): Promise<ParsedDocument[]> {
  const backlogRoot = "docs/method/backlog";
  const laneNames = await readDirOrEmpty(input.fs, rootPath(input.pathOps, input.root, backlogRoot));
  const docs: ParsedDocument[] = [];

  for (const laneName of laneNames) {
    const lanePath = input.pathOps.join(backlogRoot, laneName);
    const fileNames = await readDirOrEmpty(input.fs, rootPath(input.pathOps, input.root, lanePath));
    for (const fileName of fileNames.filter((name) => name.endsWith(".md")).sort(compareText)) {
      const doc = await parseMarkdownDocument({
        root: input.root,
        relativePath: input.pathOps.join(lanePath, fileName),
        fallbackTitle: fileName,
        fs: input.fs,
        pathOps: input.pathOps,
      });
      if (doc !== undefined) {
        docs.push(doc);
      }
    }
  }

  return docs;
}

async function readDesignDocuments(input: BuildBacklogStatusModelInput): Promise<ParsedDocument[]> {
  const designRoot = "docs/design";
  const fileNames = await readDirOrEmpty(input.fs, rootPath(input.pathOps, input.root, designRoot));
  const docs: ParsedDocument[] = [];

  for (const fileName of fileNames.filter((name) => name.endsWith(".md")).sort(compareText)) {
    const doc = await parseMarkdownDocument({
      root: input.root,
      relativePath: input.pathOps.join(designRoot, fileName),
      fallbackTitle: fileName,
      fs: input.fs,
      pathOps: input.pathOps,
    });
    if (doc !== undefined) {
      docs.push(doc);
    }
  }

  return docs;
}

async function findRetroPath(
  input: BuildBacklogStatusModelInput,
  id: string,
): Promise<string | undefined> {
  const candidates = [
    input.pathOps.join("docs/method/retro", id, "retro.md"),
    input.pathOps.join("docs/method/retro", id, `${id}.md`),
    input.pathOps.join("docs/method/retro", `${id}.md`),
  ];

  for (const candidate of candidates) {
    const content = await readTextOrUndefined(input.fs, rootPath(input.pathOps, input.root, candidate));
    if (content !== undefined) return candidate;
  }

  return undefined;
}

function backlogStatusFor(
  doc: ParsedDocument,
  actualLane: string,
  knownCardIds: ReadonlySet<string>,
): BacklogStatus {
  if (doc.lane !== undefined && doc.lane !== actualLane) return "stale_metadata";
  if (doc.blockedByExternal.length > 0) return "blocked_external";
  if (doc.blockedBy.some((ref) => knownCardIds.has(ref))) return "blocked_internal";
  if (doc.blockedBy.length > 0) return "unknown";
  return "backlog";
}

function designStatusFor(doc: ParsedDocument, retroPath: string | undefined): BacklogStatus {
  if (retroPath !== undefined || doc.status === "completed") return "completed";
  if (doc.status === "design" || doc.status === undefined) return "active_design";
  return "unknown";
}

function toBacklogItem(
  doc: ParsedDocument,
  actualLane: string,
  knownCardIds: ReadonlySet<string>,
): BacklogStatusItem {
  return {
    id: doc.id,
    title: doc.title,
    legend: doc.legend,
    feature: doc.feature,
    kind: doc.kind,
    lane: actualLane,
    frontmatterLane: doc.lane,
    sourceLane: doc.sourceLane,
    status: backlogStatusFor(doc, actualLane, knownCardIds),
    sourcePath: doc.sourcePath,
    blockedBy: doc.blockedBy,
    blocking: doc.blocking,
    blockedByExternal: doc.blockedByExternal,
    retroPath: undefined,
  };
}

function toDesignItem(
  doc: ParsedDocument,
  retroPath: string | undefined,
): BacklogStatusItem {
  return {
    id: doc.id,
    title: doc.title,
    legend: doc.legend,
    feature: doc.feature,
    kind: doc.kind,
    lane: undefined,
    frontmatterLane: doc.lane,
    sourceLane: doc.sourceLane,
    status: designStatusFor(doc, retroPath),
    sourcePath: doc.sourcePath,
    blockedBy: doc.blockedBy,
    blocking: doc.blocking,
    blockedByExternal: doc.blockedByExternal,
    retroPath,
  };
}

function laneFromBacklogSourcePath(sourcePath: string): string {
  const parts = sourcePath.split("/");
  return parts[3] ?? "unknown";
}

function addDependencyWarnings(
  warnings: BacklogStatusWarning[],
  item: BacklogStatusItem,
  knownIds: ReadonlySet<string>,
): void {
  for (const ref of item.blockedBy) {
    if (!knownIds.has(ref)) {
      warnings.push({
        type: "unresolved_dependency_ref",
        itemId: item.id,
        sourcePath: item.sourcePath,
        field: "blocked_by",
        ref,
        expectedLane: undefined,
        actualLane: undefined,
      });
    }
  }

  for (const ref of item.blocking) {
    if (!knownIds.has(ref)) {
      warnings.push({
        type: "unresolved_dependency_ref",
        itemId: item.id,
        sourcePath: item.sourcePath,
        field: "blocking",
        ref,
        expectedLane: undefined,
        actualLane: undefined,
      });
    }
  }
}

function addLaneWarning(warnings: BacklogStatusWarning[], item: BacklogStatusItem): void {
  if (item.frontmatterLane === undefined || item.lane === undefined || item.frontmatterLane === item.lane) {
    return;
  }

  warnings.push({
    type: "lane_frontmatter_mismatch",
    itemId: item.id,
    sourcePath: item.sourcePath,
    field: undefined,
    ref: undefined,
    expectedLane: item.lane,
    actualLane: item.frontmatterLane,
  });
}

function addCompletedDesignWarning(warnings: BacklogStatusWarning[], item: BacklogStatusItem): void {
  if (item.status !== "completed" || item.retroPath !== undefined) {
    return;
  }

  warnings.push({
    type: "completed_design_missing_retro",
    itemId: item.id,
    sourcePath: item.sourcePath,
    field: undefined,
    ref: undefined,
    expectedLane: undefined,
    actualLane: undefined,
  });
}

function summarize(items: readonly BacklogStatusItem[], warnings: readonly BacklogStatusWarning[]): BacklogStatusSummary {
  const activeBacklogByLane: Record<string, number> = {};
  for (const item of items) {
    if (item.lane === undefined) continue;
    activeBacklogByLane[item.lane] = (activeBacklogByLane[item.lane] ?? 0) + 1;
  }

  return {
    activeBacklogByLane,
    activeDesignCount: items.filter((item) => item.status === "active_design").length,
    completedRetroCount: items.filter((item) => item.status === "completed" && item.retroPath !== undefined).length,
    blockedInternalCount: items.filter((item) => item.status === "blocked_internal").length,
    blockedExternalCount: items.filter((item) => item.status === "blocked_external").length,
    unresolvedDependencyReferenceCount: warnings.filter((warning) => warning.type === "unresolved_dependency_ref").length,
  };
}

export async function buildBacklogStatusModel(input: BuildBacklogStatusModelInput): Promise<BacklogStatusModel> {
  const backlogDocs = await readBacklogDocuments(input);
  const designDocs = await readDesignDocuments(input);
  const knownIds = new Set<string>([
    ...backlogDocs.map((doc) => doc.id),
    ...designDocs.map((doc) => doc.id),
  ]);

  const backlogItems = backlogDocs.map((doc) => {
    return toBacklogItem(doc, laneFromBacklogSourcePath(doc.sourcePath), knownIds);
  });

  const designItems: BacklogStatusItem[] = [];
  for (const doc of designDocs) {
    designItems.push(toDesignItem(doc, await findRetroPath(input, doc.id)));
  }

  const items = [...backlogItems, ...designItems].sort((left, right) => {
    return compareText(left.sourcePath, right.sourcePath);
  });
  const warnings: BacklogStatusWarning[] = [];

  for (const item of items) {
    addDependencyWarnings(warnings, item, knownIds);
    addLaneWarning(warnings, item);
    addCompletedDesignWarning(warnings, item);
  }

  warnings.sort((left, right) => {
    return compareText(`${left.type}:${left.sourcePath}:${left.ref ?? ""}`, `${right.type}:${right.sourcePath}:${right.ref ?? ""}`);
  });

  return {
    summary: summarize(items, warnings),
    items,
    warnings,
  };
}
