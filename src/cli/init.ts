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
      args: ["-y", "@flyingrobots/graft", "serve"],
    },
  },
} as const;

const CONTINUE_MCP_SERVER = {
  name: "graft",
  command: "npx",
  args: ["-y", "@flyingrobots/graft", "serve"],
} as const;

const CONTINUE_MCP_CONFIG = {
  mcpServers: [CONTINUE_MCP_SERVER],
} as const;

const CODEX_MCP_CONFIG = [
  "[mcp_servers.graft]",
  "command = \"npx\"",
  "args = [\"-y\", \"@flyingrobots/graft\", \"serve\"]",
  "",
].join("\n");

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

interface ParsedInitArgs {
  json: boolean;
  writeClaudeMcp: boolean;
  writeClaudeHooks: boolean;
  writeCodexMcp: boolean;
  writeCursorMcp: boolean;
  writeWindsurfMcp: boolean;
  writeContinueMcp: boolean;
  writeClineMcp: boolean;
}

export interface RunInitOptions {
  cwd?: string | undefined;
  args?: readonly string[] | undefined;
  stdout?: Writer | undefined;
  stderr?: Writer | undefined;
}

function hasFlag(args: string[], flag: string): boolean {
  const index = args.indexOf(flag);
  if (index === -1) {
    return false;
  }
  args.splice(index, 1);
  return true;
}

