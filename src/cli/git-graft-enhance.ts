import { CanonicalJsonCodec } from "../adapters/canonical-json.js";
import { attachCliSchemaMeta, validateCliOutput } from "../contracts/output-schemas.js";
import type { JsonObject } from "../contracts/json-object.js";
import type { McpToolName } from "../contracts/capabilities.js";
import {
  buildGitGraftEnhanceModel,
  collectGitGraftEnhanceProvenanceCandidates,
  type GitGraftEnhanceExportsInput,
  type GitGraftEnhanceProvenanceCandidate,
  type GitGraftEnhanceProvenanceHint,
  type GitGraftEnhanceStructuralInput,
} from "./git-graft-enhance-model.js";
import { renderGitGraftEnhance } from "./git-graft-enhance-render.js";
import { invokePeerCommand, type Writer } from "./peer-command.js";

const codec = new CanonicalJsonCodec();

export type GitGraftEnhancePeerInvoker = (
  cwd: string,
  tool: McpToolName,
  args: JsonObject,
) => Promise<JsonObject>;

export interface RunGitGraftEnhanceOptions {
  readonly cwd: string;
  readonly since: string;
  readonly head?: string | undefined;
  readonly json: boolean;
  readonly stdout?: Writer | undefined;
  readonly invokePeer?: GitGraftEnhancePeerInvoker | undefined;
}

function emitJson(model: ReturnType<typeof buildGitGraftEnhanceModel>, writer: Writer): void {
  writer.write(`${codec.encode(validateCliOutput("git_graft_enhance", attachCliSchemaMeta("git_graft_enhance", model)))}\n`);
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function numberOrZero(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

async function readProvenanceHint(
  cwd: string,
  candidate: GitGraftEnhanceProvenanceCandidate,
  invoke: GitGraftEnhancePeerInvoker,
): Promise<GitGraftEnhanceProvenanceHint> {
  try {
    const blame = await invoke(cwd, "graft_blame", {
      symbol: candidate.symbol,
      path: candidate.filePath,
    });
    const history = Array.isArray(blame["history"]) ? blame["history"] : [];
    if (history.length === 0) {
      return {
        ...candidate,
        status: "unavailable",
        reason: "not_indexed_or_not_found",
      };
    }
    return {
      ...candidate,
      status: "available",
      createdInCommit: stringOrNull(blame["createdInCommit"]),
      lastSignatureChange: stringOrNull(blame["lastSignatureChange"]),
      referenceCount: numberOrZero(blame["referenceCount"]),
      changeCount: numberOrZero(blame["changeCount"]),
    };
  } catch (error) {
    return {
      ...candidate,
      status: "unavailable",
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

async function collectProvenanceHints(
  cwd: string,
  structural: GitGraftEnhanceStructuralInput,
  invoke: GitGraftEnhancePeerInvoker,
): Promise<readonly GitGraftEnhanceProvenanceHint[]> {
  const candidates = collectGitGraftEnhanceProvenanceCandidates(structural);
  return Promise.all(candidates.map((candidate) => readProvenanceHint(cwd, candidate, invoke)));
}

export async function runGitGraftEnhance(options: RunGitGraftEnhanceOptions): Promise<void> {
  const stdout = options.stdout ?? process.stdout;
  const head = options.head ?? "HEAD";
  const invoke = options.invokePeer ?? invokePeerCommand;
  const args = { base: options.since, head };
  const structural = await invoke(options.cwd, "graft_since", args) as unknown as GitGraftEnhanceStructuralInput;
  const exports = await invoke(options.cwd, "graft_exports", args) as unknown as GitGraftEnhanceExportsInput;
  const provenanceHints = await collectProvenanceHints(options.cwd, structural, invoke);
  const model = buildGitGraftEnhanceModel({
    since: options.since,
    head,
    structural,
    exports,
    provenanceHints,
  });

  if (options.json) {
    emitJson(model, stdout);
    return;
  }

  stdout.write(`${renderGitGraftEnhance(model)}\n`);
}
