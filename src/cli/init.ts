import * as fs from "node:fs";
import * as path from "node:path";

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

const HOOKS_CONFIG = `
Add to .claude/settings.json for Claude Code hook integration:

{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Read",
        "hooks": [
          {
            "type": "command",
            "command": "node --import tsx node_modules/@flyingrobots/graft/src/hooks/pretooluse-read.ts"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Read",
        "hooks": [
          {
            "type": "command",
            "command": "node --import tsx node_modules/@flyingrobots/graft/src/hooks/posttooluse-read.ts"
          }
        ]
      }
    ]
  }
}
`;

function writeIfMissing(filePath: string, content: string, label: string): void {
  if (fs.existsSync(filePath)) {
    console.log(`  exists  ${label}`);
  } else {
    fs.writeFileSync(filePath, content);
    console.log(`  create  ${label}`);
  }
}

function appendIfMissing(filePath: string, marker: string, content: string, label: string): void {
  if (fs.existsSync(filePath)) {
    const existing = fs.readFileSync(filePath, "utf-8");
    if (existing.includes(marker)) {
      console.log(`  exists  ${label} (already has graft entry)`);
      return;
    }
    fs.appendFileSync(filePath, content);
    console.log(`  append  ${label}`);
  } else {
    fs.writeFileSync(filePath, content.trimStart());
    console.log(`  create  ${label}`);
  }
}

export function runInit(): void {
  const cwd = process.cwd();
  console.log(`\nInitializing graft in ${cwd}\n`);

  // 1. .graftignore
  writeIfMissing(path.join(cwd, ".graftignore"), GRAFTIGNORE_TEMPLATE, ".graftignore");

  // 2. .gitignore — append .graft/
  appendIfMissing(path.join(cwd, ".gitignore"), ".graft/", GITIGNORE_ENTRY, ".gitignore");

  // 3. CLAUDE.md — append agent instructions snippet
  appendIfMissing(path.join(cwd, "CLAUDE.md"), "safe_read", "\n" + AGENT_SNIPPET, "CLAUDE.md");

  // 4. Print hooks config for manual setup
  console.log(HOOKS_CONFIG);

  console.log("Done. Add graft to your MCP config:\n");
  console.log(`  {
    "mcpServers": {
      "graft": {
        "command": "npx",
        "args": ["-y", "@flyingrobots/graft"]
      }
    }
  }
`);
}
