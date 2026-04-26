import * as path from "node:path";
import { appendIfMissing, ensureTargetGitHooks, mergeClaudeHooksConfig, mergeClaudeMcpConfig, mergeClineMcpConfig, mergeCodexMcpConfig, mergeContinueMcpConfig, mergeCursorMcpConfig, mergeWindsurfMcpConfig, writeIfMissing } from "./init-bootstrap.js";
import { writeCliError } from "./cli-error.js";
import { GRAFT_HOOKS_CONFIG, GraftMcpServer, InitFailure, InitResult, ParsedInitArgs } from "./init-model.js";
import { emitInitJson, renderInitText } from "./init-render.js";

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

function initProject(cwd: string, args: ParsedInitArgs): InitResult {
  const mcpServer = new GraftMcpServer(args.mcpRuntime);
  const updateExistingMcp = args.mcpRuntimeExplicit;
  const actions = [
    writeIfMissing(path.join(cwd, ".graftignore"), GRAFTIGNORE_TEMPLATE, ".graftignore"),
    appendIfMissing(path.join(cwd, ".gitignore"), ".graft/", GITIGNORE_ENTRY, ".gitignore"),
    appendIfMissing(path.join(cwd, "CLAUDE.md"), READ_GUIDANCE_MARKER, `\n${AGENT_SNIPPET}`, "CLAUDE.md"),
  ];

  if (args.writeClaudeMcp) {
    actions.push(mergeClaudeMcpConfig(cwd, mcpServer, updateExistingMcp));
  }
  if (args.writeClaudeHooks) {
    actions.push(mergeClaudeHooksConfig(cwd));
  }
  if (args.writeTargetGitHooks) {
    actions.push(...ensureTargetGitHooks(cwd));
  }
  if (args.writeCodexMcp) {
    actions.push(mergeCodexMcpConfig(cwd, mcpServer, updateExistingMcp));
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
    actions.push(mergeCursorMcpConfig(cwd, mcpServer, updateExistingMcp));
  }
  if (args.writeWindsurfMcp) {
    actions.push(mergeWindsurfMcpConfig(cwd, mcpServer, updateExistingMcp));
  }
  if (args.writeContinueMcp) {
    actions.push(mergeContinueMcpConfig(cwd, mcpServer, updateExistingMcp));
  }
  if (args.writeClineMcp) {
    actions.push(mergeClineMcpConfig(cwd, mcpServer, updateExistingMcp));
  }

  return new InitResult(cwd, actions, GRAFT_HOOKS_CONFIG, mcpServer);
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
    if (args.includes("--json")) {
      emitInitJson(new InitFailure(cwd, message), stdout);
      return;
    }
    writeCliError(stderr, message, {
      usage:
        "graft init [--json] [--mcp-runtime <repo-local|daemon>] [--write-claude-mcp] [--write-claude-hooks] "
        + "[--write-target-git-hooks] [--write-codex-mcp] [--write-cursor-mcp] "
        + "[--write-windsurf-mcp] [--write-continue-mcp] [--write-cline-mcp]",
      nextSteps: [
        "Use explicit --write-*-mcp flags to bootstrap project-local client config files.",
        "Use --write-target-git-hooks only inside a git worktree.",
      ],
    });
  }
}
