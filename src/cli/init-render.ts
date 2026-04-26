import { CanonicalJsonCodec } from "../adapters/canonical-json.js";
import { attachCliSchemaMeta, validateCliOutput } from "../contracts/output-schemas.js";
import { GRAFT_HOOKS_CONFIG, InitFailure, InitResult, ParsedInitArgs, type JsonObjectValue } from "./init-model.js";

const codec = new CanonicalJsonCodec();

interface Writer {
  write(chunk: string): unknown;
}

function writeLine(writer: Writer, line = ""): void {
  writer.write(`${line}\n`);
}

function indentJson(value: unknown, spaces = 2): string {
  const json = JSON.stringify(value, null, spaces);
  return json.split("\n").map((line) => `  ${line}`).join("\n");
}

export function renderInitText(result: InitResult, args: ParsedInitArgs, writer: Writer): void {
  writeLine(writer);
  writeLine(writer, `Initializing graft in ${result.cwd}`);
  writeLine(writer);
  for (const action of result.actions) {
    const detail = action.detail !== undefined ? ` (${action.detail})` : "";
    writeLine(writer, `  ${action.action.padEnd(6)} ${action.label}${detail}`);
  }
  writeLine(writer);

  if (!args.writeClaudeHooks) {
    writeLine(writer, "Add to .claude/settings.json for Claude Code hook integration:");
    writeLine(writer);
    writeLine(writer, JSON.stringify(GRAFT_HOOKS_CONFIG.toJsonValue(), null, 2));
    writeLine(writer);
  }

  if (!args.writesAnyMcpConfig) {
    writeLine(writer, "Done. Add graft to your MCP config:");
    writeLine(writer);
    writeLine(writer, indentJson(result.suggestedMcpServer.toJsonMcpConfig()));
    writeLine(writer);
    writeLine(writer, "Use explicit --write-*-mcp flags or --write-claude-hooks");
    writeLine(writer, "or --write-target-git-hooks for one-step bootstrap into project-local config files.");
  }

  writeLine(writer);
}

export function emitInitJson(result: JsonObjectValue | InitFailure, writer: Writer): void {
  const payload = result instanceof InitFailure
    ? result.toJSON()
    : result;
  writer.write(`${codec.encode(validateCliOutput("init", attachCliSchemaMeta("init", payload)))}\n`);
}
