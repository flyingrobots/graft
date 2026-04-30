import { writeLine, type Writer } from "./peer-command.js";

const CLI_DOCS_PATH = "docs/CLI.md";

interface CliErrorDetails {
  readonly usage?: string | undefined;
  readonly nextSteps?: readonly string[] | undefined;
  readonly docsPath?: string | undefined;
}

export function writeCliError(
  writer: Writer,
  message: string,
  details: CliErrorDetails = {},
): void {
  writeLine(writer, `Error: ${message}`);
  if (details.usage !== undefined) {
    writeLine(writer);
    writeLine(writer, `Usage: ${details.usage}`);
  }
  const nextSteps = details.nextSteps ?? [];
  if (nextSteps.length > 0) {
    writeLine(writer);
    for (const step of nextSteps) {
      writeLine(writer, step);
    }
  }
  writeLine(writer);
  writeLine(writer, `See ${details.docsPath ?? CLI_DOCS_PATH} for grouped command help.`);
}

export function describeCliFailure(argv: readonly string[]): CliErrorDetails {
  const [group, subcommand] = argv;
  if (group === undefined) {
    return {
      nextSteps: ["Run `graft help` to see the available command groups."],
    };
  }

  if (group === "serve") {
    return {
      usage: "graft serve [--runtime <repo-local|daemon>] [--socket <path>] [--no-autostart]",
      nextSteps: [
        "`graft serve` is repo-local stdio. Use `graft serve --runtime daemon` for the daemon-backed stdio bridge.",
      ],
    };
  }

  if (group === "daemon") {
    if (subcommand === "status") {
      return {
        usage: "graft daemon status [--socket <path>]",
        nextSteps: ["Start the daemon with `graft daemon` or target another daemon with `--socket <path>`."],
      };
    }
    return {
      usage: "graft daemon [--socket <path>] | graft daemon status [--socket <path>]",
      nextSteps: ["Run `graft daemon status` to inspect an already-running daemon without mutating daemon state."],
    };
  }

  if (group === "doctor") {
    return { usage: "graft doctor [--sludge] [--path <path>] [--json]" };
  }

  if (group === "index") {
    return {
      usage: "graft index [--path <path>] [--json]",
      nextSteps: ["Use `--path <path>` for lazy per-file indexing and `--json` for machine-readable output."],
    };
  }

  if (group === "enhance") {
    return {
      usage: "git-graft enhance --since <ref> [--head <ref>] [--json]",
      nextSteps: [
        "Use `git graft enhance --since <ref>` after package install, or `git-graft enhance --since <ref>` via the direct binary.",
      ],
    };
  }

  if (group === "init") {
    return {
      usage:
        "graft init [--json] [--mcp-runtime <repo-local|daemon>] [--write-claude-mcp] [--write-claude-hooks] "
        + "[--write-target-git-hooks] [--write-codex-mcp] [--write-cursor-mcp] "
        + "[--write-windsurf-mcp] [--write-continue-mcp] [--write-cline-mcp]",
      nextSteps: ["Run `graft help` to confirm the repo-local bootstrap surfaces."],
    };
  }

  if (group === "read") {
    if (subcommand === "safe") {
      return { usage: "graft read safe <path> [--json]" };
    }
    if (subcommand === "outline") {
      return { usage: "graft read outline <path> [--json]" };
    }
    if (subcommand === "range") {
      return { usage: "graft read range <path> --start <n> --end <n> [--json]" };
    }
    if (subcommand === "changed") {
      return { usage: "graft read changed <path> [--consume] [--json]" };
    }
    return {
      usage: "graft read <safe|outline|range|changed> ...",
      nextSteps: ["Run `graft help` to see the available read subcommands."],
    };
  }

  if (group === "struct") {
    if (subcommand === "diff") {
      return { usage: "graft struct diff [--base <ref>] [--head <ref>] [--path <path>] [--json]" };
    }
    if (subcommand === "since") {
      return { usage: "graft struct since <base-ref> [--head <ref>] [--json]" };
    }
    if (subcommand === "map") {
      return { usage: "graft struct map [<directory>] [--json]" };
    }
    if (subcommand === "churn") {
      return { usage: "graft struct churn [--path <path>] [--limit <n>] [--json]" };
    }
    if (subcommand === "exports") {
      return { usage: "graft struct exports [<base-ref> <head-ref>] [--json]" };
    }
    if (subcommand === "log") {
      return { usage: "graft struct log [--path <path>] [--limit <n>] [--json]" };
    }
    if (subcommand === "review") {
      return { usage: "graft struct review [--base <ref>] [--head <ref>] [--json]" };
    }
    return {
      usage: "graft struct <diff|since|map|churn|exports|log|review> ...",
      nextSteps: ["Run `graft help` to see the available structural subcommands."],
    };
  }

  if (group === "symbol") {
    if (subcommand === "find") {
      return { usage: "graft symbol find <query> [--kind <kind>] [--path <path>] [--json]" };
    }
    if (subcommand === "show") {
      return { usage: "graft symbol show <symbol> [--path <path>] [--ref <ref>] [--json]" };
    }
    if (subcommand === "blame") {
      return { usage: "graft symbol blame <symbol> [--path <path>] [--json]" };
    }
    if (subcommand === "difficulty") {
      return { usage: "graft symbol difficulty <symbol> [--path <path>] [--limit <n>] [--json]" };
    }
    return {
      usage: "graft symbol <find|show|blame|difficulty> ...",
      nextSteps: ["Run `graft help` to see the available symbol subcommands."],
    };
  }

  if (group === "migrate") {
    return {
      usage: "graft migrate local-history [--json]",
    };
  }

  if (group === "diag") {
    if (subcommand === "activity") {
      return { usage: "graft diag activity [--limit <n>] [--json]" };
    }
    if (subcommand === "local-history-dag") {
      return { usage: "graft diag local-history-dag [--limit <n>] [--json]" };
    }
    if (subcommand === "doctor") {
      return { usage: "graft diag doctor [--sludge] [--path <path>] [--json]" };
    }
    if (subcommand === "explain") {
      return { usage: "graft diag explain <reason-code> [--json]" };
    }
    if (subcommand === "stats") {
      return { usage: "graft diag stats [--json]" };
    }
    if (subcommand === "capture") {
      return { usage: "graft diag capture [--tail <n>] -- <shell command> [--json]" };
    }
    return {
      usage: "graft diag <activity|local-history-dag|doctor|explain|stats|capture> ...",
      nextSteps: ["Run `graft help` to see the available diagnostic subcommands."],
    };
  }

  return {
    nextSteps: ["Run `graft help` to see the available command groups."],
  };
}