function writeIfMissing(filePath: string, content: string, label: string): InitAction {
  if (fs.existsSync(filePath)) {
    return { action: "exists", label };
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
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
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content.trimStart());
  return { action: "create", label };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function readJsonObject(filePath: string, label: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8")) as unknown;
    if (!isRecord(parsed)) {
      throw new Error(`${label} must contain a JSON object`);
    }
    return parsed;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Unable to parse ${label}: ${message}`, { cause: err });
  }
}

function writeJsonObject(filePath: string, value: Record<string, unknown>): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function ensureObjectProperty(
  parent: Record<string, unknown>,
  key: string,
  label: string,
): Record<string, unknown> {
  const current = parent[key];
  if (current === undefined) {
    const created: Record<string, unknown> = {};
    parent[key] = created;
    return created;
  }
  if (!isRecord(current)) {
    throw new Error(`${label} field ${key} must be a JSON object`);
  }
  return current;
}

function mergeJsonMcpConfig(
  cwd: string,
  label: string,
  relativePath: readonly string[],
): InitAction {
  const filePath = path.join(cwd, ...relativePath);
  const graftServer = cloneJson(SUGGESTED_MCP_SERVER.mcpServers.graft);
  if (!fs.existsSync(filePath)) {
    writeJsonObject(filePath, cloneJson(SUGGESTED_MCP_SERVER) as Record<string, unknown>);
    return { action: "create", label, detail: "wrote graft mcp server" };
  }

  const root = readJsonObject(filePath, label);
  const mcpServers = ensureObjectProperty(root, "mcpServers", label);
  if (mcpServers["graft"] !== undefined) {
    return { action: "exists", label, detail: "already has graft mcp server" };
  }
  mcpServers["graft"] = graftServer;
  writeJsonObject(filePath, root);
  return { action: "append", label, detail: "merged graft mcp server" };
}

function mergeClaudeMcpConfig(cwd: string): InitAction {
  return mergeJsonMcpConfig(cwd, ".mcp.json", [".mcp.json"]);
}

function mergeCursorMcpConfig(cwd: string): InitAction {
  return mergeJsonMcpConfig(cwd, ".cursor/mcp.json", [".cursor", "mcp.json"]);
}

function mergeWindsurfMcpConfig(cwd: string): InitAction {
  return mergeJsonMcpConfig(cwd, ".codeium/windsurf/mcp_config.json", [".codeium", "windsurf", "mcp_config.json"]);
}

function mergeClineMcpConfig(cwd: string): InitAction {
  return mergeJsonMcpConfig(cwd, ".vscode/cline_mcp_settings.json", [".vscode", "cline_mcp_settings.json"]);
}

function ensureHookPhase(
  hooksRoot: Record<string, unknown>,
  phase: "PreToolUse" | "PostToolUse",
): Record<string, unknown>[] {
  const current = hooksRoot[phase];
  if (current === undefined) {
    const created: Record<string, unknown>[] = [];
    hooksRoot[phase] = created;
    return created;
  }
  if (!Array.isArray(current)) {
    throw new Error(`.claude/settings.json hooks.${phase} must be an array`);
  }
  if (!current.every(isRecord)) {
    throw new Error(`.claude/settings.json hooks.${phase} must contain only object entries`);
  }
  return current;
}

function mergeHookPhase(
  phases: Record<string, unknown>[],
  entry: { readonly matcher: string; readonly hooks: readonly { readonly type: string; readonly command: string }[] },
): boolean {
  const existing = phases.find((candidate) => candidate["matcher"] === entry.matcher);
  if (existing === undefined) {
    phases.push(cloneJson(entry) as Record<string, unknown>);
    return true;
  }

  const hooks = existing["hooks"];
  if (!Array.isArray(hooks)) {
    throw new Error(`.claude/settings.json hook entry for ${entry.matcher} must have a hooks array`);
  }

  let changed = false;
  for (const graftHook of entry.hooks) {
    const alreadyPresent = hooks.some((candidate) =>
      isRecord(candidate)
      && candidate["type"] === graftHook.type
      && candidate["command"] === graftHook.command,
    );
    if (alreadyPresent) {
      continue;
    }
    hooks.push(cloneJson(graftHook) as Record<string, unknown>);
    changed = true;
  }
  return changed;
}

function mergeClaudeHooksConfig(cwd: string): InitAction {
  const label = ".claude/settings.json";
  const filePath = path.join(cwd, ".claude", "settings.json");
  if (!fs.existsSync(filePath)) {
    writeJsonObject(filePath, cloneJson(HOOKS_CONFIG) as Record<string, unknown>);
    return { action: "create", label, detail: "wrote graft hooks" };
  }

  const root = readJsonObject(filePath, label);
  const hooksRoot = ensureObjectProperty(root, "hooks", label);
  const preToolUse = ensureHookPhase(hooksRoot, "PreToolUse");
  const postToolUse = ensureHookPhase(hooksRoot, "PostToolUse");

  const changed = [
    mergeHookPhase(preToolUse, HOOKS_CONFIG.hooks.PreToolUse[0]),
    mergeHookPhase(postToolUse, HOOKS_CONFIG.hooks.PostToolUse[0]),
  ].some(Boolean);

  if (!changed) {
    return { action: "exists", label, detail: "already has graft hooks" };
  }
  writeJsonObject(filePath, root);
  return { action: "append", label, detail: "merged graft hooks" };
}

function mergeContinueMcpConfig(cwd: string): InitAction {
  const label = ".continue/config.json";
  const filePath = path.join(cwd, ".continue", "config.json");
  if (!fs.existsSync(filePath)) {
    writeJsonObject(filePath, cloneJson(CONTINUE_MCP_CONFIG) as Record<string, unknown>);
    return { action: "create", label, detail: "wrote graft mcp server" };
  }

  const root = readJsonObject(filePath, label);
  const servers = root["mcpServers"];
  if (servers === undefined) {
    root["mcpServers"] = [cloneJson(CONTINUE_MCP_SERVER)];
    writeJsonObject(filePath, root);
    return { action: "append", label, detail: "merged graft mcp server" };
  }
  if (!Array.isArray(servers)) {
    throw new Error(`${label} field mcpServers must be an array`);
  }

  const hasGraft = servers.some((candidate) => isRecord(candidate) && candidate["name"] === CONTINUE_MCP_SERVER.name);
  if (hasGraft) {
    return { action: "exists", label, detail: "already has graft mcp server" };
  }

  servers.push(cloneJson(CONTINUE_MCP_SERVER) as unknown);
  writeJsonObject(filePath, root);
  return { action: "append", label, detail: "merged graft mcp server" };
}

function mergeCodexMcpConfig(cwd: string): InitAction {
  const label = ".codex/config.toml";
  const filePath = path.join(cwd, ".codex", "config.toml");
  const marker = "[mcp_servers.graft]";
  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, CODEX_MCP_CONFIG);
    return { action: "create", label, detail: "wrote graft mcp server" };
  }

  const existing = fs.readFileSync(filePath, "utf-8");
  if (existing.includes(marker)) {
    return { action: "exists", label, detail: "already has graft mcp server" };
  }

  const separator = existing.endsWith("\n") ? "\n" : "\n\n";
  fs.writeFileSync(filePath, `${existing}${separator}${CODEX_MCP_CONFIG}`);
  return { action: "append", label, detail: "appended graft mcp server" };
}

function parseInitArgs(rawArgs: readonly string[]): ParsedInitArgs {
  const args = [...rawArgs];
  const parsed = {
    json: hasFlag(args, "--json"),
    writeClaudeMcp: hasFlag(args, "--write-claude-mcp"),
    writeClaudeHooks: hasFlag(args, "--write-claude-hooks"),
    writeCodexMcp: hasFlag(args, "--write-codex-mcp"),
    writeCursorMcp: hasFlag(args, "--write-cursor-mcp"),
    writeWindsurfMcp: hasFlag(args, "--write-windsurf-mcp"),
    writeContinueMcp: hasFlag(args, "--write-continue-mcp"),
    writeClineMcp: hasFlag(args, "--write-cline-mcp"),
  } satisfies ParsedInitArgs;

  if (args.length > 0) {
    throw new Error(`Unknown init arguments: ${args.join(" ")}`);
  }

  return parsed;
}

function initProject(cwd: string, args: ParsedInitArgs): InitResult {
  const actions = [
    writeIfMissing(path.join(cwd, ".graftignore"), GRAFTIGNORE_TEMPLATE, ".graftignore"),
    appendIfMissing(path.join(cwd, ".gitignore"), ".graft/", GITIGNORE_ENTRY, ".gitignore"),
    appendIfMissing(path.join(cwd, "CLAUDE.md"), "safe_read", "\n" + AGENT_SNIPPET, "CLAUDE.md"),
  ];

  if (args.writeClaudeMcp) {
    actions.push(mergeClaudeMcpConfig(cwd));
  }
  if (args.writeClaudeHooks) {
    actions.push(mergeClaudeHooksConfig(cwd));
  }
  if (args.writeCodexMcp) {
    actions.push(mergeCodexMcpConfig(cwd));
  }
  if (args.writeCursorMcp) {
    actions.push(mergeCursorMcpConfig(cwd));
  }
  if (args.writeWindsurfMcp) {
    actions.push(mergeWindsurfMcpConfig(cwd));
  }
  if (args.writeContinueMcp) {
    actions.push(mergeContinueMcpConfig(cwd));
  }
  if (args.writeClineMcp) {
    actions.push(mergeClineMcpConfig(cwd));
  }

  return {
    ok: true,
    cwd,
    actions,
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

function renderInitText(result: InitResult, args: ParsedInitArgs, writer: Writer): void {
  const writesAnyMcpConfig = args.writeClaudeMcp
    || args.writeCodexMcp
    || args.writeCursorMcp
    || args.writeWindsurfMcp
    || args.writeContinueMcp
    || args.writeClineMcp;

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
    writeLine(writer, JSON.stringify(result.hooksConfig, null, 2));
    writeLine(writer);
  }

  if (!writesAnyMcpConfig) {
    writeLine(writer, "Done. Add graft to your MCP config:");
    writeLine(writer);
    writeLine(writer, indentJson(result.suggestedMcpServer));
    writeLine(writer);
    writeLine(writer, "Use explicit --write-*-mcp flags or --write-claude-hooks");
    writeLine(writer, "for one-step bootstrap into project-local config files.");
  }

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

  try {
    const parsed = parseInitArgs(args);
    const result = initProject(cwd, parsed);
    if (parsed.json) {
      emitInitJson(result, stdout);
      return;
    }
    renderInitText(result, parsed, stdout);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    process.exitCode = 1;
    if ((options.args ?? process.argv.slice(3)).includes("--json")) {
      emitInitJson({ ok: false, cwd, error: message }, stdout);
      return;
    }
    writeLine(stderr, `Error: ${message}`);
  }
}
