import type { GitClient } from "../ports/git.js";
import type { PathOps } from "../ports/paths.js";
import type {
  DeadSymbolsReadingPayload,
  DeadSymbolsReadingRequest,
  GitWarpEvidence,
  StructuralReadingPort,
  StructuralReadingResult,
  SymbolReferenceReadingPayload,
  SymbolReferenceReadingRequest,
  TranslatedSubstrateEvidence,
} from "../ports/structural-reading.js";
import type { ReferenceCountResult } from "../operations/structural-review.js";
import {
  countNamedImportReferencesAtRef as defaultCountNamedImportReferencesAtRef,
} from "../operations/import-reference-impact.js";
import {
  countSymbolReferencesFromGraph as defaultCountSymbolReferencesFromGraph,
} from "./warp-reference-count.js";
import {
  findDeadSymbols as defaultFindDeadSymbols,
  type DeadSymbol,
} from "./dead-symbols.js";
import type { WarpContext } from "./context.js";

export interface GitWarpStructuralReadingPortDeps {
  readonly projectRoot: string;
  readonly git: GitClient;
  readonly pathOps: PathOps;
  readonly getWarp: () => Promise<WarpContext>;
  readonly countSymbolReferencesFromGraph?: (
    ctx: WarpContext,
    symbolName: string,
    filePath?: string,
  ) => Promise<{ readonly symbol: string; readonly referenceCount: number; readonly referencingFiles: readonly string[] }>;
  readonly countNamedImportReferencesAtRef?: (opts: {
    readonly cwd: string;
    readonly git: GitClient;
    readonly pathOps: PathOps;
    readonly symbolName: string;
    readonly filePath: string;
    readonly ref: string;
  }) => Promise<ReferenceCountResult>;
  readonly findDeadSymbols?: (
    ctx: WarpContext,
    options?: DeadSymbolsReadingRequest,
  ) => Promise<readonly DeadSymbol[]>;
}

function translatedGitWarpEvidence(
  deps: Pick<GitWarpStructuralReadingPortDeps, "projectRoot">,
  basis: { readonly ref?: string | undefined; readonly maxCommits?: number | undefined },
  evidence: GitWarpEvidence,
): TranslatedSubstrateEvidence {
  return {
    kind: "translated-substrate",
    substrate: "git-warp",
    basis: {
      kind: "git-committed-history",
      projectRoot: deps.projectRoot,
      ...(basis.ref !== undefined ? { ref: basis.ref } : {}),
      ...(basis.maxCommits !== undefined ? { maxCommits: basis.maxCommits } : {}),
    },
    evidence,
    nativeContinuumWitness: false,
  };
}

function symbolReferencePayload(
  symbolName: string,
  result: ReferenceCountResult | { readonly symbol: string; readonly referenceCount: number; readonly referencingFiles: readonly string[] },
): SymbolReferenceReadingPayload {
  return {
    symbol: "symbol" in result ? result.symbol : symbolName,
    referenceCount: result.referenceCount,
    referencingFiles: result.referencingFiles,
  };
}

export function createGitWarpStructuralReadingPort(
  deps: GitWarpStructuralReadingPortDeps,
): StructuralReadingPort {
  const countSymbolReferencesFromGraph =
    deps.countSymbolReferencesFromGraph ?? defaultCountSymbolReferencesFromGraph;
  const countNamedImportReferencesAtRef =
    deps.countNamedImportReferencesAtRef ?? defaultCountNamedImportReferencesAtRef;
  const findDeadSymbols = deps.findDeadSymbols ?? defaultFindDeadSymbols;

  return {
    async countSymbolReferences(
      request: SymbolReferenceReadingRequest,
    ): Promise<StructuralReadingResult<SymbolReferenceReadingPayload>> {
      const ref = request.ref ?? "HEAD";
      const warp = await deps.getWarp();
      const graphResult = await countSymbolReferencesFromGraph(
        warp,
        request.symbolName,
        request.filePath,
      );

      let payload = symbolReferencePayload(request.symbolName, graphResult);
      let source: "warp-graph" | "committed-import-scan" = "warp-graph";

      if (graphResult.referenceCount === 0) {
        try {
          const fallbackResult = await countNamedImportReferencesAtRef({
            cwd: deps.projectRoot,
            git: deps.git,
            pathOps: deps.pathOps,
            symbolName: request.symbolName,
            filePath: request.filePath,
            ref,
          });
          if (fallbackResult.referenceCount > 0) {
            payload = symbolReferencePayload(request.symbolName, fallbackResult);
            source = "committed-import-scan";
          }
        } catch {
          payload = symbolReferencePayload(request.symbolName, graphResult);
        }
      }

      return {
        kind: "symbol-reference-count",
        freshness: "current",
        residualPosture: "complete",
        payload,
        evidence: translatedGitWarpEvidence(
          deps,
          { ref },
          {
            kind: "symbol-reference-count",
            source,
            symbolName: request.symbolName,
            filePath: request.filePath,
          },
        ),
      };
    },

    async findDeadSymbols(
      request: DeadSymbolsReadingRequest = {},
    ): Promise<StructuralReadingResult<DeadSymbolsReadingPayload>> {
      const warp = await deps.getWarp();
      const options = request.maxCommits !== undefined
        ? { maxCommits: request.maxCommits }
        : undefined;
      const symbols = await findDeadSymbols(warp, options);

      return {
        kind: "dead-symbols",
        freshness: "current",
        residualPosture: "complete",
        payload: {
          symbols,
          total: symbols.length,
        },
        evidence: translatedGitWarpEvidence(
          deps,
          { maxCommits: request.maxCommits },
          {
            kind: "dead-symbols",
            source: "warp-graph",
            ...(request.maxCommits !== undefined ? { maxCommits: request.maxCommits } : {}),
          },
        ),
      };
    },
  };
}
