import * as fs from "node:fs";
import * as path from "node:path";
import { execFileSync } from "node:child_process";
import {
  buildTargetGitHookScript,
  isRecognizedTargetGitHook,
  resolveGitHooksPath,
  TARGET_GIT_TRANSITION_HOOKS,
} from "../git/target-git-hook-bootstrap.js";
import {
  cloneJsonValue,
  GRAFT_HOOKS_CONFIG,
  GRAFT_MCP_SERVER,
  type GraftHookMatcher,
  InitAction,
  isJsonObjectValue,
  type JsonArrayValue,
  type JsonObjectValue,
  type JsonValue,
} from "./init-model.js";

function formatJsonField(pointer: readonly string[]): string {
  return pointer.length === 0 ? "document root" : pointer.join(".");
}

class JsonArrayNode {
  constructor(
    private readonly value: JsonArrayValue,
    private readonly label: string,
    private readonly pointer: readonly string[] = [],
  ) {}

  static fromUnknown(value: unknown, label: string, pointer: readonly string[] = []): JsonArrayNode {
    if (!Array.isArray(value)) {
      throw new Error(`${label}: expected ${formatJsonField(pointer)} to be an array`);
    }
    return new JsonArrayNode(value as JsonArrayValue, label, pointer);
  }

  objectItems(): JsonObjectNode[] {
    return this.value.map((item, index) => JsonObjectNode.fromUnknown(item, this.label, [...this.pointer, `[${String(index)}]`]));
  }

  push(value: JsonValue): void {
    this.value.push(cloneJsonValue(value));
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
      throw new Error(`${label}: expected ${formatJsonField(pointer)} to be an object`);
    }
    return new JsonObjectNode(value, label, pointer);
  }

  has(key: string): boolean {
    return this.value[key] !== undefined;
  }

  set(key: string, value: JsonValue): void {
    this.value[key] = cloneJsonValue(value);
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
      throw new Error(`${this.label}: expected ${formatJsonField([...this.pointer, key])} to exist`);
    }
    return JsonArrayNode.fromUnknown(current, this.label, [...this.pointer, key]);
  }

  stringValue(key: string): string | undefined {
    const current = this.value[key];
    return typeof current === "string" ? current : undefined;
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
    return new JsonObjectDocument(label, filePath, new JsonObjectNode(cloneJsonValue(root), label));
  }

  static open(filePath: string, label: string): JsonObjectDocument {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8")) as unknown;
    return new JsonObjectDocument(label, filePath, JsonObjectNode.fromUnknown(parsed, label));
  }

  root(): JsonObjectNode {
    return this.rootNode;
  }

  write(): void {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(this.rootNode.toJsonValue(), null, 2));
  }
}

class JsonMcpConfigDocument {
  constructor(
    private readonly document: JsonObjectDocument,
    private readonly server: typeof GRAFT_MCP_SERVER,
  ) {}

  static create(filePath: string, label: string, server: typeof GRAFT_MCP_SERVER): JsonMcpConfigDocument {
    return new JsonMcpConfigDocument(documentOrCreate(filePath, label, server.toJsonMcpConfig()), server);
  }

  static open(filePath: string, label: string, server: typeof GRAFT_MCP_SERVER): JsonMcpConfigDocument {
    return new JsonMcpConfigDocument(JsonObjectDocument.open(filePath, label), server);
  }

  write(): void {
    this.document.write();
  }

  ensureGraftServer(): InitAction {
    const root = this.document.root();
    const servers = root.ensureObject("mcpServers");
    if (servers.has(this.server.name)) {
      return InitAction.exists(this.document.label, "already has graft mcp server");
    }
    servers.set(this.server.name, this.server.toJsonServerEntry());
    this.document.write();
    return InitAction.append(this.document.label, "added graft mcp server");
  }
}

class ContinueMcpConfigDocument {
  constructor(
    private readonly document: JsonObjectDocument,
    private readonly server: typeof GRAFT_MCP_SERVER,
  ) {}

