import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { execSync } from "node:child_process";
import { runInit } from "../../../src/cli/init.js";
import { assertIsolatedGitTestDir } from "../../helpers/git.js";
import {
  createBufferWriter,
  expectDaemonGraftServerEntry,
  expectGraftServerEntry,
  expectSingleGraftServerArray,
  expectSingleGraftServerRecord,
  findAction,
  initGitRepo,
  readJsonFile,
  runInitJson,
  runInitQuietly,
} from "../../helpers/init.js";

describe("cli: graft init", () => {
  let tmpDir: string;
  let origCwd: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-init-"));
    origCwd = process.cwd();
    process.chdir(tmpDir);
  });

  afterEach(() => {
    process.chdir(origCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("creates .graftignore", () => {
    const result = runInitJson();
    expect(result.ok).toBe(true);
    const action = findAction(result, ".graftignore");
    expect(action.action).toBe("create");
    expect(fs.existsSync(path.join(tmpDir, ".graftignore"))).toBe(true);
  });

  it("creates .gitignore with .graft/ entry", () => {
    const result = runInitJson();
    expect(result.ok).toBe(true);
    const action = findAction(result, ".gitignore");
    expect(action.action).toBe("create");
  });

  it("appends to existing .gitignore without duplicating", () => {
    fs.writeFileSync(path.join(tmpDir, ".gitignore"), "node_modules/\n");

    const first = runInitJson();
    const firstAction = findAction(first, ".gitignore");
    expect(firstAction.action).toBe("append");

    // Run again — should report exists, not append again
    const second = runInitJson();
    const secondAction = findAction(second, ".gitignore");
    expect(secondAction.action).toBe("exists");
  });

  it("creates CLAUDE.md with agent instructions", () => {
    const result = runInitJson();
    expect(result.ok).toBe(true);
    const action = findAction(result, "CLAUDE.md");
    expect(action.action).toBe("create");
  });

  it("appends to existing CLAUDE.md without duplicating", () => {
    fs.writeFileSync(path.join(tmpDir, "CLAUDE.md"), "# My Project\n\nExisting content.\n");

    const first = runInitJson();
    const firstAction = findAction(first, "CLAUDE.md");
    expect(firstAction.action).toBe("append");

    // Run again — should report exists, not append again
    const second = runInitJson();
    const secondAction = findAction(second, "CLAUDE.md");
    expect(secondAction.action).toBe("exists");
  });

  it("does not overwrite existing .graftignore", () => {
    fs.writeFileSync(path.join(tmpDir, ".graftignore"), "custom-pattern\n");

    const result = runInitJson();
    const action = findAction(result, ".graftignore");
    expect(action.action).toBe("exists");
  });

  it("does not write client config files without explicit flags", () => {
    runInitQuietly();

    expect(fs.existsSync(path.join(tmpDir, ".mcp.json"))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, ".claude", "settings.json"))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, ".codex", "config.toml"))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, ".cursor", "mcp.json"))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, ".codeium", "windsurf", "mcp_config.json"))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, ".continue", "config.json"))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, ".vscode", "cline_mcp_settings.json"))).toBe(false);
  });

  it("writes project-local Claude config with explicit flags", () => {
    const result = runInitJson(["--write-claude-mcp", "--write-claude-hooks"]);
    expect(result.ok).toBe(true);

    const mcpAction = findAction(result, ".mcp.json");
    expect(mcpAction.action).toBe("create");

    const hooksAction = findAction(result, ".claude/settings.json");
    expect(hooksAction.action).toBe("create");

    const mcpConfig = readJsonFile(tmpDir, ".mcp.json") as {
      mcpServers: { graft: { command: string; args: string[] } };
    };
    expectGraftServerEntry(mcpConfig.mcpServers.graft);

    const hooksConfig = readJsonFile(tmpDir, ".claude", "settings.json") as {
      hooks: {
        PreToolUse: { hooks: { command: string }[] }[];
        PostToolUse: { hooks: { command: string }[] }[];
      };
    };
    const hookCommands = [
      ...(hooksConfig.hooks.PreToolUse[0]?.hooks ?? []),
      ...(hooksConfig.hooks.PostToolUse[0]?.hooks ?? []),
    ].map((hook) => hook.command);
    expect(hookCommands).toEqual(expect.arrayContaining([
      "node node_modules/@flyingrobots/graft/dist/hooks/pretooluse-read.js",
      "node node_modules/@flyingrobots/graft/dist/hooks/posttooluse-read.js",
    ]));
    expect(hookCommands.every((command) => !command.includes("node --import tsx"))).toBe(true);
    expect(hookCommands.every((command) => !command.includes("/src/"))).toBe(true);
  });

  it("writes daemon-backed MCP config when the runtime is selected explicitly", () => {
    const result = runInitJson(["--mcp-runtime", "daemon", "--write-claude-mcp"]);
    expect(result.ok).toBe(true);
    expect(result["suggestedMcpServer"]).toEqual({
      mcpServers: {
        graft: {
          command: "npx",
          args: ["-y", "@flyingrobots/graft", "serve", "--runtime", "daemon"],
        },
      },
    });

    const mcpConfig = readJsonFile(tmpDir, ".mcp.json") as {
      mcpServers: { graft: { command: string; args: string[] } };
    };
    expectDaemonGraftServerEntry(mcpConfig.mcpServers.graft);
  });

  it("updates an existing graft MCP server only when runtime selection is explicit", () => {
    fs.writeFileSync(path.join(tmpDir, ".mcp.json"), JSON.stringify({
      mcpServers: {
        graft: {
          command: "npx",
          args: ["-y", "@flyingrobots/graft", "serve"],
        },
      },
    }, null, 2));

    const defaultResult = runInitJson(["--write-claude-mcp"]);
    expect(findAction(defaultResult, ".mcp.json").action).toBe("exists");

    const daemonResult = runInitJson(["--mcp-runtime", "daemon", "--write-claude-mcp"]);
    const action = findAction(daemonResult, ".mcp.json");
    expect(action.action).toBe("append");
    expect(action.detail).toBe("updated graft mcp server runtime to daemon");

    const mcpConfig = readJsonFile(tmpDir, ".mcp.json") as {
      mcpServers: { graft: { command: string; args: string[] } };
    };
    expectDaemonGraftServerEntry(mcpConfig.mcpServers.graft);
  });

  it("writes target-repo git transition hooks with an explicit flag", () => {
    initGitRepo(tmpDir);

    const result = runInitJson(["--write-target-git-hooks"]);
    expect(result.ok).toBe(true);

    // Verify actions report hook creation
    const postCheckoutAction = findAction(result, ".git/hooks/post-checkout");
    expect(postCheckoutAction.action).toBe("create");
    const postMergeAction = findAction(result, ".git/hooks/post-merge");
    expect(postMergeAction.action).toBe("create");
    const postRewriteAction = findAction(result, ".git/hooks/post-rewrite");
    expect(postRewriteAction.action).toBe("create");

    // Verify hooks are executable by running one
    assertIsolatedGitTestDir(tmpDir);
    expect(() => {
      execSync("sh .git/hooks/post-checkout oldsha newsha 1", { cwd: tmpDir, stdio: "ignore" });
    }).not.toThrow();
  });

  it("respects configured core.hooksPath and preserves external target-repo hooks", () => {
    initGitRepo(tmpDir);
    fs.mkdirSync(path.join(tmpDir, ".githooks"), { recursive: true });
    execSync("git config core.hooksPath .githooks", { cwd: tmpDir });
    fs.writeFileSync(path.join(tmpDir, ".githooks", "post-checkout"), "#!/bin/sh\necho external\n");

    const result = runInitJson(["--write-target-git-hooks"]);
    expect(result.ok).toBe(true);

    // External post-checkout should be preserved (exists, not overwritten)
    const postCheckoutAction = findAction(result, ".githooks/post-checkout");
    expect(postCheckoutAction.action).toBe("exists");
    expect(postCheckoutAction.detail).toBe("external hook preserved");

    // New hooks should be created at the custom hooksPath
    const postMergeAction = findAction(result, ".githooks/post-merge");
    expect(postMergeAction.action).toBe("create");
    const postRewriteAction = findAction(result, ".githooks/post-rewrite");
    expect(postRewriteAction.action).toBe("create");

    // Verify external hook still works
    assertIsolatedGitTestDir(tmpDir);
    const output = execSync("sh .githooks/post-checkout", { cwd: tmpDir, encoding: "utf-8" });
    expect(output.trim()).toBe("external");
  });

  it("installed target-repo git hooks append transition events when executed", () => {
    initGitRepo(tmpDir);
    const realWorktreeRoot = fs.realpathSync(tmpDir);

    runInitQuietly(["--write-target-git-hooks"]);
    assertIsolatedGitTestDir(tmpDir);
    execSync("sh .git/hooks/post-checkout oldsha newsha 1", { cwd: tmpDir, stdio: "ignore" });

    const logPath = path.join(tmpDir, ".graft", "runtime", "git-transitions.ndjson");
    expect(fs.existsSync(logPath)).toBe(true);
    const events = fs.readFileSync(logPath, "utf-8").trim().split("\n").map((line) => JSON.parse(line) as {
      hookName: string;
      hookArgs: string[];
      worktreeRoot: string;
    });

    expect(events.at(-1)).toEqual(
      expect.objectContaining({
        hookName: "post-checkout",
        hookArgs: ["oldsha", "newsha", "1"],
        worktreeRoot: realWorktreeRoot,
      }),
    );
  });

  it("returns a JSON error when target-repo hook bootstrap is requested outside a git worktree", () => {
    const stdout = createBufferWriter();
    const stderr = createBufferWriter();

    runInit({
      args: ["--json", "--write-target-git-hooks"],
      stdout,
      stderr,
    });

    const parsed = JSON.parse(stdout.text()) as {
      ok: boolean;
      error: string;
    };
    process.exitCode = 0;
    expect(parsed.ok).toBe(false);
    expect(parsed.error).toBe("--write-target-git-hooks requires a git worktree");
  });

  it("reports init argument errors with usage guidance", () => {
    const stdout = createBufferWriter();
    const stderr = createBufferWriter();

    runInit({
      args: ["--unknown-init-flag"],
      stdout,
      stderr,
    });

    expect(stdout.text()).toBe("");
    expect(stderr.text()).toContain("Unknown init arguments: --unknown-init-flag");
    expect(stderr.text()).toContain("Usage: graft init");
    expect(stderr.text()).toContain("docs/CLI.md");
    process.exitCode = 0;
  });

  it("merges Claude MCP config without clobbering existing servers or duplicating graft", () => {
    fs.writeFileSync(path.join(tmpDir, ".mcp.json"), JSON.stringify({
      mcpServers: {
        think: {
          command: "node",
          args: ["./bin/think-mcp.js"],
        },
      },
    }, null, 2));

    const first = runInitJson(["--write-claude-mcp"]);
    const firstAction = findAction(first, ".mcp.json");
    expect(firstAction.action).toBe("append");

    const second = runInitJson(["--write-claude-mcp"]);
    const secondAction = findAction(second, ".mcp.json");
    expect(secondAction.action).toBe("exists");

    const config = readJsonFile(tmpDir, ".mcp.json") as {
      mcpServers: Record<string, { command: string; args: string[] }>;
    };
    expect(config.mcpServers["think"]).toEqual({
      command: "node",
      args: ["./bin/think-mcp.js"],
    });
    expectSingleGraftServerRecord(config.mcpServers);
  });

  it("merges Claude hook config into an existing settings file without duplicating graft hooks", () => {
    fs.mkdirSync(path.join(tmpDir, ".claude"), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, ".claude", "settings.json"), JSON.stringify({
      theme: "dark",
      hooks: {
        PreToolUse: [
          {
            matcher: "Write",
            hooks: [
              { type: "command", command: "echo before-write" },
            ],
          },
        ],
        PostToolUse: [
          {
            matcher: "Read",
            hooks: [
              { type: "command", command: "echo already-here" },
            ],
          },
        ],
      },
    }, null, 2));

    const first = runInitJson(["--write-claude-hooks"]);
    const firstAction = findAction(first, ".claude/settings.json");
    expect(firstAction.action).toBe("append");

    // Run again — graft hooks should already be present
    runInitQuietly(["--write-claude-hooks"]);

    // Verify merged config preserves existing entries and doesn't duplicate graft hooks
    const settings = readJsonFile(tmpDir, ".claude", "settings.json") as {
      theme: string;
      hooks: {
        PreToolUse: { matcher: string; hooks: { command: string }[] }[];
        PostToolUse: { matcher: string; hooks: { command: string }[] }[];
      };
    };

    expect(settings.theme).toBe("dark");
    expect(settings.hooks.PreToolUse[0]).toBeDefined();
    expect(settings.hooks.PreToolUse[0]!.matcher).toBe("Write");
    const readPreTool = settings.hooks.PreToolUse.find((entry) => entry.matcher === "Read");
    expect(readPreTool).toBeDefined();

    const readPostTool = settings.hooks.PostToolUse.find((entry) => entry.matcher === "Read");
    expect(readPostTool).toBeDefined();
    expect(readPostTool?.hooks.some((hook) => hook.command.includes("already-here"))).toBe(true);
    // Ensure graft hooks were not duplicated
    const graftPostHooks = readPostTool?.hooks.filter((hook) => hook.command.includes("posttooluse-read.js")) ?? [];
    expect(graftPostHooks).toHaveLength(1);
  });

  it("migrates generated v0.7.0 Claude hook commands to dist entrypoints", () => {
    const preToolUseDist = "node node_modules/@flyingrobots/graft/dist/hooks/pretooluse-read.js";
    const postToolUseDist = "node node_modules/@flyingrobots/graft/dist/hooks/posttooluse-read.js";
    const preToolUseLegacy = "node --import tsx node_modules/@flyingrobots/graft/src/hooks/pretooluse-read.ts";
    const postToolUseLegacy = "node --import tsx node_modules/@flyingrobots/graft/src/hooks/posttooluse-read.ts";

    fs.mkdirSync(path.join(tmpDir, ".claude"), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, ".claude", "settings.json"), JSON.stringify({
      hooks: {
        PreToolUse: [
          {
            matcher: "Read",
            hooks: [
              {
                type: "command",
                command: preToolUseDist,
              },
              {
                type: "command",
                command: preToolUseLegacy,
              },
              {
                type: "command",
                command: preToolUseLegacy,
              },
            ],
          },
        ],
        PostToolUse: [
          {
            matcher: "Read",
            hooks: [
              { type: "command", command: "echo existing-post-read" },
              {
                type: "command",
                command: postToolUseDist,
              },
              {
                type: "command",
                command: postToolUseLegacy,
              },
              {
                type: "command",
                command: postToolUseLegacy,
              },
            ],
          },
        ],
      },
    }, null, 2));

    const result = runInitJson(["--write-claude-hooks"]);
    const action = findAction(result, ".claude/settings.json");
    expect(action.action).toBe("append");

    const settings = readJsonFile(tmpDir, ".claude", "settings.json") as {
      hooks: {
        PreToolUse: { matcher: string; hooks: { command: string }[] }[];
        PostToolUse: { matcher: string; hooks: { command: string }[] }[];
      };
    };
    const readPreTool = settings.hooks.PreToolUse.find((entry) => entry.matcher === "Read");
    const readPostTool = settings.hooks.PostToolUse.find((entry) => entry.matcher === "Read");
    const commands = [
      ...(readPreTool?.hooks ?? []),
      ...(readPostTool?.hooks ?? []),
    ].map((hook) => hook.command);

    expect(commands).toEqual(expect.arrayContaining([
      preToolUseDist,
      postToolUseDist,
      "echo existing-post-read",
    ]));
    expect(commands.filter((command) => command === preToolUseDist)).toHaveLength(1);
    expect(commands.filter((command) => command === postToolUseDist)).toHaveLength(1);
    expect(commands.some((command) => command.includes("node --import tsx"))).toBe(false);
    expect(commands.some((command) => command.includes("/src/hooks/"))).toBe(false);
  });

  it("appends Codex MCP config without duplicating the graft block", () => {
    fs.mkdirSync(path.join(tmpDir, ".codex"), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, ".codex", "config.toml"), [
      "[mcp_servers.think]",
      "command = \"node\"",
      "args = [\"./bin/think-mcp.js\"]",
      "",
    ].join("\n"));

    const first = runInitJson(["--write-codex-mcp"]);
    const firstAction = findAction(first, ".codex/config.toml");
    expect(firstAction.action).toBe("append");

    const second = runInitJson(["--write-codex-mcp"]);
    const secondAction = findAction(second, ".codex/config.toml");
    expect(secondAction.action).toBe("exists");
  });

  it("writes Codex daemon runtime args when selected explicitly", () => {
    const result = runInitJson(["--mcp-runtime", "daemon", "--write-codex-mcp"]);
    expect(result.ok).toBe(true);

    const config = fs.readFileSync(path.join(tmpDir, ".codex", "config.toml"), "utf-8");
    expect(config).toContain("args = [\"-y\", \"@flyingrobots/graft\", \"serve\", \"--runtime\", \"daemon\"]");
  });

  it("upgrades an existing Codex graft block with the safer startup timeout", () => {
    fs.mkdirSync(path.join(tmpDir, ".codex"), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, ".codex", "config.toml"), [
      "[mcp_servers.graft]",
      "command = \"npx\"",
      "args = [\"-y\", \"@flyingrobots/graft\", \"serve\"]",
      "",
    ].join("\n"));

    const result = runInitJson(["--write-codex-mcp"]);
    const action = findAction(result, ".codex/config.toml");
    expect(action.action).toBe("append");
    expect(action.detail).toBe("added graft startup timeout");
  });

  it("writes AGENTS.md guidance when bootstrapping Codex", () => {
    const result = runInitJson(["--write-codex-mcp"]);
    expect(result.ok).toBe(true);
    const action = findAction(result, "AGENTS.md");
    expect(action.action).toBe("create");
  });

  it("appends to existing AGENTS.md without duplicating the graft guidance", () => {
    fs.writeFileSync(path.join(tmpDir, "AGENTS.md"), "# Team Rules\n\nExisting content.\n");

    const first = runInitJson(["--write-codex-mcp"]);
    const firstAction = findAction(first, "AGENTS.md");
    expect(firstAction.action).toBe("append");

    const second = runInitJson(["--write-codex-mcp"]);
    const secondAction = findAction(second, "AGENTS.md");
    expect(secondAction.action).toBe("exists");
  });

  it("writes project-local config for the other supported clients with explicit flags", () => {
    const result = runInitJson([
      "--write-cursor-mcp",
      "--write-windsurf-mcp",
      "--write-continue-mcp",
      "--write-cline-mcp",
    ]);
    expect(result.ok).toBe(true);

    // Verify actions report creation
    expect(findAction(result, ".cursor/mcp.json").action).toBe("create");
    expect(findAction(result, ".codeium/windsurf/mcp_config.json").action).toBe("create");
    expect(findAction(result, ".continue/config.json").action).toBe("create");
    expect(findAction(result, ".vscode/cline_mcp_settings.json").action).toBe("create");

    // Verify the graft server entry in each config matches the expected shape
    const cursor = readJsonFile(tmpDir, ".cursor", "mcp.json") as {
      mcpServers: { graft: { command: string; args: string[] } };
    };
    expectGraftServerEntry(cursor.mcpServers.graft);

    const continueConfig = readJsonFile(tmpDir, ".continue", "config.json") as {
      mcpServers: { name: string; command: string; args: string[] }[];
    };
    expect(continueConfig.mcpServers[0]).toBeDefined();
    expect(continueConfig.mcpServers[0]!.name).toBe("graft");
    expectGraftServerEntry({
      command: continueConfig.mcpServers[0]!.command,
      args: continueConfig.mcpServers[0]!.args,
    });
  });

  it("writes daemon-backed config for every supported JSON MCP client", () => {
    const result = runInitJson([
      "--mcp-runtime",
      "daemon",
      "--write-cursor-mcp",
      "--write-windsurf-mcp",
      "--write-continue-mcp",
      "--write-cline-mcp",
    ]);
    expect(result.ok).toBe(true);

    const cursor = readJsonFile(tmpDir, ".cursor", "mcp.json") as {
      mcpServers: { graft: { command: string; args: string[] } };
    };
    expectDaemonGraftServerEntry(cursor.mcpServers.graft);

    const windsurf = readJsonFile(tmpDir, ".codeium", "windsurf", "mcp_config.json") as {
      mcpServers: { graft: { command: string; args: string[] } };
    };
    expectDaemonGraftServerEntry(windsurf.mcpServers.graft);

    const continueConfig = readJsonFile(tmpDir, ".continue", "config.json") as {
      mcpServers: { name: string; command: string; args: string[] }[];
    };
    expect(continueConfig.mcpServers[0]).toBeDefined();
    expect(continueConfig.mcpServers[0]!.name).toBe("graft");
    expectDaemonGraftServerEntry({
      command: continueConfig.mcpServers[0]!.command,
      args: continueConfig.mcpServers[0]!.args,
    });

    const cline = readJsonFile(tmpDir, ".vscode", "cline_mcp_settings.json") as {
      mcpServers: { graft: { command: string; args: string[] } };
    };
    expectDaemonGraftServerEntry(cline.mcpServers.graft);
  });

  it("merges Cursor MCP config without clobbering existing servers or duplicating graft", () => {
    fs.mkdirSync(path.join(tmpDir, ".cursor"), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, ".cursor", "mcp.json"), JSON.stringify({
      mcpServers: {
        think: {
          command: "node",
          args: ["./bin/think-mcp.js"],
        },
      },
    }, null, 2));

    const first = runInitJson(["--write-cursor-mcp"]);
    expect(findAction(first, ".cursor/mcp.json").action).toBe("append");

    const second = runInitJson(["--write-cursor-mcp"]);
    expect(findAction(second, ".cursor/mcp.json").action).toBe("exists");

    const config = readJsonFile(tmpDir, ".cursor", "mcp.json") as {
      mcpServers: Record<string, { command: string; args: string[] }>;
    };
    expect(config.mcpServers["think"]).toEqual({
      command: "node",
      args: ["./bin/think-mcp.js"],
    });
    expectSingleGraftServerRecord(config.mcpServers);
  });

  it("merges Windsurf MCP config without clobbering existing servers or duplicating graft", () => {
    fs.mkdirSync(path.join(tmpDir, ".codeium", "windsurf"), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, ".codeium", "windsurf", "mcp_config.json"), JSON.stringify({
      mcpServers: {
        think: {
          command: "node",
          args: ["./bin/think-mcp.js"],
        },
      },
    }, null, 2));

    const first = runInitJson(["--write-windsurf-mcp"]);
    expect(findAction(first, ".codeium/windsurf/mcp_config.json").action).toBe("append");

    const second = runInitJson(["--write-windsurf-mcp"]);
    expect(findAction(second, ".codeium/windsurf/mcp_config.json").action).toBe("exists");

    const config = readJsonFile(tmpDir, ".codeium", "windsurf", "mcp_config.json") as {
      mcpServers: Record<string, { command: string; args: string[] }>;
    };
    expect(config.mcpServers["think"]).toEqual({
      command: "node",
      args: ["./bin/think-mcp.js"],
    });
    expectSingleGraftServerRecord(config.mcpServers);
  });

  it("merges Continue MCP config into an existing settings file without duplicating graft", () => {
    fs.mkdirSync(path.join(tmpDir, ".continue"), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, ".continue", "config.json"), JSON.stringify({
      models: [
        { title: "gpt-5", provider: "openai", model: "gpt-5" },
      ],
      mcpServers: [
        {
          name: "think",
          command: "node",
          args: ["./bin/think-mcp.js"],
        },
      ],
    }, null, 2));

    const first = runInitJson(["--write-continue-mcp"]);
    expect(findAction(first, ".continue/config.json").action).toBe("append");

    const second = runInitJson(["--write-continue-mcp"]);
    expect(findAction(second, ".continue/config.json").action).toBe("exists");

    const config = readJsonFile(tmpDir, ".continue", "config.json") as {
      models: { title: string }[];
      mcpServers: { name: string; command: string; args: string[] }[];
    };
    expect(config.models[0]).toBeDefined();
    expect(config.models[0]!.title).toBe("gpt-5");
    expect(config.mcpServers.find((entry) => entry.name === "think")).toEqual({
      name: "think",
      command: "node",
      args: ["./bin/think-mcp.js"],
    });
    expectSingleGraftServerArray(config.mcpServers);
  });

  it("merges Cline MCP config without clobbering existing servers or duplicating graft", () => {
    fs.mkdirSync(path.join(tmpDir, ".vscode"), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, ".vscode", "cline_mcp_settings.json"), JSON.stringify({
      mcpServers: {
        think: {
          command: "node",
          args: ["./bin/think-mcp.js"],
        },
      },
    }, null, 2));

    const first = runInitJson(["--write-cline-mcp"]);
    expect(findAction(first, ".vscode/cline_mcp_settings.json").action).toBe("append");

    const second = runInitJson(["--write-cline-mcp"]);
    expect(findAction(second, ".vscode/cline_mcp_settings.json").action).toBe("exists");

    const config = readJsonFile(tmpDir, ".vscode", "cline_mcp_settings.json") as {
      mcpServers: Record<string, { command: string; args: string[] }>;
    };
    expect(config.mcpServers["think"]).toEqual({
      command: "node",
      args: ["./bin/think-mcp.js"],
    });
    expectSingleGraftServerRecord(config.mcpServers);
  });
});
