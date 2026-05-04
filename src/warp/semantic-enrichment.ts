import type { PatchBuilderV2 } from "@git-stunts/git-warp";
import type {
  SemanticEnrichmentAvailableResult,
  SemanticEnrichmentFact,
} from "../ports/semantic-enrichment.js";

export interface PreparedSemanticFacts {
  readonly acceptedFacts: readonly SemanticEnrichmentFact[];
  readonly factsRejected: number;
}

export function prepareSemanticFacts(input: {
  readonly filePath: string;
  readonly currentSymbolIds: ReadonlySet<string>;
  readonly result: SemanticEnrichmentAvailableResult;
  readonly maxFacts: number;
}): PreparedSemanticFacts {
  const acceptedFacts: SemanticEnrichmentFact[] = [];
  let factsRejected = input.result.factsRejected ?? 0;

  for (const [index, fact] of input.result.facts.entries()) {
    if (index >= input.maxFacts) {
      factsRejected++;
      continue;
    }

    if (!isAnchoredFact(input.filePath, input.currentSymbolIds, fact)) {
      factsRejected++;
      continue;
    }

    acceptedFacts.push(fact);
  }

  return { acceptedFacts, factsRejected };
}

export function emitSemanticFacts(
  patch: PatchBuilderV2,
  facts: readonly SemanticEnrichmentFact[],
): void {
  for (const fact of facts) {
    switch (fact.kind) {
      case "call":
        patch.addEdge(fact.fromSymbolId, fact.toSymbolId, "calls");
        break;
      case "typeof":
        patch.setProperty(fact.symbolId, "typeof", fact.typeName);
        break;
    }
  }
}

function isAnchoredFact(
  filePath: string,
  currentSymbolIds: ReadonlySet<string>,
  fact: SemanticEnrichmentFact,
): boolean {
  switch (fact.kind) {
    case "call":
      return isCurrentFileSymbol(filePath, currentSymbolIds, fact.fromSymbolId) &&
        isCurrentFileSymbol(filePath, currentSymbolIds, fact.toSymbolId);
    case "typeof":
      return fact.typeName.trim().length > 0 &&
        isCurrentFileSymbol(filePath, currentSymbolIds, fact.symbolId);
  }
}

function isCurrentFileSymbol(
  filePath: string,
  currentSymbolIds: ReadonlySet<string>,
  symbolId: string,
): boolean {
  return symbolId.startsWith(`sym:${filePath}:`) && currentSymbolIds.has(symbolId);
}