  static create(filePath: string, label: string, server: typeof GRAFT_MCP_SERVER): ContinueMcpConfigDocument {
    return new ContinueMcpConfigDocument(documentOrCreate(filePath, label, server.toContinueConfig()), server);
  }

  static open(filePath: string, label: string, server: typeof GRAFT_MCP_SERVER): ContinueMcpConfigDocument {
    return new ContinueMcpConfigDocument(JsonObjectDocument.open(filePath, label), server);
  }

  write(): void {
    this.document.write();
  }

  ensureGraftServer(): InitAction {
    const root = this.document.root();
    const servers = root.ensureArray("mcpServers");
    const exists = servers.objectItems().some((entry) => entry.stringValue("name") === this.server.name);
    if (exists) {
      return InitAction.exists(this.document.label, "already has graft mcp server");
    }
    servers.push(this.server.toContinueServerEntry());
    this.document.write();
    return InitAction.append(this.document.label, "added graft mcp server");
  }
}

class ClaudeHooksDocument {
  constructor(
    private readonly document: JsonObjectDocument,
    private readonly hooksConfig: typeof GRAFT_HOOKS_CONFIG,
  ) {}

  static create(filePath: string, label: string, hooksConfig: typeof GRAFT_HOOKS_CONFIG): ClaudeHooksDocument {
    return new ClaudeHooksDocument(documentOrCreate(filePath, label, hooksConfig.toJsonValue()), hooksConfig);
  }

  static open(filePath: string, label: string, hooksConfig: typeof GRAFT_HOOKS_CONFIG): ClaudeHooksDocument {
    return new ClaudeHooksDocument(JsonObjectDocument.open(filePath, label), hooksConfig);
  }

  write(): void {
    this.document.write();
  }

