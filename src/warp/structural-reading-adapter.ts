import type { GitClient } from "../ports/git.js";
import type { PathOps } from "../ports/paths.js";
import type {
  DeadSymbolsReadingPayload,
  DeadSymbolsReadingRequest,
  GitWarpEvidence,
  StructuralReadingResidualPosture,
  StructuralReadingPort,
  StructuralReadingResult,
  SymbolReferenceReadingPayload,
  SymbolReferenceReadingRequest,
  TranslatedSubstrateEvidence,
} from "../ports/structural-reading.js";
import type { ReferenceCountResult } from "../operations/structural-review.js";
import {
  analyzeCommittedReferencesAtRef,
  type CommittedReferenceAnalysis,
} from "./committed-reference-scan.js";
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
  readonly countCommittedReferencesAtRef?: (opts: {
    readonly cwd: string;
    readonly git: GitClient;
    readonly pathOps: PathOps;
    readonly symbolName: string;
    readonly filePath: string;
    readonly ref: string;
    readonly candidateTargetFilePaths?: readonly string[] | undefined;
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
    evidenceLabel: "fallback-translated",
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

function normalizeRefOrDefault(ref: string | undefined): string {
  const normalized = ref?.trim();
  return normalized === undefined || normalized.length === 0 ? "HEAD" : normalized;
}

function fallbackReason(error: unknown): string {
  if (error instanceof Error) return error.message.trim() === "" ? error.name : error.message;
  if (typeof error === "string" && error.trim() !== "") return error;
  return "Unknown committed-reference scan failure";
}

function symbolReferencePayload(
  symbolName: string,
  result: ReferenceCountResult | { readonly symbol: string; readonly referenceCount: number; readonly referencingFiles: readonly string[] },
): SymbolReferenceReadingPayload {
  const payload = {
    symbol: "symbol" in result ? result.symbol : symbolName,
    referenceCount: result.referenceCount,
    referencingFiles: result.referencingFiles,
  };
  return "symbol" in result
    ? payload
    : {
        ...payload,
        referenceWarnings: result.warnings ?? [],
        referenceConfidence: result.confidence ?? "complete",
      };
}

export function createGitWarpStructuralReadingPort(
  deps: GitWarpStructuralReadingPortDeps,
): StructuralReadingPort {
  const countSymbolReferencesFromGraph =
    deps.countSymbolReferencesFromGraph ?? defaultCountSymbolReferencesFromGraph;
  const findDeadSymbols = deps.findDeadSymbols ?? defaultFindDeadSymbols;
  const scopedAnalyses = new WeakMap<readonly string[], Map<string, Promise<CommittedReferenceAnalysis>>>();
  const countCommittedReferencesAtRef = deps.countCommittedReferencesAtRef ?? (async (request) => {
    const candidateTargetFilePaths = request.candidateTargetFilePaths ?? [request.filePath];
    let analysis: Promise<CommittedReferenceAnalysis>;
    if (request.candidateTargetFilePaths === undefined) {
      analysis = analyzeCommittedReferencesAtRef({
        cwd: request.cwd,
        git: request.git,
        pathOps: request.pathOps,
        ref: request.ref,
        candidateTargetFilePaths,
      });
    } else {
      let byRef = scopedAnalyses.get(request.candidateTargetFilePaths);
      if (byRef === undefined) {
        byRef = new Map();
        scopedAnalyses.set(request.candidateTargetFilePaths, byRef);
      }
      const existing = byRef.get(request.ref);
      if (existing !== undefined) analysis = existing;
      else {
        analysis = analyzeCommittedReferencesAtRef({
          cwd: request.cwd,
          git: request.git,
          pathOps: request.pathOps,
          ref: request.ref,
          candidateTargetFilePaths,
        });
        byRef.set(request.ref, analysis);
      }
    }
    return (await analysis).countReferences(request.symbolName, request.filePath);
  });

  return {
    async countSymbolReferences(
      request: SymbolReferenceReadingRequest,
    ): Promise<StructuralReadingResult<SymbolReferenceReadingPayload>> {
      const ref = normalizeRefOrDefault(request.ref);

      let payload: SymbolReferenceReadingPayload;
      let source: "warp-graph" | "committed-reference-scan";
      let residualPosture: StructuralReadingResidualPosture;
      let committedScanFailure: string | undefined;

      try {
        const committedResult = await countCommittedReferencesAtRef({
          cwd: deps.projectRoot,
          git: deps.git,
          pathOps: deps.pathOps,
          symbolName: request.symbolName,
          filePath: request.filePath,
          ref,
          ...(request.candidateTargetFilePaths !== undefined
            ? { candidateTargetFilePaths: request.candidateTargetFilePaths }
            : {}),
        });
        payload = symbolReferencePayload(request.symbolName, committedResult);
        source = "committed-reference-scan";
        residualPosture = committedResult.confidence === "partial" ? "partial" : "complete";
      } catch (error) {
        committedScanFailure = fallbackReason(error);
        const warp = await deps.getWarp();
        const graphResult = await countSymbolReferencesFromGraph(
          warp,
          request.symbolName,
          request.filePath,
        );
        payload = symbolReferencePayload(request.symbolName, graphResult);
        source = "warp-graph";
        residualPosture = "partial";
      }

      return {
        kind: "symbol-reference-count",
        freshness: "current",
        residualPosture,
        payload,
        evidence: translatedGitWarpEvidence(
          deps,
          { ref },
          {
            kind: "symbol-reference-count",
            source,
            symbolName: request.symbolName,
            filePath: request.filePath,
            ...(committedScanFailure !== undefined ? { fallbackReason: committedScanFailure } : {}),
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
