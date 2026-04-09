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

const READ_GUIDANCE_MARKER = "## File reads";

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

interface Writer {
  write(chunk: string): unknown;
}

export interface RunInitOptions {
  cwd?: string | undefined;
  args?: readonly string[] | undefined;
  stdout?: Writer | undefined;
  stderr?: Writer | undefined;
}

type JsonPrimitive = string | number | boolean | null;
type JsonArrayValue = JsonValue[];
type JsonValue = JsonPrimitive | JsonArrayValue | JsonObjectValue;

interface JsonObjectValue {
  [key: string]: JsonValue | undefined;
}

type InitActionKind = "exists" | "create" | "append";

class InitAction {
  constructor(
    readonly action: InitActionKind,
    readonly label: string,
    readonly detail?: string,
  ) {}

  static create(label: string, detail?: string): InitAction {
    return new InitAction("create", label, detail);
  }

  static append(label: string, detail?: string): InitAction {
    return new InitAction("append", label, detail);
  }

  static exists(label: string, detail?: string): InitAction {
    return new InitAction("exists", label, detail);
  }
}

class InitFailure {
  readonly ok = false;

  constructor(
    readonly cwd: string,
    readonly error: string,
  ) {}

  toJSON(): JsonObjectValue {
    return {
      ok: this.ok,
      cwd: this.cwd,
      error: this.error,
    };
  }
}

function consumeFlag(args: string[], flag: string): boolean {
  const index = args.indexOf(flag);
  if (index === -1) {
    return false;
  }
  args.splice(index, 1);
  return true;
}

class ParsedInitArgs {
  constructor(
    readonly json: boolean,
    readonly writeClaudeMcp: boolean,
    readonly writeClaudeHooks: boolean,
    readonly writeCodexMcp: boolean,
    readonly writeCursorMcp: boolean,
    readonly writeWindsurfMcp: boolean,
    readonly writeContinueMcp: boolean,
    readonly writeClineMcp: boolean,
  ) {}

  static parse(rawArgs: readonly string[]): ParsedInitArgs {
    const args = [...rawArgs];
    const parsed = new ParsedInitArgs(
      consumeFlag(args, "--json"),
      consumeFlag(args, "--write-claude-mcp"),
      consumeFlag(args, "--write-claude-hooks"),
      consumeFlag(args, "--write-codex-mcp"),
      consumeFlag(args, "--write-cursor-mcp"),
      consumeFlag(args, "--write-windsurf-mcp"),
      consumeFlag(args, "--write-continue-mcp"),
      consumeFlag(args, "--write-cline-mcp"),
    );

    if (args.length > 0) {
      throw new Error(`Unknown init arguments: ${args.join(" ")}`);
    }

    return parsed;
  }

  get writesAnyMcpConfig(): boolean {
    return this.writeClaudeMcp
      || this.writeCodexMcp
      || this.writeCursorMcp
      || this.writeWindsurfMcp
      || this.writeContinueMcp
      || this.writeClineMcp;
  }
}

class GraftMcpServer {
  readonly name = "graft";
  readonly command = "npx";
  readonly args = ["-y", "@flyingrobots/graft", "serve"] as const;
  readonly codexStartupTimeoutSec = 120;

  toJsonServerEntry(): JsonObjectValue {
    return {
      command: this.command,
      args: [...this.args],
    };
  }

  toJsonMcpConfig(): JsonObjectValue {
    return {
      mcpServers: {
        [this.name]: this.toJsonServerEntry(),
      },
    };
  }

  toContinueServerEntry(): JsonObjectValue {
    return {
      name: this.name,
      command: this.command,
      args: [...this.args],
    };
  }

  toContinueConfig(): JsonObjectValue {
    return {
      mcpServers: [this.toContinueServerEntry()],
    };
  }

  toCodexTomlBlock(): string {
    return [
      "[mcp_servers.graft]",
      "command = \"npx\"",
      "args = [\"-y\", \"@flyingrobots/graft\", \"serve\"]",
      `startup_timeout_sec = ${String(this.codexStartupTimeoutSec)}`,
      "",
    ].join("\n");
  }
}

