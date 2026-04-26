#!/usr/bin/env tsx
import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

export type DependencyKind = "blocked_by" | "blocking" | "blocked_by_external";

type FrontmatterValue = string | string[];

interface MutableDependencyEdge {
  readonly from: string;
  readonly to: string;
  readonly kinds: Set<DependencyKind>;
  external: boolean;
  unresolved: boolean;
}

export interface BacklogCard {
  readonly id: string;
  readonly title: string;
  readonly lane: string;
  readonly legend: string | undefined;
  readonly effort: string | undefined;
  readonly filePath: string;
  readonly blockedBy: readonly string[];
  readonly blocking: readonly string[];
  readonly blockedByExternal: readonly string[];
}

export interface DependencyEdge {
  readonly from: string;
  readonly to: string;
  readonly kinds: readonly DependencyKind[];
  readonly external: boolean;
  readonly unresolved: boolean;
}

export interface UnresolvedDependencyReference {
  readonly sourceCardId: string;
  readonly field: "blocked_by" | "blocking";
  readonly ref: string;
}

export interface BacklogDagModel {
  readonly cards: readonly BacklogCard[];
  readonly lanes: readonly string[];
  readonly edges: readonly DependencyEdge[];
  readonly externalRefs: readonly string[];
  readonly unresolvedRefs: readonly UnresolvedDependencyReference[];
}

export interface WriteBacklogDagResult {
  readonly cardCount: number;
  readonly edgeCount: number;
  readonly externalRefCount: number;
  readonly unresolvedRefs: readonly UnresolvedDependencyReference[];
  readonly dotPath: string;
  readonly svgPath: string;
}

const LANE_ORDER = ["v0.7.0", "bad-code", "cool-ideas"];

function compareText(left: string, right: string): number {
  return left.localeCompare(right);
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
  if (!markdown.startsWith("---\n")) {
    return undefined;
  }

  const end = markdown.indexOf("\n---", 4);
  if (end === -1) {
    return undefined;
  }

  return markdown.slice(4, end);
}

