import type { ToolContext } from "../context.js";
import {
  evaluatePrecisionPolicy,
  loadFileContent,
  type PrecisionPolicyRefusal,
} from "./precision-live.js";
import type { PrecisionSymbolMatch } from "./precision-match.js";

export interface PrecisionVisibilityResult {
  readonly visibleMatches: PrecisionSymbolMatch[];
  readonly fileCache: Map<string, string>;
  readonly firstRefusal:
    | PrecisionPolicyRefusal
    | undefined;
}

export async function filterVisiblePrecisionMatches(
  ctx: ToolContext,
  matches: readonly PrecisionSymbolMatch[],
  ref?: string,
): Promise<PrecisionVisibilityResult> {
  const visibleMatches: PrecisionSymbolMatch[] = [];
  const fileCache = new Map<string, string>();
  let firstRefusal: PrecisionPolicyRefusal | undefined;

  for (const match of matches) {
    let content = fileCache.get(match.path);
    if (content === undefined) {
      const loaded = await loadFileContent(ctx, match.path, ref);
      if (loaded === null) continue;
      fileCache.set(match.path, loaded);
      content = loaded;
    }

    const refusal = evaluatePrecisionPolicy(ctx, match.path, content);
    if (refusal !== null) {
      firstRefusal ??= refusal;
      continue;
    }
    visibleMatches.push(match);
  }

  return { visibleMatches, fileCache, firstRefusal };
}
