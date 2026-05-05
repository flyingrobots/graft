import { nodeGit } from "../adapters/node-git.js";
import type { GitClient } from "../ports/git.js";

export interface GitVersion {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
}

export interface GitVersionGuardOptions {
  readonly git?: GitClient | undefined;
  readonly cwd?: string | undefined;
  readonly minimum?: GitVersion | undefined;
}

export const GRAFT_MINIMUM_GIT_VERSION: GitVersion = Object.freeze({
  major: 2,
  minor: 31,
  patch: 0,
});

export function formatGitVersion(version: GitVersion): string {
  return `${String(version.major)}.${String(version.minor)}.${String(version.patch)}`;
}

export function parseGitVersion(output: string): GitVersion | null {
  const match = /\bgit version\s+(\d+)\.(\d+)(?:\.(\d+))?/u.exec(output.trim());
  if (match === null) return null;
  const major = Number.parseInt(match[1] ?? "", 10);
  const minor = Number.parseInt(match[2] ?? "", 10);
  const patch = Number.parseInt(match[3] ?? "0", 10);
  if (!Number.isInteger(major) || !Number.isInteger(minor) || !Number.isInteger(patch)) {
    return null;
  }
  return { major, minor, patch };
}

export function compareGitVersions(left: GitVersion, right: GitVersion): number {
  return left.major - right.major ||
    left.minor - right.minor ||
    left.patch - right.patch;
}

export async function ensureGitVersionSupportsGraft(
  options: GitVersionGuardOptions = {},
): Promise<void> {
  const git = options.git ?? nodeGit;
  const cwd = options.cwd ?? process.cwd();
  const minimum = options.minimum ?? GRAFT_MINIMUM_GIT_VERSION;
  const result = await git.run({
    cwd,
    args: ["--version"],
    timeoutMs: 5_000,
    maxBufferBytes: 8 * 1024,
  });

  if (result.status !== 0) {
    throw new Error(
      `Unable to determine Git version. Graft requires Git ${formatGitVersion(minimum)} ` +
        `or newer for modern plumbing flags such as --path-format. ${result.stderr.trim()}`,
    );
  }

  const version = parseGitVersion(result.stdout);
  if (version === null) {
    throw new Error(
      `Unable to parse Git version from: ${result.stdout.trim()}. ` +
        `Graft requires Git ${formatGitVersion(minimum)} or newer.`,
    );
  }

  if (compareGitVersions(version, minimum) < 0) {
    throw new Error(
      `Git ${formatGitVersion(minimum)} or newer is required; found ` +
        `${formatGitVersion(version)}. Graft uses modern plumbing flags such as --path-format.`,
    );
  }
}
