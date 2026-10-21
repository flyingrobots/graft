import type { GitClient } from "../ports/git.js";
import type { PathOps } from "../ports/paths.js";
import type {
  DeadSymbolsReadingPayload,
  DeadSymbolsReadingRequest,
  GitWarpBasis,
  GitWarpEvidence,
  ObservedIndexHistoryTerms,
  StructuralReadingCoverage,
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
  readObservedIndexHistory as defaultReadObservedIndexHistory,
  type DeadSymbol,
} from "./dead-symbols.js";
import type { WarpContext } from "./context.js";
import { readIndexCoverage as defaultReadIndexCoverage } from "./index-coverage.js";

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
  readonly readIndexCoverage?: (opts: {
    readonly cwd: string;
    readonly git: GitClient;
    readonly ctx: WarpContext;
  }) => Promise<StructuralReadingCoverage>;
  readonly readObservedIndexHistory?: (
    ctx: WarpContext,
    options?: DeadSymbolsReadingRequest,
  ) => Promise<ObservedIndexHistoryTerms>;
}

function committedHistoryBasis(
  deps: Pick<GitWarpStructuralReadingPortDeps, "projectRoot">,
  basis: { readonly ref?: string | undefined; readonly maxCommits?: number | undefined },
): GitWarpBasis {
  return {
    kind: "git-committed-history",
    projectRoot: deps.projectRoot,
    ...(basis.ref !== undefined ? { ref: basis.ref } : {}),
    ...(basis.maxCommits !== undefined ? { maxCommits: basis.maxCommits } : {}),
  };
}

function translatedGitWarpEvidence(
  basis: GitWarpBasis,
  evidence: GitWarpEvidence,
): TranslatedSubstrateEvidence {
  return {
    kind: "translated-substrate",
    evidenceLabel: "fallback-translated",
    substrate: "git-warp",
    basis,
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
  const readIndexCoverage = deps.readIndexCoverage ?? defaultReadIndexCoverage;
  const readObservedIndexHistory = deps.readObservedIndexHistory ?? defaultReadObservedIndexHistory;
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
      let freshness: StructuralReadingResult<SymbolReferenceReadingPayload>["freshness"];
      let basis: GitWarpBasis;
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
        freshness = "current";
        basis = committedHistoryBasis(deps, { ref });
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
        // The lazily built graph is not the requested ref: the reading cannot
        // be compared to it, and its basis records the request without
        // claiming it.
        freshness = "incomparable";
        basis = { kind: "warp-indexed-graph", projectRoot: deps.projectRoot, requestedRef: ref };
      }

      return {
        kind: "symbol-reference-count",
        freshness,
        residualPosture,
        payload,
        evidence: translatedGitWarpEvidence(
          basis,
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
      // Dead symbols are found only among files the lazy index holds, so the
      // reading is complete only when the index covers the declared domain.
      // Coverage of the current tree is not coverage of history: removals are
      // observed only between indexed boundaries, so the reading states the
      // history it examined separately.
      const currentTreeCoverage = await readIndexCoverage({ cwd: deps.projectRoot, git: deps.git, ctx: warp });
      const history = await readObservedIndexHistory(warp, options);

      return {
        kind: "dead-symbols",
        freshness: "current",
        residualPosture: currentTreeCoverage.missingFiles === 0 ? "complete" : "partial",
        payload: {
          symbols,
          total: symbols.length,
          currentTreeCoverage,
          history,
        },
        evidence: translatedGitWarpEvidence(
          committedHistoryBasis(deps, { maxCommits: request.maxCommits }),
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
