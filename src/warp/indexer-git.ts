import { diffOutlines } from "../parser/diff.js";
import { detectLang } from "../parser/lang.js";
import { extractOutline } from "../parser/outline.js";
import { getFileAtRef } from "../git/diff.js";
import type { OutlineEntry } from "../parser/types.js";
import type { GitClient } from "../ports/git.js";
import { buildJumpLookup, fileNodeId, type PreparedChange } from "./indexer-model.js";
import { parseStructuredTree } from "../parser/runtime.js";

async function git(gitClient: GitClient, cwd: string, args: readonly string[]): Promise<string> {
  const result = await gitClient.run({ cwd, args });
  if (result.error !== undefined || result.status !== 0) {
    throw result.error ?? new Error(result.stderr.trim() || `git exited with status ${String(result.status)}`);
  }
  return result.stdout;
}

export async function listCommits(
  gitClient: GitClient,
  cwd: string,
  from?: string,
  to?: string,
): Promise<string[]> {
  const range = from !== undefined ? `${from}..${to ?? "HEAD"}` : to ?? "HEAD";
  const args = ["log", "--reverse", "--format=%H", range];
  return (await git(gitClient, cwd, args))
    .trim().split("\n").filter((line) => line.length > 0);
}

export async function getCommitChanges(
  gitClient: GitClient,
  sha: string,
  cwd: string,
): Promise<{ status: string; path: string; previousPath?: string }[]> {
  const args = ["diff-tree", "--root", "--no-commit-id", "-r", "-M", "--name-status", sha];
  return (await git(gitClient, cwd, args))
    .trim().split("\n").filter((line) => line.length > 0).map((line) => {
      const parts = line.split("\t");
      const rawStatus = parts[0] ?? "";
      if (rawStatus.startsWith("R")) {
        return {
          status: "R",
          previousPath: parts[1] ?? "",
          path: parts[2] ?? "",
        };
      }
      if (rawStatus.startsWith("C")) {
        return {
          status: "A",
          path: parts[2] ?? "",
        };
      }
      return { status: rawStatus[0] ?? rawStatus, path: parts[1] ?? "" };
    });
}

export async function getCommitMeta(
  gitClient: GitClient,
  sha: string,
  cwd: string,
): Promise<{ message: string; author: string; email: string; timestamp: string }> {
  const output = await git(gitClient, cwd, ["log", "-1", "--format=%s%n%aN%n%aE%n%aI", sha]);
  const lines = output.trim().split("\n");
  return { message: lines[0] ?? "", author: lines[1] ?? "", email: lines[2] ?? "", timestamp: lines[3] ?? "" };
}

export async function hasParent(gitClient: GitClient, sha: string, cwd: string): Promise<boolean> {
  try {
    await git(gitClient, cwd, ["rev-parse", "--verify", `${sha}~1`]);
    return true;
  } catch {
    return false;
  }
}

export async function getParentSha(gitClient: GitClient, sha: string, cwd: string): Promise<string> {
  return (await git(gitClient, cwd, ["rev-parse", "--verify", `${sha}~1`])).trim();
}

export async function prepareChange(
  gitClient: GitClient,
  cwd: string,
  sha: string,
  parentRef: string,
  parentExists: boolean,
  change: { status: string; path: string; previousPath?: string },
): Promise<PreparedChange> {
  const filePath = change.path;
  const fileId = fileNodeId(filePath);
  const lang = detectLang(filePath);
  const previousPath = change.previousPath;

  if (change.status === "D") {
    let oldOutline: readonly OutlineEntry[] = [];
    if (lang !== null && parentExists) {
      const oldContent = await getFileAtRef(parentRef, filePath, { cwd, git: gitClient });
      if (oldContent !== null) {
        oldOutline = extractOutline(oldContent, lang).entries;
      }
    }
    return {
      status: change.status,
      filePath,
      ...(previousPath !== undefined ? { previousPath } : {}),
      fileId,
      lang,
      parentExists,
      oldOutline,
    };
  }

  if (lang === null) {
    return {
      status: change.status,
      filePath,
      ...(previousPath !== undefined ? { previousPath } : {}),
      fileId,
      lang,
      parentExists,
      oldOutline: [],
    };
  }

  const newContent = await getFileAtRef(sha, filePath, { cwd, git: gitClient });
  if (newContent === null) {
    return {
      status: change.status,
      filePath,
      ...(previousPath !== undefined ? { previousPath } : {}),
      fileId,
      lang,
      parentExists,
      oldOutline: [],
    };
  }

  const parsed = parseStructuredTree(lang, newContent);
  const newResult = extractOutline(newContent, lang);
  const newOutline = newResult.entries;
  const jumpLookup = buildJumpLookup(newResult.jumpTable ?? []);

  if (change.status === "A" || !parentExists) {
    return {
      status: change.status,
      filePath,
      ...(previousPath !== undefined ? { previousPath } : {}),
      fileId,
      lang,
      parentExists,
      oldOutline: [],
      newOutline,
      jumpLookup,
      parsedTree: parsed,
    };
  }

  const oldContent = await getFileAtRef(parentRef, previousPath ?? filePath, { cwd, git: gitClient });
  if (oldContent === null) {
    return {
      status: change.status,
      filePath,
      ...(previousPath !== undefined ? { previousPath } : {}),
      fileId,
      lang,
      parentExists,
      oldOutline: [],
      newOutline,
      jumpLookup,
      parsedTree: parsed,
    };
  }

  const oldOutline = extractOutline(oldContent, lang).entries;
  return {
    status: change.status,
    filePath,
    ...(previousPath !== undefined ? { previousPath } : {}),
    fileId,
    lang,
    parentExists,
    oldOutline,
    newOutline,
    jumpLookup,
    diff: diffOutlines(oldOutline, newOutline),
    parsedTree: parsed,
  };
}