function ensureCodexStartupTimeout(existing: string): { content: string; changed: boolean } {
  const marker = "[mcp_servers.graft]";
  const timeoutLine = `startup_timeout_sec = ${String(GRAFT_MCP_SERVER.codexStartupTimeoutSec)}`;
  const lines = existing.split("\n");
  const blockStart = lines.findIndex((line) => line.trim() === marker);
  if (blockStart === -1) {
    return { content: existing, changed: false };
  }

  let blockEnd = lines.length;
  for (let index = blockStart + 1; index < lines.length; index++) {
    const line = lines[index];
    if (line !== undefined && line.trim().startsWith("[") && line.trim().endsWith("]")) {
      blockEnd = index;
      break;
    }
  }

  const hasTimeout = lines
    .slice(blockStart + 1, blockEnd)
    .some((line) => line.trim().startsWith("startup_timeout_sec"));
  if (hasTimeout) {
    return { content: existing, changed: false };
  }

  lines.splice(blockEnd, 0, timeoutLine);
  return {
    content: lines.join("\n"),
    changed: true,
  };
}

class GraftHookCommand {
  constructor(readonly command: string) {}

  toJsonValue(): JsonObjectValue {
    return {
      type: "command",
      command: this.command,
    };
  }
}

class GraftHookMatcher {
  constructor(
    readonly matcher: "Read",
    readonly hooks: readonly GraftHookCommand[],
  ) {}

  toJsonValue(): JsonObjectValue {
    return {
      matcher: this.matcher,
      hooks: this.hooks.map((hook) => hook.toJsonValue()),
    };
  }
}

class GraftHooksConfig {
  constructor(
    readonly preToolUse: GraftHookMatcher,
    readonly postToolUse: GraftHookMatcher,
  ) {}

  toJsonValue(): JsonObjectValue {
    return {
      hooks: {
        PreToolUse: [this.preToolUse.toJsonValue()],
        PostToolUse: [this.postToolUse.toJsonValue()],
      },
    };
  }
}

const GRAFT_MCP_SERVER = new GraftMcpServer();
const GRAFT_HOOKS_CONFIG = new GraftHooksConfig(
  new GraftHookMatcher("Read", [
    new GraftHookCommand("node --import tsx node_modules/@flyingrobots/graft/src/hooks/pretooluse-read.ts"),
  ]),
  new GraftHookMatcher("Read", [
    new GraftHookCommand("node --import tsx node_modules/@flyingrobots/graft/src/hooks/posttooluse-read.ts"),
  ]),
);

class InitResult {
  readonly ok = true;

  constructor(
    readonly cwd: string,
    readonly actions: readonly InitAction[],
    readonly hooksConfig: GraftHooksConfig,
    readonly suggestedMcpServer: GraftMcpServer,
  ) {}

  toJSON(): JsonObjectValue {
    return {
      ok: this.ok,
      cwd: this.cwd,
      actions: this.actions.map((action) => ({
        action: action.action,
        label: action.label,
        ...(action.detail !== undefined ? { detail: action.detail } : {}),
      })),
      hooksConfig: this.hooksConfig.toJsonValue(),
      suggestedMcpServer: this.suggestedMcpServer.toJsonMcpConfig(),
    };
  }
}