export function parseFrontmatter(markdown: string): Record<string, FrontmatterValue> {
  const block = extractFrontmatter(markdown);
  const fields: Record<string, FrontmatterValue> = {};
  if (block === undefined) {
    return fields;
  }

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
    if (field === null) {
      continue;
    }

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

function frontmatterString(
  fields: Record<string, FrontmatterValue>,
  key: string,
  fallback: string,
): string {
  const value = fields[key];
  return typeof value === "string" ? value : fallback;
}

function frontmatterOptionalString(
  fields: Record<string, FrontmatterValue>,
  key: string,
): string | undefined {
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

export function parseBacklogCardMarkdown(
  markdown: string,
  filePath: string,
  fallbackLane: string,
): BacklogCard {
  const fields = parseFrontmatter(markdown);
  const id = path.basename(filePath, ".md");
  return {
    id,
    title: frontmatterString(fields, "title", id),
    lane: frontmatterString(fields, "lane", fallbackLane),
    legend: frontmatterOptionalString(fields, "legend"),
    effort: frontmatterOptionalString(fields, "effort"),
    filePath,
    blockedBy: frontmatterArray(fields, "blocked_by"),
    blocking: frontmatterArray(fields, "blocking"),
    blockedByExternal: frontmatterArray(fields, "blocked_by_external"),
  };
}

export function readBacklogCards(backlogRoot: string): BacklogCard[] {
  const laneNames = fs
    .readdirSync(backlogRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort(compareLanes);

  const cards: BacklogCard[] = [];
  for (const laneName of laneNames) {
    const laneRoot = path.join(backlogRoot, laneName);
    const cardFiles = fs
      .readdirSync(laneRoot, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => path.join(laneRoot, entry.name))
      .sort(compareText);

    for (const cardFile of cardFiles) {
      cards.push(parseBacklogCardMarkdown(fs.readFileSync(cardFile, "utf8"), cardFile, laneName));
    }
  }

  return cards;
}

function compareLanes(left: string, right: string): number {
  const leftIndex = LANE_ORDER.indexOf(left);
  const rightIndex = LANE_ORDER.indexOf(right);
  if (leftIndex !== -1 || rightIndex !== -1) {
    return (leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex)
      - (rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex);
  }

  return compareText(left, right);
}

function normalizeRef(ref: string): string {
  const trimmed = ref.trim();
  return trimmed.endsWith(".md") ? trimmed.slice(0, -3) : trimmed;
}

function sanitizeDotId(value: string): string {
  const sanitized = value.replace(/[^A-Za-z0-9_]/gu, "_");
  return /^[0-9]/u.test(sanitized) ? `_${sanitized}` : sanitized;
}

export function cardNodeId(card: BacklogCard): string {
  return sanitizeDotId(`${card.lane}_${card.id}`);
}

function externalNodeId(ref: string): string {
  return sanitizeDotId(`external_${ref}`);
}

function unresolvedNodeId(ref: string): string {
  return sanitizeDotId(`unresolved_${ref}`);
}

function edgeKey(from: string, to: string): string {
  return `${from}\0${to}`;
}

function addEdge(
  edges: Map<string, MutableDependencyEdge>,
  from: string,
  to: string,
  kind: DependencyKind,
  options: { readonly external?: boolean; readonly unresolved?: boolean } = {},
): void {
  const key = edgeKey(from, to);
  const existing = edges.get(key);
  if (existing !== undefined) {
    existing.kinds.add(kind);
    existing.external = existing.external || options.external === true;
    existing.unresolved = existing.unresolved || options.unresolved === true;
    return;
  }

  edges.set(key, {
    from,
    to,
    kinds: new Set([kind]),
    external: options.external === true,
    unresolved: options.unresolved === true,
  });
}

export function buildBacklogDagModel(cards: readonly BacklogCard[]): BacklogDagModel {
  const cardsById = new Map(cards.map((card) => [card.id, card]));
  const edges = new Map<string, MutableDependencyEdge>();
  const externalRefs = new Set<string>();
  const unresolvedRefs: UnresolvedDependencyReference[] = [];

  for (const card of cards) {
    const cardId = cardNodeId(card);

    for (const ref of card.blockedBy.map(normalizeRef)) {
      const dependency = cardsById.get(ref);
      if (dependency === undefined) {
        unresolvedRefs.push({ sourceCardId: card.id, field: "blocked_by", ref });
        addEdge(edges, unresolvedNodeId(ref), cardId, "blocked_by", { unresolved: true });
        continue;
      }

      addEdge(edges, cardNodeId(dependency), cardId, "blocked_by");
    }

    for (const ref of card.blocking.map(normalizeRef)) {
      const dependent = cardsById.get(ref);
      if (dependent === undefined) {
        unresolvedRefs.push({ sourceCardId: card.id, field: "blocking", ref });
        addEdge(edges, cardId, unresolvedNodeId(ref), "blocking", { unresolved: true });
        continue;
      }

      addEdge(edges, cardId, cardNodeId(dependent), "blocking");
    }

    for (const ref of card.blockedByExternal.map(normalizeRef)) {
      externalRefs.add(ref);
      addEdge(edges, externalNodeId(ref), cardId, "blocked_by_external", { external: true });
    }
  }

  const lanes = [...new Set(cards.map((card) => card.lane))].sort(compareLanes);
  const renderedEdges = [...edges.values()]
    .map((edge): DependencyEdge => ({
      from: edge.from,
      to: edge.to,
      kinds: [...edge.kinds].sort(compareDependencyKinds),
      external: edge.external,
      unresolved: edge.unresolved,
    }))
    .sort((left, right) => {
      const fromComparison = compareText(left.from, right.from);
      if (fromComparison !== 0) {
        return fromComparison;
      }

      return compareText(left.to, right.to);
    });

  return {
    cards: [...cards].sort((left, right) => compareText(left.id, right.id)),
    lanes,
    edges: renderedEdges,
    externalRefs: [...externalRefs].sort(compareText),
    unresolvedRefs: unresolvedRefs.sort((left, right) => {
      const sourceComparison = compareText(left.sourceCardId, right.sourceCardId);
      if (sourceComparison !== 0) {
        return sourceComparison;
      }

      return compareText(left.ref, right.ref);
    }),
  };
}

function compareDependencyKinds(left: DependencyKind, right: DependencyKind): number {
  const order: readonly DependencyKind[] = ["blocked_by", "blocking", "blocked_by_external"];
  return order.indexOf(left) - order.indexOf(right);
}

function dotString(value: string): string {
  return `"${value.replaceAll("\\", "\\\\").replaceAll("\"", "\\\"")}"`;
}

function formatNodeLabel(card: BacklogCard): string {
  const base = card.id.replaceAll("_", "-");
  return card.effort === undefined ? base : `${base} - ${card.effort}`;
}

function laneFillColor(lane: string): string {
  if (lane === "v0.7.0") {
    return "#FFA07A";
  }

  if (lane === "bad-code") {
    return "#F6B3B3";
  }

  if (lane === "cool-ideas") {
    return "#D4E8F7";
  }

  return "#E5E7EB";
}

function lanePenWidth(lane: string): number {
  return lane === "cool-ideas" ? 1 : 2;
}

function laneLabel(lane: string, cards: readonly BacklogCard[]): string {
  if (lane === "cool-ideas") {
    return `Cool Ideas (${String(cards.length)})`;
  }

  return `${lane} (${String(cards.length)})`;
}

export function renderBacklogDagDot(model: BacklogDagModel): string {
  const lines: string[] = [
    "digraph backlog {",
    "  rankdir=TB",
    "  fontname=\"Helvetica\"",
    "  label=\"Active backlog graph generated from docs/method/backlog/*/*.md\"",
    "  labelloc=t",
    "  fontsize=12",
    "  node [shape=box style=\"rounded,filled\" fontname=\"Helvetica\" fontsize=8 margin=\"0.1,0.05\" height=0.35]",
    "  edge [color=\"#666666\" arrowsize=0.5 fontname=\"Helvetica\" fontsize=7]",
    "  newrank=true",
    "  ranksep=0.55",
    "  nodesep=0.2",
    "",
  ];

  for (const lane of model.lanes) {
    const laneCards = model.cards
      .filter((card) => card.lane === lane)
      .sort((left, right) => compareText(left.id, right.id));

    lines.push(`  subgraph cluster_${sanitizeDotId(lane)} {`);
    lines.push(`    label=${dotString(laneLabel(lane, laneCards))} labeljust=l fontsize=9 fontcolor="#555555"`);
    lines.push("    style=rounded color=\"#cccccc\" bgcolor=\"#fafafa\"");
    for (const card of laneCards) {
      lines.push(
        `    ${cardNodeId(card)} [label=${dotString(formatNodeLabel(card))} fillcolor=${dotString(laneFillColor(card.lane))} penwidth=${String(lanePenWidth(card.lane))}]`,
      );
    }
    lines.push("  }");
    lines.push("");
  }

  if (model.externalRefs.length > 0) {
    lines.push("  subgraph cluster_external {");
    lines.push("    label=\"External blockers\" labeljust=l fontsize=9 fontcolor=\"#555555\"");
    lines.push("    style=rounded color=\"#cccccc\" bgcolor=\"#f8fbff\"");
    for (const ref of model.externalRefs) {
      lines.push(`    ${externalNodeId(ref)} [label=${dotString(ref)} fillcolor="#E8F2FF" penwidth=1]`);
    }
    lines.push("  }");
    lines.push("");
  }

  const unresolvedRefs = [...new Set(model.unresolvedRefs.map((ref) => ref.ref))].sort(compareText);
  if (unresolvedRefs.length > 0) {
    lines.push("  subgraph cluster_unresolved {");
    lines.push("    label=\"Unresolved internal refs\" labeljust=l fontsize=9 fontcolor=\"#555555\"");
    lines.push("    style=\"rounded,dashed\" color=\"#cc3333\" bgcolor=\"#fff7f7\"");
    for (const ref of unresolvedRefs) {
      lines.push(`    ${unresolvedNodeId(ref)} [label=${dotString(`missing: ${ref}`)} fillcolor="#F2F2F2" penwidth=1 style="rounded,dashed,filled"]`);
    }
    lines.push("  }");
    lines.push("");
  }

  for (const edge of model.edges) {
    const attributes = [`label=${dotString(edge.kinds.join("/"))}`];
    if (edge.external) {
      attributes.push("style=dashed", "color=\"#4477AA\"");
    }
    if (edge.unresolved) {
      attributes.push("style=dashed", "color=\"#CC3333\"");
    }
    lines.push(`  ${edge.from} -> ${edge.to} [${attributes.join(" ")}]`);
  }

  lines.push("");
  lines.push("  subgraph cluster_legend {");
  lines.push("    label=\"Legend\" labeljust=l fontsize=8 fontcolor=\"#aaaaaa\"");
  lines.push("    style=rounded color=\"#dddddd\"");
  lines.push("    node [fontsize=7 width=1.4]");
  lines.push("    leg_v07 [label=\"v0.7.0\" fillcolor=\"#FFA07A\" penwidth=2]");
  lines.push("    leg_bad [label=\"bad-code\" fillcolor=\"#F6B3B3\" penwidth=2]");
  lines.push("    leg_idea [label=\"cool-ideas\" fillcolor=\"#D4E8F7\" penwidth=1]");
  lines.push("    leg_external [label=\"external blocker\" fillcolor=\"#E8F2FF\" penwidth=1]");
  lines.push("    leg_unresolved [label=\"unresolved ref\" fillcolor=\"#F2F2F2\" penwidth=1 style=\"rounded,dashed,filled\"]");
  lines.push("    leg_v07 -> leg_bad [style=invis]");
  lines.push("    leg_bad -> leg_idea [style=invis]");
  lines.push("    leg_idea -> leg_external [style=invis]");
  lines.push("    leg_external -> leg_unresolved [style=invis]");
  lines.push("  }");
  lines.push("}");

  return `${lines.join("\n")}\n`;
}

export function writeBacklogDag(repoRoot: string): WriteBacklogDagResult {
  const backlogRoot = path.join(repoRoot, "docs", "method", "backlog");
  const dotPath = path.join(backlogRoot, "dependency-dag.dot");
  const svgPath = path.join(backlogRoot, "dependency-dag.svg");
  const model = buildBacklogDagModel(readBacklogCards(backlogRoot));

  fs.writeFileSync(dotPath, renderBacklogDagDot(model));
  execFileSync("dot", ["-Tsvg", dotPath, "-o", svgPath], {
    cwd: repoRoot,
    stdio: "inherit",
  });

  return {
    cardCount: model.cards.length,
    edgeCount: model.edges.length,
    externalRefCount: model.externalRefs.length,
    unresolvedRefs: model.unresolvedRefs,
    dotPath,
    svgPath,
  };
}

function main(): void {
  const repoRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
  const result = writeBacklogDag(repoRoot);
  console.log(`backlog DAG: wrote ${path.relative(repoRoot, result.dotPath)}`);
  console.log(`backlog DAG: wrote ${path.relative(repoRoot, result.svgPath)}`);
  console.log(
    `backlog DAG: ${String(result.cardCount)} cards, ${String(result.edgeCount)} edges, ${String(result.externalRefCount)} external blockers`,
  );

  if (result.unresolvedRefs.length > 0) {
    console.log("backlog DAG: unresolved internal dependency refs:");
    for (const ref of result.unresolvedRefs) {
      console.log(`- ${ref.sourceCardId} ${ref.field} ${ref.ref}`);
    }
  }
}

const entrypoint = process.argv[1];
if (entrypoint !== undefined && path.resolve(entrypoint) === fileURLToPath(import.meta.url)) {
  main();
}
