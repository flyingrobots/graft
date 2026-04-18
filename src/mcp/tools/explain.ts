import { z } from "zod";
import type { ToolDefinition, ToolHandler } from "../context.js";

const EXPLANATIONS: Readonly<Record<string, { meaning: string; action: string }>> = {
  CONTENT: {
    meaning: "File is within size thresholds — full content returned.",
    action: "No action needed. You have the complete file.",
  },
  OUTLINE: {
    meaning: "File exceeds line or byte thresholds. Structural outline returned instead of content.",
    action: "Use read_range with the jump table to read specific sections. Do not re-request the full file.",
  },
  SESSION_CAP: {
    meaning: "Session-depth byte cap triggered. The file might fit static thresholds but exceeds the dynamic session cap.",
    action: "Use read_range for targeted reads. Consider whether you truly need this file at this stage of the session.",
  },
  BINARY: {
    meaning: "Binary file (image, PDF, etc.) cannot be usefully read as text.",
    action: "Use file_outline for metadata. Check for a text alternative.",
  },
  LOCKFILE: {
    meaning: "Machine-generated lockfile is not useful to read directly.",
    action: "Read the package manifest (package.json, Cargo.toml, etc.) for dependency info instead.",
  },
  MINIFIED: {
    meaning: "Minified file is not human-readable.",
    action: "Look for the unminified source file.",
  },
  BUILD_OUTPUT: {
    meaning: "File is in a build output directory (dist/, build/, .next/, etc.).",
    action: "Read the source in src/ instead of the compiled output.",
  },
  SECRET: {
    meaning: "File may contain secrets (keys, credentials, environment variables).",
    action: "Check for a .example or template version of this file.",
  },
  BUDGET_CAP: {
    meaning: "File exceeds the budget-proportional byte cap. No single read may consume more than 5% of remaining budget.",
    action: "Use file_outline or read_range for targeted reads. Consider whether this file is worth the budget cost.",
  },
  UNSUPPORTED_LANGUAGE: {
    meaning: "The file type has no parser-backed structural outline in the current build of Graft.",
    action: "Use read_range or a full read when appropriate. Do not treat the empty outline as parser-derived symbol structure.",
  },
  GRAFTIGNORE: {
    meaning: "File matches a pattern in .graftignore.",
    action: "Check .graftignore if you believe this file should be readable.",
  },
  REREAD_UNCHANGED: {
    meaning: "File was already read and has not changed. Cached outline returned.",
    action: "Use the cached outline and jump table. The file content has not changed since your last read.",
  },
  CHANGED_SINCE_LAST_READ: {
    meaning: "File changed since last read. Structural diff returned showing what changed.",
    action: "Review the diff to understand what changed. Use read_range for details on changed sections.",
  },
};

export const explainTool: ToolDefinition = {
  name: "explain",
  description:
    "Explain a graft reason code. Returns human-readable meaning and " +
    "recommended next action for any reason code returned by graft tools.",
  schema: { code: z.string() },
  createHandler(): ToolHandler {
    return (args, ctx) => {
      const code = (args["code"] as string).toUpperCase();
      const entry = EXPLANATIONS[code];
      if (entry === undefined) {
        const known = Object.keys(EXPLANATIONS).join(", ");
        return ctx.respond("explain", {
          code,
          error: "Unknown reason code",
          knownCodes: known,
        });
      }
      return ctx.respond("explain", {
        code,
        meaning: entry.meaning,
        action: entry.action,
      });
    };
  },
};
