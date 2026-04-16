export type JsonPrimitive = string | number | boolean | null;
export type JsonArrayValue = JsonValue[];
export type JsonValue = JsonPrimitive | JsonArrayValue | JsonObjectValue;

export interface JsonObjectValue {
  [key: string]: JsonValue | undefined;
}

type InitActionKind = "exists" | "create" | "append";

export class InitAction {
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

export class InitFailure {
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

export class ParsedInitArgs {
  constructor(
    readonly json: boolean,
    readonly writeClaudeMcp: boolean,
    readonly writeClaudeHooks: boolean,
    readonly writeTargetGitHooks: boolean,
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
      consumeFlag(args, "--write-target-git-hooks"),
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

export class GraftMcpServer {
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

export class GraftHookCommand {
  constructor(readonly command: string) {}

  toJsonValue(): JsonObjectValue {
    return {
      type: "command",
      command: this.command,
    };
  }
}

export class GraftHookMatcher {
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

export class GraftHooksConfig {
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

export const GRAFT_MCP_SERVER = new GraftMcpServer();
export const GRAFT_HOOKS_CONFIG = new GraftHooksConfig(
  new GraftHookMatcher("Read", [
    new GraftHookCommand("node --import tsx node_modules/@flyingrobots/graft/src/hooks/pretooluse-read.ts"),
  ]),
  new GraftHookMatcher("Read", [
    new GraftHookCommand("node --import tsx node_modules/@flyingrobots/graft/src/hooks/posttooluse-read.ts"),
  ]),
);

export class InitResult {
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

export function isJsonObjectValue(value: unknown): value is JsonObjectValue {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function cloneJsonValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
