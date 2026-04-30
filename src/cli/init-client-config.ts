import * as fs from "node:fs";
import * as path from "node:path";
import {
  GRAFT_HOOKS_CONFIG,
  GRAFT_MCP_SERVER,
  GraftMcpServer,
  InitAction,
  isGraftMcpServerEntryForRuntime,
  type GraftHookMatcher,
  type JsonObjectValue,
  type JsonValue,
} from "./init-model.js";
import {
  JsonArrayNode,
  JsonObjectDocument,
} from "./json-document.js";

const LEGACY_CLAUDE_HOOK_COMMANDS = new Map<string, ReadonlySet<string>>([
  [
    "node node_modules/@flyingrobots/graft/dist/hooks/pretooluse-read.js",
    new Set([
      "node --import tsx node_modules/@flyingrobots/graft/src/hooks/pretooluse-read.ts",
    ]),
  ],
  [
    "node node_modules/@flyingrobots/graft/dist/hooks/posttooluse-read.js",
    new Set([
      "node --import tsx node_modules/@flyingrobots/graft/src/hooks/posttooluse-read.ts",
    ]),
  ],
]);

function isLegacyClaudeHookCommand(command: string | undefined, replacement: string): boolean {
  if (command === undefined) return false;
  return LEGACY_CLAUDE_HOOK_COMMANDS.get(replacement)?.has(command) ?? false;
}

class JsonMcpConfigDocument {
  constructor(
    private readonly document: JsonObjectDocument,
    private readonly server: GraftMcpServer,
    private readonly updateExisting: boolean,
  ) {}

  static create(
    filePath: string,
    label: string,
    server: GraftMcpServer,
    updateExisting: boolean,
  ): JsonMcpConfigDocument {
    return new JsonMcpConfigDocument(
      JsonObjectDocument.create(filePath, label, server.toJsonMcpConfig()),
      server,
      updateExisting,
    );
  }

  static open(
    filePath: string,
    label: string,
    server: GraftMcpServer,
    updateExisting: boolean,
  ): JsonMcpConfigDocument {
    return new JsonMcpConfigDocument(
      JsonObjectDocument.open(filePath, label),
      server,
      updateExisting,
    );
  }

  write(): void {
    this.document.write();
  }

  ensureGraftServer(): InitAction {
    const root = this.document.root();
    const servers = root.ensureObject("mcpServers");
    const existing = servers.toJsonValue()[this.server.name];
    if (existing !== undefined) {
      if (isGraftMcpServerEntryForRuntime(existing, this.server.runtime) || !this.updateExisting) {
        return InitAction.exists(this.document.label, "already has graft mcp server");
      }
      servers.set(this.server.name, this.server.toJsonServerEntry());
      this.document.write();
      return InitAction.append(this.document.label, `updated graft mcp server runtime to ${this.server.runtime}`);
    }
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
    private readonly server: GraftMcpServer,
    private readonly updateExisting: boolean,
  ) {}

  static create(
    filePath: string,
    label: string,
    server: GraftMcpServer,
    updateExisting: boolean,
  ): ContinueMcpConfigDocument {
    return new ContinueMcpConfigDocument(
      JsonObjectDocument.create(filePath, label, server.toContinueConfig()),
      server,
      updateExisting,
    );
  }

  static open(
    filePath: string,
    label: string,
    server: GraftMcpServer,
    updateExisting: boolean,
  ): ContinueMcpConfigDocument {
    return new ContinueMcpConfigDocument(
      JsonObjectDocument.open(filePath, label),
      server,
      updateExisting,
    );
  }

  write(): void {
    this.document.write();
  }