  ensureGraftHooks(): InitAction {
    const root = this.document.root();
    const hooksRoot = root.ensureObject("hooks");
    const preToolUse = hooksRoot.ensureArray("PreToolUse");
    const postToolUse = hooksRoot.ensureArray("PostToolUse");
    const changed = this.mergeHookPhase(preToolUse, this.hooksConfig.preToolUse)
      || this.mergeHookPhase(postToolUse, this.hooksConfig.postToolUse);
    if (!changed) {
      return InitAction.exists(this.document.label, "already has graft hooks");
    }
    this.document.write();
    return InitAction.append(this.document.label, "added graft hooks");
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

function documentOrCreate(filePath: string, label: string, root: JsonObjectValue): JsonObjectDocument {
  return JsonObjectDocument.create(filePath, label, root);
}

export function ensureCodexStartupTimeout(existing: string): { content: string; changed: boolean } {
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

export function writeIfMissing(filePath: string, content: string, label: string): InitAction {
  if (fs.existsSync(filePath)) {
    return InitAction.exists(label);
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
  return InitAction.create(label);
}

export function appendIfMissing(filePath: string, marker: string, content: string, label: string): InitAction {
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

function readGitValue(cwd: string, args: readonly string[]): string | null {
  try {
    const value = execFileSync("git", [...args], {
      cwd,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

function relativeLabel(cwd: string, filePath: string): string {
  const relative = path.relative(cwd, filePath);
  if (relative.length === 0 || relative.startsWith("..")) {
    return filePath;
  }
  return relative;
}

function resolveTargetGitHooksDirectory(cwd: string): {
  configuredCoreHooksPath: string | null;
  resolvedHooksPath: string;
} {
  const worktreeRoot = readGitValue(cwd, ["rev-parse", "--path-format=absolute", "--show-toplevel"]);
  const gitCommonDir = readGitValue(cwd, ["rev-parse", "--path-format=absolute", "--git-common-dir"]);
  if (worktreeRoot === null || gitCommonDir === null) {
    throw new Error("--write-target-git-hooks requires a git worktree");
  }

  const configuredCoreHooksPath = readGitValue(cwd, ["config", "--get", "core.hooksPath"]);
  return {
    configuredCoreHooksPath,
    resolvedHooksPath: resolveGitHooksPath(
      worktreeRoot,
      gitCommonDir,
      configuredCoreHooksPath,
    ),
  };
}

export function ensureTargetGitHooks(cwd: string): InitAction[] {
  const { resolvedHooksPath } = resolveTargetGitHooksDirectory(cwd);
  const actions: InitAction[] = [];
  fs.mkdirSync(resolvedHooksPath, { recursive: true });

  for (const hookName of TARGET_GIT_TRANSITION_HOOKS) {
    const hookPath = path.join(resolvedHooksPath, hookName);
    const label = relativeLabel(cwd, hookPath);
    const nextContent = buildTargetGitHookScript(hookName);
    if (!fs.existsSync(hookPath)) {
      fs.writeFileSync(hookPath, nextContent);
      fs.chmodSync(hookPath, 0o755);
      actions.push(InitAction.create(label, "wrote graft target git hook"));
      continue;
    }

    const existing = fs.readFileSync(hookPath, "utf-8");
    if (existing === nextContent) {
      actions.push(InitAction.exists(label, "already has graft target git hook"));
      continue;
    }
    if (isRecognizedTargetGitHook(existing, hookName)) {
      fs.writeFileSync(hookPath, nextContent);
      fs.chmodSync(hookPath, 0o755);
      actions.push(InitAction.append(label, "updated graft target git hook"));
      continue;
    }
    actions.push(InitAction.exists(label, "external hook preserved"));
  }

  return actions;
}

function ensureJsonMcpConfig(filePath: string, label: string): InitAction {
  if (!fs.existsSync(filePath)) {
    const created = JsonMcpConfigDocument.create(filePath, label, GRAFT_MCP_SERVER);
    created.write();
    return InitAction.create(label, "wrote graft mcp server");
  }
  return JsonMcpConfigDocument.open(filePath, label, GRAFT_MCP_SERVER).ensureGraftServer();
}

export function mergeClaudeMcpConfig(cwd: string): InitAction {
  const label = ".mcp.json";
  const filePath = path.join(cwd, label);
  return ensureJsonMcpConfig(filePath, label);
}

export function mergeCursorMcpConfig(cwd: string): InitAction {
  const label = ".cursor/mcp.json";
  const filePath = path.join(cwd, ".cursor", "mcp.json");
  return ensureJsonMcpConfig(filePath, label);
}

export function mergeWindsurfMcpConfig(cwd: string): InitAction {
  const label = ".codeium/windsurf/mcp_config.json";
  const filePath = path.join(cwd, ".codeium", "windsurf", "mcp_config.json");
  return ensureJsonMcpConfig(filePath, label);
}

export function mergeClineMcpConfig(cwd: string): InitAction {
  const label = ".vscode/cline_mcp_settings.json";
  const filePath = path.join(cwd, ".vscode", "cline_mcp_settings.json");
  return ensureJsonMcpConfig(filePath, label);
}

export function mergeClaudeHooksConfig(cwd: string): InitAction {
  const label = ".claude/settings.json";
  const filePath = path.join(cwd, ".claude", "settings.json");
  if (!fs.existsSync(filePath)) {
    const created = ClaudeHooksDocument.create(filePath, label, GRAFT_HOOKS_CONFIG);
    created.write();
    return InitAction.create(label, "wrote graft hooks");
  }
  return ClaudeHooksDocument.open(filePath, label, GRAFT_HOOKS_CONFIG).ensureGraftHooks();
}

export function mergeContinueMcpConfig(cwd: string): InitAction {
  const label = ".continue/config.json";
  const filePath = path.join(cwd, ".continue", "config.json");
  if (!fs.existsSync(filePath)) {
    const created = ContinueMcpConfigDocument.create(filePath, label, GRAFT_MCP_SERVER);
    created.write();
    return InitAction.create(label, "wrote graft mcp server");
  }
  return ContinueMcpConfigDocument.open(filePath, label, GRAFT_MCP_SERVER).ensureGraftServer();
}

export function mergeCodexMcpConfig(cwd: string): InitAction {
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
