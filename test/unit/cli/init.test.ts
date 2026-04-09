import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { runInit } from "../../../src/cli/init.js";

interface Writer {
  text(): string;
  write(chunk: string): true;
}

function createBufferWriter(): Writer {
  let buffer = "";
  return {
    write(chunk: string): true {
      buffer += chunk;
      return true;
    },
    text(): string {
      return buffer;
    },
  };
}

function runInitQuietly(args?: readonly string[]): void {
  runInit({
    args,
    stdout: createBufferWriter(),
    stderr: createBufferWriter(),
  });
}

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
    runInitQuietly();
    expect(fs.existsSync(path.join(tmpDir, ".graftignore"))).toBe(true);
    const content = fs.readFileSync(path.join(tmpDir, ".graftignore"), "utf-8");
    expect(content).toContain("Graft ignore patterns");
  });

  it("creates .gitignore with .graft/ entry", () => {
    runInitQuietly();
    const content = fs.readFileSync(path.join(tmpDir, ".gitignore"), "utf-8");
    expect(content).toContain(".graft/");
  });

  it("appends to existing .gitignore without duplicating", () => {
    fs.writeFileSync(path.join(tmpDir, ".gitignore"), "node_modules/\n");
    runInitQuietly();
    const content = fs.readFileSync(path.join(tmpDir, ".gitignore"), "utf-8");
    expect(content).toContain("node_modules/");
    expect(content).toContain(".graft/");
    // Run again — should not duplicate
    runInitQuietly();
    const after = fs.readFileSync(path.join(tmpDir, ".gitignore"), "utf-8");
    const count = (after.match(/\.graft\//g) ?? []).length;
    expect(count).toBe(1);
  });

  it("creates CLAUDE.md with agent instructions", () => {
    runInitQuietly();
    const content = fs.readFileSync(path.join(tmpDir, "CLAUDE.md"), "utf-8");
    expect(content).toContain("safe_read");
    expect(content).toContain("file_outline");
    expect(content).toContain("set_budget");
  });

  it("appends to existing CLAUDE.md without duplicating", () => {
    fs.writeFileSync(path.join(tmpDir, "CLAUDE.md"), "# My Project\n\nExisting content.\n");
    runInitQuietly();
    const content = fs.readFileSync(path.join(tmpDir, "CLAUDE.md"), "utf-8");
    expect(content).toContain("My Project");
    expect(content).toContain("safe_read");
    // Run again — should not duplicate
    runInitQuietly();
    const after = fs.readFileSync(path.join(tmpDir, "CLAUDE.md"), "utf-8");
    const count = (after.match(/safe_read/g) ?? []).length;
    expect(count).toBeGreaterThanOrEqual(1);
    // Only one snippet block
    const snippetCount = (after.match(/## File reads/g) ?? []).length;
    expect(snippetCount).toBe(1);
  });

  it("does not overwrite existing .graftignore", () => {
    fs.writeFileSync(path.join(tmpDir, ".graftignore"), "custom-pattern\n");
    runInitQuietly();
    const content = fs.readFileSync(path.join(tmpDir, ".graftignore"), "utf-8");
    expect(content).toBe("custom-pattern\n");
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
    runInitQuietly(["--write-claude-mcp", "--write-claude-hooks"]);

    const mcpConfig = JSON.parse(fs.readFileSync(path.join(tmpDir, ".mcp.json"), "utf-8")) as {
      mcpServers: { graft: { command: string; args: string[] } };
    };
    expect(mcpConfig.mcpServers.graft.command).toBe("npx");
    expect(mcpConfig.mcpServers.graft.args).toEqual(["-y", "@flyingrobots/graft", "serve"]);

    const settings = JSON.parse(fs.readFileSync(path.join(tmpDir, ".claude", "settings.json"), "utf-8")) as {
      hooks: {
        PreToolUse: { matcher: string; hooks: { command: string }[] }[];
        PostToolUse: { matcher: string; hooks: { command: string }[] }[];
      };
    };
    expect(settings.hooks.PreToolUse[0]).toBeDefined();
    expect(settings.hooks.PostToolUse[0]).toBeDefined();
    expect(settings.hooks.PreToolUse[0]!.hooks[0]).toBeDefined();
    expect(settings.hooks.PostToolUse[0]!.hooks[0]).toBeDefined();
    expect(settings.hooks.PreToolUse[0]!.hooks[0]!.command).toContain("pretooluse-read.ts");
    expect(settings.hooks.PostToolUse[0]!.hooks[0]!.command).toContain("posttooluse-read.ts");
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

    runInitQuietly(["--write-claude-mcp"]);
    runInitQuietly(["--write-claude-mcp"]);

    const config = JSON.parse(fs.readFileSync(path.join(tmpDir, ".mcp.json"), "utf-8")) as {
      mcpServers: Record<string, { command: string; args: string[] }>;
    };
    expect(config.mcpServers["think"]).toEqual({
      command: "node",
      args: ["./bin/think-mcp.js"],
    });
    expect(config.mcpServers["graft"]).toEqual({
      command: "npx",
      args: ["-y", "@flyingrobots/graft", "serve"],
    });
    expect(Object.keys(config.mcpServers).filter((name) => name === "graft")).toHaveLength(1);
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

    runInitQuietly(["--write-claude-hooks"]);
    runInitQuietly(["--write-claude-hooks"]);

    const settings = JSON.parse(fs.readFileSync(path.join(tmpDir, ".claude", "settings.json"), "utf-8")) as {
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
    expect(readPreTool!.hooks[0]).toBeDefined();
    expect(readPreTool!.hooks[0]!.command).toContain("pretooluse-read.ts");

    const readPostTool = settings.hooks.PostToolUse.find((entry) => entry.matcher === "Read");
    expect(readPostTool).toBeDefined();
    expect(readPostTool?.hooks.some((hook) => hook.command.includes("already-here"))).toBe(true);
    const graftPostHooks = readPostTool?.hooks.filter((hook) => hook.command.includes("posttooluse-read.ts")) ?? [];
    expect(graftPostHooks).toHaveLength(1);
  });

  it("appends Codex MCP config without duplicating the graft block", () => {
    fs.mkdirSync(path.join(tmpDir, ".codex"), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, ".codex", "config.toml"), [
      "[mcp_servers.think]",
      "command = \"node\"",
      "args = [\"./bin/think-mcp.js\"]",
      "",
    ].join("\n"));

    runInitQuietly(["--write-codex-mcp"]);
    runInitQuietly(["--write-codex-mcp"]);

    const config = fs.readFileSync(path.join(tmpDir, ".codex", "config.toml"), "utf-8");
    expect(config).toContain("[mcp_servers.think]");
    expect(config).toContain("[mcp_servers.graft]");
    expect(config).toContain("startup_timeout_sec = 120");
    const graftBlockCount = (config.match(/\[mcp_servers\.graft\]/g) ?? []).length;
    expect(graftBlockCount).toBe(1);
  });

  it("upgrades an existing Codex graft block with the safer startup timeout", () => {
    fs.mkdirSync(path.join(tmpDir, ".codex"), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, ".codex", "config.toml"), [
      "[mcp_servers.graft]",
      "command = \"npx\"",
      "args = [\"-y\", \"@flyingrobots/graft\", \"serve\"]",
      "",
    ].join("\n"));

    runInitQuietly(["--write-codex-mcp"]);

    const config = fs.readFileSync(path.join(tmpDir, ".codex", "config.toml"), "utf-8");
    expect(config).toContain("startup_timeout_sec = 120");
    const timeoutCount = (config.match(/startup_timeout_sec = 120/g) ?? []).length;
    expect(timeoutCount).toBe(1);
  });

  it("writes AGENTS.md guidance when bootstrapping Codex", () => {
    runInitQuietly(["--write-codex-mcp"]);

    const content = fs.readFileSync(path.join(tmpDir, "AGENTS.md"), "utf-8");
    expect(content).toContain("safe_read");
    expect(content).toContain("file_outline");
    expect(content).toContain("set_budget");
  });

  it("appends to existing AGENTS.md without duplicating the graft guidance", () => {
    fs.writeFileSync(path.join(tmpDir, "AGENTS.md"), "# Team Rules\n\nExisting content.\n");

    runInitQuietly(["--write-codex-mcp"]);
    runInitQuietly(["--write-codex-mcp"]);

    const content = fs.readFileSync(path.join(tmpDir, "AGENTS.md"), "utf-8");
    expect(content).toContain("Team Rules");
    expect(content).toContain("safe_read");
    const snippetCount = (content.match(/## File reads/g) ?? []).length;
    expect(snippetCount).toBe(1);
  });

  it("writes project-local config for the other supported clients with explicit flags", () => {
    runInitQuietly([
      "--write-cursor-mcp",
      "--write-windsurf-mcp",
      "--write-continue-mcp",
      "--write-cline-mcp",
    ]);

    const cursor = JSON.parse(fs.readFileSync(path.join(tmpDir, ".cursor", "mcp.json"), "utf-8")) as {
      mcpServers: { graft: { command: string; args: string[] } };
    };
    expect(cursor.mcpServers.graft.args).toEqual(["-y", "@flyingrobots/graft", "serve"]);

    const windsurf = JSON.parse(fs.readFileSync(path.join(tmpDir, ".codeium", "windsurf", "mcp_config.json"), "utf-8")) as {
      mcpServers: { graft: { command: string; args: string[] } };
    };
    expect(windsurf.mcpServers.graft.command).toBe("npx");

    const continueConfig = JSON.parse(fs.readFileSync(path.join(tmpDir, ".continue", "config.json"), "utf-8")) as {
      mcpServers: { name: string; command: string; args: string[] }[];
    };
    expect(continueConfig.mcpServers[0]).toBeDefined();
    expect(continueConfig.mcpServers[0]!.name).toBe("graft");
    expect(continueConfig.mcpServers[0]!.args).toEqual(["-y", "@flyingrobots/graft", "serve"]);

    const cline = JSON.parse(fs.readFileSync(path.join(tmpDir, ".vscode", "cline_mcp_settings.json"), "utf-8")) as {
      mcpServers: { graft: { command: string; args: string[] } };
    };
    expect(cline.mcpServers.graft.command).toBe("npx");
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

    runInitQuietly(["--write-cursor-mcp"]);
    runInitQuietly(["--write-cursor-mcp"]);

    const config = JSON.parse(fs.readFileSync(path.join(tmpDir, ".cursor", "mcp.json"), "utf-8")) as {
      mcpServers: Record<string, { command: string; args: string[] }>;
    };
    expect(config.mcpServers["think"]).toEqual({
      command: "node",
      args: ["./bin/think-mcp.js"],
    });
    expect(config.mcpServers["graft"]).toEqual({
      command: "npx",
      args: ["-y", "@flyingrobots/graft", "serve"],
    });
    expect(Object.keys(config.mcpServers).filter((name) => name === "graft")).toHaveLength(1);
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

    runInitQuietly(["--write-windsurf-mcp"]);
    runInitQuietly(["--write-windsurf-mcp"]);

    const config = JSON.parse(fs.readFileSync(path.join(tmpDir, ".codeium", "windsurf", "mcp_config.json"), "utf-8")) as {
      mcpServers: Record<string, { command: string; args: string[] }>;
    };
    expect(config.mcpServers["think"]).toEqual({
      command: "node",
      args: ["./bin/think-mcp.js"],
    });
    expect(config.mcpServers["graft"]).toEqual({
      command: "npx",
      args: ["-y", "@flyingrobots/graft", "serve"],
    });
    expect(Object.keys(config.mcpServers).filter((name) => name === "graft")).toHaveLength(1);
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

    runInitQuietly(["--write-continue-mcp"]);
    runInitQuietly(["--write-continue-mcp"]);

    const config = JSON.parse(fs.readFileSync(path.join(tmpDir, ".continue", "config.json"), "utf-8")) as {
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
    const graftEntries = config.mcpServers.filter((entry) => entry.name === "graft");
    expect(graftEntries).toHaveLength(1);
    expect(graftEntries[0]!.args).toEqual(["-y", "@flyingrobots/graft", "serve"]);
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

    runInitQuietly(["--write-cline-mcp"]);
    runInitQuietly(["--write-cline-mcp"]);

    const config = JSON.parse(fs.readFileSync(path.join(tmpDir, ".vscode", "cline_mcp_settings.json"), "utf-8")) as {
      mcpServers: Record<string, { command: string; args: string[] }>;
    };
    expect(config.mcpServers["think"]).toEqual({
      command: "node",
      args: ["./bin/think-mcp.js"],
    });
    expect(config.mcpServers["graft"]).toEqual({
      command: "npx",
      args: ["-y", "@flyingrobots/graft", "serve"],
    });
    expect(Object.keys(config.mcpServers).filter((name) => name === "graft")).toHaveLength(1);
  });
});