  ensureGraftServer(): InitAction {
    const root = this.document.root();
    const servers = root.ensureArray("mcpServers");
    const existingEntries = servers.objectEntries();
    const existing = existingEntries
      .find((entry) => entry.node.stringValue("name") === this.server.name);
    if (existing !== undefined) {
      if (isContinueServerEntryForRuntime(existing.node.toJsonValue(), this.server.runtime) || !this.updateExisting) {
        return InitAction.exists(this.document.label, "already has graft mcp server");
      }
      servers.set(existing.index, this.server.toContinueServerEntry());
      this.document.write();
      return InitAction.append(this.document.label, `updated graft mcp server runtime to ${this.server.runtime}`);
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

  static create(
    filePath: string,
    label: string,
    hooksConfig: typeof GRAFT_HOOKS_CONFIG,
  ): ClaudeHooksDocument {
    return new ClaudeHooksDocument(
      JsonObjectDocument.create(filePath, label, hooksConfig.toJsonValue()),
      hooksConfig,
    );
  }

  static open(
    filePath: string,
    label: string,
    hooksConfig: typeof GRAFT_HOOKS_CONFIG,
  ): ClaudeHooksDocument {
    return new ClaudeHooksDocument(
      JsonObjectDocument.open(filePath, label),
      hooksConfig,
    );
  }

  write(): void {
    this.document.write();
  }

  ensureGraftHooks(): InitAction {
    const root = this.document.root();
    const hooksRoot = root.ensureObject("hooks");
    const preToolUse = hooksRoot.ensureArray("PreToolUse");
    const postToolUse = hooksRoot.ensureArray("PostToolUse");
    const preToolUseChanged = this.mergeHookPhase(preToolUse, this.hooksConfig.preToolUse);
    const postToolUseChanged = this.mergeHookPhase(postToolUse, this.hooksConfig.postToolUse);
    const changed = preToolUseChanged || postToolUseChanged;
    if (!changed) {
      return InitAction.exists(this.document.label, "already has graft hooks");
    }
    this.document.write();
    return InitAction.append(this.document.label, "added graft hooks");
  }

  private mergeHookPhase(
    phases: JsonArrayNode,
    entry: GraftHookMatcher,
  ): boolean {
    const existing = phases
      .objectItems()
      .find((candidate) => candidate.stringValue("matcher") === entry.matcher);
    if (existing === undefined) {
      phases.push(entry.toJsonValue());
      return true;
    }

    const hooks = existing.requireArray("hooks");
    let changed = false;
    for (const graftHook of entry.hooks) {
      const entries = hooks.objectEntries();
      const alreadyPresent = entries.some((candidate) =>
        candidate.node.stringValue("type") === "command"
        && candidate.node.stringValue("command") === graftHook.command,
      );
      const legacyEntries = entries.filter((candidate) =>
        candidate.node.stringValue("type") === "command"
        && isLegacyClaudeHookCommand(candidate.node.stringValue("command"), graftHook.command),
      );
      if (alreadyPresent) {
        for (const legacyEntry of [...legacyEntries].reverse()) {
          hooks.remove(legacyEntry.index);
          changed = true;
        }
        continue;
      }
      const [firstLegacy, ...duplicateLegacy] = legacyEntries;
      if (firstLegacy !== undefined) {
        hooks.set(firstLegacy.index, graftHook.toJsonValue());
        for (const legacyEntry of [...duplicateLegacy].reverse()) {
          hooks.remove(legacyEntry.index);
        }
        changed = true;
        continue;
      }
      hooks.push(graftHook.toJsonValue());
      changed = true;
    }
    return changed;
  }
}

export function ensureCodexStartupTimeout(
  existing: string,
): { content: string; changed: boolean } {
  const ensured = ensureCodexMcpServerBlock(existing, GRAFT_MCP_SERVER, false);
  return { content: ensured.content, changed: ensured.changed };
}

function codexBlockBounds(lines: readonly string[]): { start: number; end: number } | undefined {
  const marker = "[mcp_servers.graft]";
  const blockStart = lines.findIndex((line) => line.trim() === marker);
  if (blockStart === -1) {
    return undefined;
  }

  let blockEnd = lines.length;
  for (let index = blockStart + 1; index < lines.length; index++) {
    const line = lines[index];
    if (line !== undefined && line.trim().startsWith("[") && line.trim().endsWith("]")) {
      blockEnd = index;
      break;
    }
  }

  return { start: blockStart, end: blockEnd };
}

function replaceOrInsertLine(
  lines: string[],
  bounds: { readonly start: number; readonly end: number },
  predicate: (line: string) => boolean,
  value: string,
): { end: number; changed: boolean } {
  const index = lines
    .slice(bounds.start + 1, bounds.end)
    .findIndex(predicate);
  if (index === -1) {
    lines.splice(bounds.end, 0, value);
    return { end: bounds.end + 1, changed: true };
  }

  const absoluteIndex = bounds.start + 1 + index;
  if (lines[absoluteIndex] === value) {
    return { end: bounds.end, changed: false };
  }

  lines[absoluteIndex] = value;
  return { end: bounds.end, changed: true };
}

export function ensureCodexMcpServerBlock(
  existing: string,
  server: GraftMcpServer,
  updateExisting: boolean,
): { content: string; changed: boolean; detail?: string | undefined } {
  const lines = existing.split("\n");
  const bounds = codexBlockBounds(lines);
  if (bounds === undefined) {
    return { content: existing, changed: false };
  }

  let changed = false;
  let runtimeChanged = false;
  let blockEnd = bounds.end;
  if (updateExisting) {
    const command = replaceOrInsertLine(
      lines,
      { start: bounds.start, end: blockEnd },
      (line) => line.trim().startsWith("command"),
      `command = "${server.command}"`,
    );
    runtimeChanged = command.changed;
    changed = command.changed;
    blockEnd = command.end;

    const args = replaceOrInsertLine(
      lines,
      { start: bounds.start, end: blockEnd },
      (line) => line.trim().startsWith("args"),
      server.toCodexTomlArgsLine(),
    );
    runtimeChanged = runtimeChanged || args.changed;
    changed = changed || args.changed;
    blockEnd = args.end;
  }

  const hasTimeout = lines
    .slice(bounds.start + 1, blockEnd)
    .some((line) => line.trim().startsWith("startup_timeout_sec"));
  if (!hasTimeout) {
    lines.splice(blockEnd, 0, `startup_timeout_sec = ${String(server.codexStartupTimeoutSec)}`);
    changed = true;
  }

  return {
    content: lines.join("\n"),
    changed,
    ...(runtimeChanged ? { detail: `updated graft mcp server runtime to ${server.runtime}` } : {}),
  };
}

function isContinueServerEntryForRuntime(value: JsonObjectValue, runtime: GraftMcpServer["runtime"]): boolean {
  const { name, ...entry } = value;
  void name;
  return isGraftMcpServerEntryForRuntime(entry as JsonValue, runtime);
}

function ensureJsonMcpConfig(
  filePath: string,
  label: string,
  server: GraftMcpServer,
  updateExisting: boolean,
): InitAction {
  if (!fs.existsSync(filePath)) {
    const created = JsonMcpConfigDocument.create(filePath, label, server, updateExisting);
    created.write();
    return InitAction.create(label, "wrote graft mcp server");
  }
  return JsonMcpConfigDocument
    .open(filePath, label, server, updateExisting)
    .ensureGraftServer();
}

export function mergeClaudeMcpConfig(
  cwd: string,
  server = GRAFT_MCP_SERVER,
  updateExisting = false,
): InitAction {
  const label = ".mcp.json";
  const filePath = path.join(cwd, label);
  return ensureJsonMcpConfig(filePath, label, server, updateExisting);
}

export function mergeCursorMcpConfig(
  cwd: string,
  server = GRAFT_MCP_SERVER,
  updateExisting = false,
): InitAction {
  const label = ".cursor/mcp.json";
  const filePath = path.join(cwd, ".cursor", "mcp.json");
  return ensureJsonMcpConfig(filePath, label, server, updateExisting);
}

export function mergeWindsurfMcpConfig(
  cwd: string,
  server = GRAFT_MCP_SERVER,
  updateExisting = false,
): InitAction {
  const label = ".codeium/windsurf/mcp_config.json";
  const filePath = path.join(cwd, ".codeium", "windsurf", "mcp_config.json");
  return ensureJsonMcpConfig(filePath, label, server, updateExisting);
}

export function mergeClineMcpConfig(
  cwd: string,
  server = GRAFT_MCP_SERVER,
  updateExisting = false,
): InitAction {
  const label = ".vscode/cline_mcp_settings.json";
  const filePath = path.join(cwd, ".vscode", "cline_mcp_settings.json");
  return ensureJsonMcpConfig(filePath, label, server, updateExisting);
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

export function mergeContinueMcpConfig(
  cwd: string,
  server = GRAFT_MCP_SERVER,
  updateExisting = false,
): InitAction {
  const label = ".continue/config.json";
  const filePath = path.join(cwd, ".continue", "config.json");
  if (!fs.existsSync(filePath)) {
    const created = ContinueMcpConfigDocument.create(filePath, label, server, updateExisting);
    created.write();
    return InitAction.create(label, "wrote graft mcp server");
  }
  return ContinueMcpConfigDocument
    .open(filePath, label, server, updateExisting)
    .ensureGraftServer();
}

export function mergeCodexMcpConfig(
  cwd: string,
  server = GRAFT_MCP_SERVER,
  updateExisting = false,
): InitAction {
  const label = ".codex/config.toml";
  const filePath = path.join(cwd, ".codex", "config.toml");
  const marker = "[mcp_servers.graft]";
  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, server.toCodexTomlBlock());
    return InitAction.create(label, "wrote graft mcp server");
  }

  const existing = fs.readFileSync(filePath, "utf-8");
  if (existing.includes(marker)) {
    const ensured = ensureCodexMcpServerBlock(existing, server, updateExisting);
    if (ensured.changed) {
      fs.writeFileSync(filePath, ensured.content);
      return InitAction.append(label, ensured.detail ?? "added graft startup timeout");
    }
    return InitAction.exists(label, "already has graft mcp server");
  }

  const separator = existing.endsWith("\n") ? "\n" : "\n\n";
  fs.writeFileSync(
    filePath,
    `${existing}${separator}${server.toCodexTomlBlock()}`,
  );
  return InitAction.append(label, "appended graft mcp server");
}
