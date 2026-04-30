import { CanonicalJsonCodec } from "../adapters/canonical-json.js";
import { attachCliSchemaMeta, validateCliOutput } from "../contracts/output-schemas.js";
import type { JsonObject } from "../contracts/json-object.js";
import type { McpToolName } from "../contracts/capabilities.js";
import {
  buildGitGraftEnhanceModel,
  type GitGraftEnhanceExportsInput,
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

export async function runGitGraftEnhance(options: RunGitGraftEnhanceOptions): Promise<void> {
  const stdout = options.stdout ?? process.stdout;
  const head = options.head ?? "HEAD";
  const invoke = options.invokePeer ?? invokePeerCommand;
  const args = { base: options.since, head };
  const structural = await invoke(options.cwd, "graft_since", args) as unknown as GitGraftEnhanceStructuralInput;
  const exports = await invoke(options.cwd, "graft_exports", args) as unknown as GitGraftEnhanceExportsInput;
  const model = buildGitGraftEnhanceModel({
    since: options.since,
    head,
    structural,
    exports,
  });

  if (options.json) {
    emitJson(model, stdout);
    return;
  }

  stdout.write(`${renderGitGraftEnhance(model)}\n`);
}
