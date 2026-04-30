// ---------------------------------------------------------------------------
// Conversation Primer — auto-orient agent at session start via graft_map
// ---------------------------------------------------------------------------

import type { GitClient } from "../ports/git.js";
import type { FileSystem } from "../ports/filesystem.js";
import type { PathOps } from "../ports/paths.js";

/** Result of building a conversation primer. */
export interface ConversationPrimerResult {
  readonly scope: string;
  readonly files: readonly string[];
  readonly truncated: boolean;
  readonly totalFiles: number;
}

/** Options for building a primer. */
export interface ConversationPrimerOptions {
  readonly cwd: string;
  readonly git: GitClient;
  readonly fs: FileSystem;
  readonly pathOps: PathOps;
  readonly scope?: string;
  readonly maxFiles?: number;
}

/** Common source directory names, in priority order. */
const COMMON_SCOPES = ["src", "lib", "app", "packages"];

async function isDirectory(fileSystem: FileSystem, dirPath: string): Promise<boolean> {
  try {
    await fileSystem.readdir(dirPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Build a conversation primer for the given project.
 *
 * Auto-detects the best scope (src/, lib/, etc.) or uses an explicit
 * scope. Returns a list of tracked files, truncated if beyond maxFiles.
 */
export async function buildConversationPrimer(
  options: ConversationPrimerOptions,
): Promise<ConversationPrimerResult> {
  const { cwd, git, fs: fileSystem, pathOps, maxFiles = 50 } = options;

  // Detect scope
  let scope = options.scope ?? ".";
  if (options.scope === undefined) {
    for (const candidate of COMMON_SCOPES) {
      const candidatePath = pathOps.join(cwd, candidate);
      if (await isDirectory(fileSystem, candidatePath)) {
        scope = candidate;
        break;
      }
    }
  }

  // List tracked files via git ls-files (allowed by plumbing)
  const lsResult = await git.run({
    cwd,
    args: ["ls-files", "--", scope],
  });

  const allFiles = lsResult.stdout
    .split("\n")
    .map((f) => f.trim())
    .filter((f) => f.length > 0);

  const truncated = allFiles.length > maxFiles;
  const files = truncated ? allFiles.slice(0, maxFiles) : allFiles;

  return {
    scope,
    files,
    truncated,
    totalFiles: allFiles.length,
  };
}