function isJsonObjectValue(value: unknown): value is JsonObjectValue {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cloneJsonValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function writeLine(writer: Writer, line = ""): void {
  writer.write(`${line}\n`);
}

function formatJsonField(pointer: readonly string[]): string {
  return pointer.length === 0 ? "" : ` field ${pointer.join(".")}`;
}

class JsonArrayNode {
  constructor(
    private readonly value: JsonArrayValue,
    private readonly label: string,
    private readonly pointer: readonly string[] = [],
  ) {}

  static fromUnknown(value: unknown, label: string, pointer: readonly string[] = []): JsonArrayNode {
    if (!Array.isArray(value)) {
      throw new Error(`${label}${formatJsonField(pointer)} must be an array`);
    }
    return new JsonArrayNode(value as JsonArrayValue, label, pointer);
  }

  objectItems(): JsonObjectNode[] {
    return this.value.map((candidate, index) => {
      if (!isJsonObjectValue(candidate)) {
        throw new Error(`${this.label}${formatJsonField(this.pointer)} must contain only object entries`);
      }
      return new JsonObjectNode(candidate, this.label, [...this.pointer, String(index)]);
    });
  }

  push(value: JsonValue): void {
    this.value.push(value);
  }
}

class JsonObjectNode {
  constructor(
    private readonly value: JsonObjectValue,
    private readonly label: string,
    private readonly pointer: readonly string[] = [],
  ) {}

  static fromUnknown(value: unknown, label: string, pointer: readonly string[] = []): JsonObjectNode {
    if (!isJsonObjectValue(value)) {
      throw new Error(`${label}${formatJsonField(pointer)} must be a JSON object`);
    }
    return new JsonObjectNode(value, label, pointer);
  }

  has(key: string): boolean {
    return Object.prototype.hasOwnProperty.call(this.value, key);
  }

  set(key: string, value: JsonValue): void {
    this.value[key] = value;
  }

  ensureObject(key: string): JsonObjectNode {
    const current = this.value[key];
    if (current === undefined) {
      const created: JsonObjectValue = {};
      this.value[key] = created;
      return new JsonObjectNode(created, this.label, [...this.pointer, key]);
    }
    return JsonObjectNode.fromUnknown(current, this.label, [...this.pointer, key]);
  }

  ensureArray(key: string): JsonArrayNode {
    const current = this.value[key];
    if (current === undefined) {
      const created: JsonArrayValue = [];
      this.value[key] = created;
      return new JsonArrayNode(created, this.label, [...this.pointer, key]);
    }
    return JsonArrayNode.fromUnknown(current, this.label, [...this.pointer, key]);
  }

  requireArray(key: string): JsonArrayNode {
    const current = this.value[key];
    if (current === undefined) {
      throw new Error(`${this.label}${formatJsonField([...this.pointer, key])} must be an array`);
    }
    return JsonArrayNode.fromUnknown(current, this.label, [...this.pointer, key]);
  }

  stringValue(key: string): string | undefined {
    const current = this.value[key];
    if (current === undefined) {
      return undefined;
    }
    if (typeof current !== "string") {
      throw new Error(`${this.label}${formatJsonField([...this.pointer, key])} must be a string`);
    }
    return current;
  }

  toJsonValue(): JsonObjectValue {
    return this.value;
  }
}

class JsonObjectDocument {
  constructor(
    readonly label: string,
    readonly filePath: string,
    private readonly rootNode: JsonObjectNode,
  ) {}

  static create(filePath: string, label: string, root: JsonObjectValue): JsonObjectDocument {
    return new JsonObjectDocument(
      label,
      filePath,
      new JsonObjectNode(cloneJsonValue(root), label),
    );
  }

  static open(filePath: string, label: string): JsonObjectDocument {
    try {
      const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8")) as unknown;
      return new JsonObjectDocument(label, filePath, JsonObjectNode.fromUnknown(parsed, label));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Unable to parse ${label}: ${message}`, { cause: err });
    }
  }

  root(): JsonObjectNode {
    return this.rootNode;
  }

  write(): void {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, `${JSON.stringify(this.rootNode.toJsonValue(), null, 2)}\n`);
  }
}

class JsonMcpConfigDocument {
  constructor(
    private readonly document: JsonObjectDocument,
    private readonly server: GraftMcpServer,
  ) {}

  static create(filePath: string, label: string, server: GraftMcpServer): JsonMcpConfigDocument {
    return new JsonMcpConfigDocument(
      JsonObjectDocument.create(filePath, label, server.toJsonMcpConfig()),
      server,
    );
  }

  static open(filePath: string, label: string, server: GraftMcpServer): JsonMcpConfigDocument {
    return new JsonMcpConfigDocument(JsonObjectDocument.open(filePath, label), server);
  }

  write(): void {
    this.document.write();
  }

  ensureGraftServer(): InitAction {
    const mcpServers = this.document.root().ensureObject("mcpServers");
    if (mcpServers.has(this.server.name)) {
      return InitAction.exists(this.document.label, "already has graft mcp server");
    }
    mcpServers.set(this.server.name, this.server.toJsonServerEntry());
    this.document.write();
    return InitAction.append(this.document.label, "merged graft mcp server");
  }
}

class ContinueMcpConfigDocument {
  constructor(
    private readonly document: JsonObjectDocument,
    private readonly server: GraftMcpServer,
  ) {}

  static create(filePath: string, label: string, server: GraftMcpServer): ContinueMcpConfigDocument {
    return new ContinueMcpConfigDocument(
      JsonObjectDocument.create(filePath, label, server.toContinueConfig()),
      server,
    );
  }

  static open(filePath: string, label: string, server: GraftMcpServer): ContinueMcpConfigDocument {
    return new ContinueMcpConfigDocument(JsonObjectDocument.open(filePath, label), server);
  }

  write(): void {
    this.document.write();
  }

  ensureGraftServer(): InitAction {
    const servers = this.document.root().ensureArray("mcpServers");
    const hasGraft = servers.objectItems().some((candidate) => candidate.stringValue("name") === this.server.name);
    if (hasGraft) {
      return InitAction.exists(this.document.label, "already has graft mcp server");
    }
    servers.push(this.server.toContinueServerEntry());
    this.document.write();
    return InitAction.append(this.document.label, "merged graft mcp server");
  }
}

class ClaudeHooksDocument {
  constructor(
    private readonly document: JsonObjectDocument,
    private readonly hooksConfig: GraftHooksConfig,
  ) {}

  static create(filePath: string, label: string, hooksConfig: GraftHooksConfig): ClaudeHooksDocument {
    return new ClaudeHooksDocument(
      JsonObjectDocument.create(filePath, label, hooksConfig.toJsonValue()),
      hooksConfig,
    );
  }

  static open(filePath: string, label: string, hooksConfig: GraftHooksConfig): ClaudeHooksDocument {
    return new ClaudeHooksDocument(JsonObjectDocument.open(filePath, label), hooksConfig);
  }

  write(): void {
    this.document.write();
  }

  ensureGraftHooks(): InitAction {
    const hooksRoot = this.document.root().ensureObject("hooks");
    const changed = [
      this.mergeHookPhase(hooksRoot.ensureArray("PreToolUse"), this.hooksConfig.preToolUse),
      this.mergeHookPhase(hooksRoot.ensureArray("PostToolUse"), this.hooksConfig.postToolUse),
    ].some(Boolean);

    if (!changed) {
      return InitAction.exists(this.document.label, "already has graft hooks");
    }
    this.document.write();
    return InitAction.append(this.document.label, "merged graft hooks");
  }

  private mergeHookPhase(phases: JsonArrayNode, entry: GraftHookMatcher): boolean {
    const existing = phases.objectItems().find((candidate) => candidate.stringValue("matcher") === entry.matcher);
    if (existing === undefined) {
      phases.push(entry.toJsonValue());
      return true;
    }

    const hooks = existing.requireArray("hooks");
    let changed = false;
    for (const graftHook of entry.hooks) {
      const alreadyPresent = hooks.objectItems().some((candidate) =>
        candidate.stringValue("type") === "command"
        && candidate.stringValue("command") === graftHook.command,
      );
      if (alreadyPresent) {
        continue;
      }
      hooks.push(graftHook.toJsonValue());
      changed = true;
    }
    return changed;
  }
}

function writeIfMissing(filePath: string, content: string, label: string): InitAction {
  if (fs.existsSync(filePath)) {
    return InitAction.exists(label);
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
  return InitAction.create(label);
}

function appendIfMissing(filePath: string, marker: string, content: string, label: string): InitAction {
  if (fs.existsSync(filePath)) {
    const existing = fs.readFileSync(filePath, "utf-8");
    if (existing.includes(marker)) {
      return InitAction.exists(label, "already has graft entry");
    }
    fs.appendFileSync(filePath, content);
    return InitAction.append(label);
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content.trimStart());
  return InitAction.create(label);
}

function ensureJsonMcpConfig(filePath: string, label: string): InitAction {
  if (!fs.existsSync(filePath)) {
    const created = JsonMcpConfigDocument.create(filePath, label, GRAFT_MCP_SERVER);
    created.write();
    return InitAction.create(label, "wrote graft mcp server");
  }
  return JsonMcpConfigDocument.open(filePath, label, GRAFT_MCP_SERVER).ensureGraftServer();
}

function mergeClaudeMcpConfig(cwd: string): InitAction {
  const label = ".mcp.json";
  const filePath = path.join(cwd, label);
  return ensureJsonMcpConfig(filePath, label);
}

function mergeCursorMcpConfig(cwd: string): InitAction {
  const label = ".cursor/mcp.json";
  const filePath = path.join(cwd, ".cursor", "mcp.json");
  return ensureJsonMcpConfig(filePath, label);
}

function mergeWindsurfMcpConfig(cwd: string): InitAction {
  const label = ".codeium/windsurf/mcp_config.json";
  const filePath = path.join(cwd, ".codeium", "windsurf", "mcp_config.json");
  return ensureJsonMcpConfig(filePath, label);
}

function mergeClineMcpConfig(cwd: string): InitAction {
  const label = ".vscode/cline_mcp_settings.json";
  const filePath = path.join(cwd, ".vscode", "cline_mcp_settings.json");
  return ensureJsonMcpConfig(filePath, label);
}

function mergeClaudeHooksConfig(cwd: string): InitAction {
  const label = ".claude/settings.json";
  const filePath = path.join(cwd, ".claude", "settings.json");
  if (!fs.existsSync(filePath)) {
    const created = ClaudeHooksDocument.create(filePath, label, GRAFT_HOOKS_CONFIG);
    created.write();
    return InitAction.create(label, "wrote graft hooks");
  }
  return ClaudeHooksDocument.open(filePath, label, GRAFT_HOOKS_CONFIG).ensureGraftHooks();
}

function mergeContinueMcpConfig(cwd: string): InitAction {
  const label = ".continue/config.json";
  const filePath = path.join(cwd, ".continue", "config.json");
  if (!fs.existsSync(filePath)) {
    const created = ContinueMcpConfigDocument.create(filePath, label, GRAFT_MCP_SERVER);
    created.write();
    return InitAction.create(label, "wrote graft mcp server");
  }
  return ContinueMcpConfigDocument.open(filePath, label, GRAFT_MCP_SERVER).ensureGraftServer();
}

function mergeCodexMcpConfig(cwd: string): InitAction {
  const label = ".codex/config.toml";
  const filePath = path.join(cwd, ".codex", "config.toml");
  const marker = "[mcp_servers.graft]";
  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, GRAFT_MCP_SERVER.toCodexTomlBlock());
    return InitAction.create(label, "wrote graft mcp server");
  }

  const existing = fs.readFileSync(filePath, "utf-8");
  if (existing.includes(marker)) {
    const ensured = ensureCodexStartupTimeout(existing);
    if (ensured.changed) {
      fs.writeFileSync(filePath, ensured.content);
      return InitAction.append(label, "added graft startup timeout");
    }
    return InitAction.exists(label, "already has graft mcp server");
  }

  const separator = existing.endsWith("\n") ? "\n" : "\n\n";
  fs.writeFileSync(filePath, `${existing}${separator}${GRAFT_MCP_SERVER.toCodexTomlBlock()}`);
  return InitAction.append(label, "appended graft mcp server");
}

function initProject(cwd: string, args: ParsedInitArgs): InitResult {
  const actions: InitAction[] = [
    writeIfMissing(path.join(cwd, ".graftignore"), GRAFTIGNORE_TEMPLATE, ".graftignore"),
    appendIfMissing(path.join(cwd, ".gitignore"), ".graft/", GITIGNORE_ENTRY, ".gitignore"),
    appendIfMissing(path.join(cwd, "CLAUDE.md"), READ_GUIDANCE_MARKER, `\n${AGENT_SNIPPET}`, "CLAUDE.md"),
  ];

  if (args.writeClaudeMcp) {
    actions.push(mergeClaudeMcpConfig(cwd));
  }
  if (args.writeClaudeHooks) {
    actions.push(mergeClaudeHooksConfig(cwd));
  }
  if (args.writeCodexMcp) {
    actions.push(mergeCodexMcpConfig(cwd));
    actions.push(
      appendIfMissing(
        path.join(cwd, "AGENTS.md"),
        READ_GUIDANCE_MARKER,
        `\n${AGENT_SNIPPET}`,
        "AGENTS.md",
      ),
    );
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

  return new InitResult(cwd, actions, GRAFT_HOOKS_CONFIG, GRAFT_MCP_SERVER);
}

function indentJson(value: unknown, spaces = 2): string {
  const json = JSON.stringify(value, null, spaces);
  return json.split("\n").map((line) => `  ${line}`).join("\n");
}

function renderInitText(result: InitResult, args: ParsedInitArgs, writer: Writer): void {
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
    writeLine(writer, indentJson(GRAFT_MCP_SERVER.toJsonMcpConfig()));
    writeLine(writer);
    writeLine(writer, "Use explicit --write-*-mcp flags or --write-claude-hooks");
    writeLine(writer, "for one-step bootstrap into project-local config files.");
  }

  writeLine(writer);
}

function emitInitJson(result: JsonObjectValue | InitFailure, writer: Writer): void {
  const payload = result instanceof InitFailure
    ? result.toJSON()
    : result;
  writer.write(`${codec.encode(validateCliOutput("init", attachCliSchemaMeta("init", payload)))}\n`);
}

export function runInit(options: RunInitOptions = {}): void {
  const cwd = options.cwd ?? process.cwd();
  const args = options.args ?? process.argv.slice(3);
  const stdout = options.stdout ?? process.stdout;
  const stderr = options.stderr ?? process.stderr;

  try {
    const parsed = ParsedInitArgs.parse(args);
    const result = initProject(cwd, parsed);
    if (parsed.json) {
      emitInitJson(result.toJSON(), stdout);
      return;
    }
    renderInitText(result, parsed, stdout);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    process.exitCode = 1;
    if ((options.args ?? process.argv.slice(3)).includes("--json")) {
      emitInitJson(new InitFailure(cwd, message), stdout);
      return;
    }
    writeLine(stderr, `Error: ${message}`);
  }
}
