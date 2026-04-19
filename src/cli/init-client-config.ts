import * as fs from "node:fs";
import * as path from "node:path";
import {
  GRAFT_HOOKS_CONFIG,
  GRAFT_MCP_SERVER,
  InitAction,
  type GraftHookMatcher,
} from "./init-model.js";
import {
  JsonArrayNode,
  JsonObjectDocument,
} from "./json-document.js";

class JsonMcpConfigDocument {
  constructor(
    private readonly document: JsonObjectDocument,
    private readonly server: typeof GRAFT_MCP_SERVER,
  ) {}

  static create(
    filePath: string,
    label: string,
    server: typeof GRAFT_MCP_SERVER,
  ): JsonMcpConfigDocument {
    return new JsonMcpConfigDocument(
      JsonObjectDocument.create(filePath, label, server.toJsonMcpConfig()),
      server,
    );
  }

  static open(
    filePath: string,
    label: string,
    server: typeof GRAFT_MCP_SERVER,
  ): JsonMcpConfigDocument {
    return new JsonMcpConfigDocument(
      JsonObjectDocument.open(filePath, label),
      server,
    );
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

  static create(
    filePath: string,
    label: string,
    server: typeof GRAFT_MCP_SERVER,
  ): ContinueMcpConfigDocument {
    return new ContinueMcpConfigDocument(
      JsonObjectDocument.create(filePath, label, server.toContinueConfig()),
      server,
    );
  }

  static open(
    filePath: string,
    label: string,
    server: typeof GRAFT_MCP_SERVER,
  ): ContinueMcpConfigDocument {
    return new ContinueMcpConfigDocument(
      JsonObjectDocument.open(filePath, label),
      server,
    );
  }

  write(): void {
    this.document.write();
  }

  ensureGraftServer(): InitAction {
    const root = this.document.root();
    const servers = root.ensureArray("mcpServers");
    const exists = servers
      .objectItems()
      .some((entry) => entry.stringValue("name") === this.server.name);
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
    const changed = this.mergeHookPhase(preToolUse, this.hooksConfig.preToolUse)
      || this.mergeHookPhase(postToolUse, this.hooksConfig.postToolUse);
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

export function ensureCodexStartupTimeout(
  existing: string,
): { content: string; changed: boolean } {
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

function ensureJsonMcpConfig(filePath: string, label: string): InitAction {
  if (!fs.existsSync(filePath)) {
    const created = JsonMcpConfigDocument.create(filePath, label, GRAFT_MCP_SERVER);
    created.write();
    return InitAction.create(label, "wrote graft mcp server");
  }
  return JsonMcpConfigDocument
    .open(filePath, label, GRAFT_MCP_SERVER)
    .ensureGraftServer();
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
  return ContinueMcpConfigDocument
    .open(filePath, label, GRAFT_MCP_SERVER)
    .ensureGraftServer();
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
  fs.writeFileSync(
    filePath,
    `${existing}${separator}${GRAFT_MCP_SERVER.toCodexTomlBlock()}`,
  );
  return InitAction.append(label, "appended graft mcp server");
}
