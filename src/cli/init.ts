import * as fs from "node:fs";
import * as path from "node:path";
import { CanonicalJsonCodec } from "../adapters/canonical-json.js";
import { attachCliSchemaMeta, validateCliOutput } from "../contracts/output-schemas.js";

const codec = new CanonicalJsonCodec();

const GRAFTIGNORE_TEMPLATE = `# Graft ignore patterns — files matching these are refused by safe_read.
# Syntax: same as .gitignore (glob matching via picomatch).

# Examples:
# *.generated.ts
# vendor/**
# data/**/*.json
`;

const AGENT_SNIPPET = `## File reads

This project uses [graft](https://github.com/flyingrobots/graft) as
a context governor. Prefer graft's MCP tools over native file reads:

- Use \`safe_read\` instead of \`Read\` for file contents
- Use \`file_outline\` to see structure before reading
- Use \`read_range\` with jump table entries for targeted reads
- Use \`graft_diff\` instead of \`git diff\` for structural changes
- Use \`explain\` if you get an unfamiliar reason code
- Call \`set_budget\` at session start if context is tight

These tools enforce read policy, cache observations, and track
session metrics. Native reads bypass all of that.
`;

const GITIGNORE_ENTRY = "\n# Graft runtime data\n.graft/\n";

const HOOKS_CONFIG = {
  hooks: {
    PreToolUse: [
      {
        matcher: "Read",
        hooks: [
          {
            type: "command",
            command: "node --import tsx node_modules/@flyingrobots/graft/src/hooks/pretooluse-read.ts",
          },
        ],
      },
    ],
    PostToolUse: [
      {
        matcher: "Read",
        hooks: [
          {
            type: "command",
            command: "node --import tsx node_modules/@flyingrobots/graft/src/hooks/posttooluse-read.ts",
          },
        ],
      },
    ],
  },
} as const;

const SUGGESTED_MCP_SERVER = {
  mcpServers: {
    graft: {
      command: "npx",
      args: ["-y", "@flyingrobots/graft"],
    },
  },
} as const;

interface Writer {
  write(chunk: string): unknown;
}

interface InitAction {
  action: "exists" | "create" | "append";
  label: string;
  detail?: string | undefined;
}

interface InitResult {
  ok: true;
  cwd: string;
  actions: InitAction[];
  hooksConfig: typeof HOOKS_CONFIG;
  suggestedMcpServer: typeof SUGGESTED_MCP_SERVER;
}

export interface RunInitOptions {
  cwd?: string | undefined;
  args?: readonly string[] | undefined;
  stdout?: Writer | undefined;
  stderr?: Writer | undefined;
}

function hasJsonFlag(args: readonly string[]): boolean {
  return args.includes("--json");
}

function writeIfMissing(filePath: string, content: string, label: string): InitAction {
  if (fs.existsSync(filePath)) {
    return { action: "exists", label };
  }
  fs.writeFileSync(filePath, content);
  return { action: "create", label };
}

function appendIfMissing(filePath: string, marker: string, content: string, label: string): InitAction {
  if (fs.existsSync(filePath)) {
    const existing = fs.readFileSync(filePath, "utf-8");
    if (existing.includes(marker)) {
      return { action: "exists", label, detail: "already has graft entry" };
    }
    fs.appendFileSync(filePath, content);
    return { action: "append", label };
  }
  fs.writeFileSync(filePath, content.trimStart());
  return { action: "create", label };
}

function initProject(cwd: string): InitResult {
  return {
    ok: true,
    cwd,
    actions: [
      writeIfMissing(path.join(cwd, ".graftignore"), GRAFTIGNORE_TEMPLATE, ".graftignore"),
      appendIfMissing(path.join(cwd, ".gitignore"), ".graft/", GITIGNORE_ENTRY, ".gitignore"),
      appendIfMissing(path.join(cwd, "CLAUDE.md"), "safe_read", "\n" + AGENT_SNIPPET, "CLAUDE.md"),
    ],
    hooksConfig: HOOKS_CONFIG,
    suggestedMcpServer: SUGGESTED_MCP_SERVER,
  };
}

function writeLine(writer: Writer, line = ""): void {
  writer.write(`${line}\n`);
}

function indentJson(value: unknown, spaces = 2): string {
  const json = JSON.stringify(value, null, spaces);
  return json.split("\n").map((line) => `  ${line}`).join("\n");
}

function renderInitText(result: InitResult, writer: Writer): void {
  writeLine(writer);
  writeLine(writer, `Initializing graft in ${result.cwd}`);
  writeLine(writer);
  for (const action of result.actions) {
    const detail = action.detail !== undefined ? ` (${action.detail})` : "";
    writeLine(writer, `  ${action.action.padEnd(6)} ${action.label}${detail}`);
  }
  writeLine(writer);
  writeLine(writer, "Add to .claude/settings.json for Claude Code hook integration:");
  writeLine(writer);
  writeLine(writer, JSON.stringify(result.hooksConfig, null, 2));
  writeLine(writer);
  writeLine(writer, "Done. Add graft to your MCP config:");
  writeLine(writer);
  writeLine(writer, indentJson(result.suggestedMcpServer));
  writeLine(writer);
}

function emitInitJson(result: object, writer: Writer): void {
  writer.write(`${codec.encode(validateCliOutput("init", attachCliSchemaMeta("init", result)))}\n`);
}

export function runInit(options: RunInitOptions = {}): void {
  const cwd = options.cwd ?? process.cwd();
  const args = options.args ?? process.argv.slice(3);
  const stdout = options.stdout ?? process.stdout;
  const stderr = options.stderr ?? process.stderr;
  const json = hasJsonFlag(args);

  try {
    const result = initProject(cwd);
    if (json) {
      emitInitJson(result, stdout);
      return;
    }
    renderInitText(result, stdout);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    process.exitCode = 1;
    if (json) {
      emitInitJson({ ok: false, cwd, error: message }, stdout);
      return;
    }
    writeLine(stderr, `Error: ${message}`);
  }
}
