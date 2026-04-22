/**
 * Stale Docs Checker — cross-references doc symbol mentions against
 * the WARP graph to detect documentation that may be outdated.
 *
 * Walks markdown for backtick-quoted identifiers and code block
 * contents. For each referenced symbol, queries the WARP graph to
 * determine whether the symbol changed after the doc was last modified.
 *
 * Also detects version number drift between package.json and CHANGELOG.
 */

import type { WarpContext } from "./context.js";
import { symbolTimeline } from "./symbol-timeline.js";
import { observeGraph } from "./context.js";


// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A symbol in a doc that is stale relative to the WARP graph. */
export interface StaleSymbolEntry {
  readonly symbol: string;
  readonly changeKind: "changed" | "removed";
  readonly lastChangeSha: string;
}

/** Result of checking a single doc for staleness. */
export interface StaleDocReport {
  readonly docPath: string;
  /** Symbols referenced in the doc that changed after the doc was last modified. */
  readonly staleSymbols: readonly StaleSymbolEntry[];
  /** Symbols referenced in the doc that do not exist in the WARP graph. */
  readonly unknownSymbols: readonly string[];
}

/** Result of checking version drift between package.json and CHANGELOG. */
export interface VersionDriftReport {
  readonly drifted: boolean;
  readonly packageVersion: string;
  readonly changelogVersion: string | null;
}

// ---------------------------------------------------------------------------
// Symbol extraction
// ---------------------------------------------------------------------------

/** Match single-backtick content that looks like an identifier (no spaces, no dots). */
const INLINE_CODE_RE = /`([A-Za-z_$][A-Za-z0-9_$]*)`/g;

/**
 * Match identifiers inside fenced code blocks.
 * We look for function/class/const/let/var/type/interface/import declarations
 * and bare identifiers that look like symbol names.
 */
const CODE_BLOCK_RE = /```[\s\S]*?```/g;

/**
 * Inside code blocks, match identifiers from destructured imports/exports
 * and direct declarations.
 */
const CODE_BLOCK_DECL_RE =
  /(?:import|export|function|class|const|let|var|type|interface)\s+([A-Za-z_$][A-Za-z0-9_$]*)/g;

/**
 * Match identifiers inside braces of import/export destructuring.
 * e.g. import { evaluatePolicy, runCheck } from '...'
 */
const DESTRUCTURE_RE = /(?:import|export)\s+\{([^}]+)\}/g;
const DESTRUCTURE_IDENT_RE = /([A-Za-z_$][A-Za-z0-9_$]*)/g;

/**
 * Extract symbol name references from markdown content.
 *
 * Sources:
 * 1. Backtick-quoted identifiers (single backtick, must be valid JS/TS identifier)
 * 2. Declaration identifiers inside fenced code blocks
 *
 * Returns a deduplicated array of symbol names.
 */
export function extractDocSymbolReferences(markdown: string): string[] {
  const symbols = new Set<string>();

  // 1. Inline backtick identifiers
  let match: RegExpExecArray | null;
  while ((match = INLINE_CODE_RE.exec(markdown)) !== null) {
    if (match[1] !== undefined) symbols.add(match[1]);
  }

  // 2. Identifiers inside fenced code blocks
  for (const blockMatch of markdown.matchAll(CODE_BLOCK_RE)) {
    const block = blockMatch[0];

    // Direct declarations: function foo, class Bar, etc.
    while ((match = CODE_BLOCK_DECL_RE.exec(block)) !== null) {
      if (match[1] !== undefined) symbols.add(match[1]);
    }

    // Destructured imports/exports: import { foo, bar } from ...
    for (const destructMatch of block.matchAll(DESTRUCTURE_RE)) {
      const inner = destructMatch[1];
      if (inner === undefined) continue;
      let identMatch: RegExpExecArray | null;
      while ((identMatch = DESTRUCTURE_IDENT_RE.exec(inner)) !== null) {
        // Skip "as" keyword in "foo as bar" patterns — keep both identifiers
        if (identMatch[1] !== "as") {
          symbols.add(identMatch[1]);
        }
      }
    }
  }

  return [...symbols];
}

// ---------------------------------------------------------------------------
// Stale doc check
// ---------------------------------------------------------------------------

/**
 * Resolve the tick (lamport clock) for a given commit SHA.
 * Returns null if the commit is not in the graph.
 */
async function getCommitTick(
  ctx: WarpContext,
  sha: string,
): Promise<number | null> {
  const obs = await observeGraph(ctx, { match: "commit:*", expose: ["sha", "tick"] });
  const props = await obs.getNodeProps(`commit:${sha}`);
  return typeof props?.["tick"] === "number" ? props["tick"] : null;
}

/**
 * Check a markdown document for stale symbol references.
 *
 * @param ctx - WARP context
 * @param docPath - relative path of the doc (for the report)
 * @param docCommitSha - SHA of the commit when the doc was last modified
 * @param docContent - raw markdown content of the doc
 */
export async function checkStaleDocs(
  ctx: WarpContext,
  docPath: string,
  docCommitSha: string,
  docContent: string,
): Promise<StaleDocReport> {
  const symbolNames = extractDocSymbolReferences(docContent);
  const docTick = await getCommitTick(ctx, docCommitSha);

  const staleSymbols: StaleSymbolEntry[] = [];
  const unknownSymbols: string[] = [];

  for (const symbolName of symbolNames) {
    const timeline = await symbolTimeline(ctx, symbolName);

    if (timeline.versions.length === 0) {
      unknownSymbols.push(symbolName);
      continue;
    }

    // If we cannot resolve the doc commit tick, we cannot compare —
    // treat the doc as fresh (conservative).
    if (docTick === null) continue;

    // Check if any version has a tick after the doc's commit tick.
    // symbolTimeline returns versions in tick order with accurate
    // per-commit data (unlike commitsForSymbol which returns HEAD
    // signature for all entries).
    for (const version of timeline.versions) {
      if (version.tick > docTick) {
        if (version.changeKind === "changed" || version.changeKind === "removed") {
          staleSymbols.push({
            symbol: symbolName,
            changeKind: version.changeKind,
            lastChangeSha: version.sha,
          });
          break;
        }
      }
    }
  }

  return { docPath, staleSymbols, unknownSymbols };
}

// ---------------------------------------------------------------------------
// Version drift check
// ---------------------------------------------------------------------------

/** Match the first semver-looking heading in a CHANGELOG. */
const CHANGELOG_VERSION_RE = /^##\s+\[?v?(\d+\.\d+\.\d+(?:-[A-Za-z0-9.]+)?)\]?/m;

/**
 * Check whether the latest version in a CHANGELOG matches
 * the version in package.json.
 */
export function checkVersionDrift(
  packageVersion: string,
  changelogContent: string,
): VersionDriftReport {
  const match = CHANGELOG_VERSION_RE.exec(changelogContent);
  const changelogVersion = match?.[1] ?? null;

  return {
    drifted: changelogVersion !== packageVersion,
    packageVersion,
    changelogVersion,
  };
}
