import path from "node:path";
import { evaluatePolicy } from "../policy/evaluate.js";
import { loadGraftignore } from "../policy/graftignore.js";
import { RefusedResult, type PolicyOptions, type PolicyResult } from "../policy/types.js";
import type { FileSystem } from "../ports/filesystem.js";
import type { SessionTracker } from "../session/tracker.js";

export interface McpPolicyContext {
  readonly projectRoot: string;
  readonly graftignorePatterns: readonly string[];
  readonly session: SessionTracker;
}

export interface McpPolicyRefusal {
  path: string;
  reason: string;
  reasonDetail: string;
  next: readonly string[];
  actual: { lines: number; bytes: number };
}

export async function loadProjectGraftignore(
  fs: Pick<FileSystem, "readFile">,
  projectRoot: string,
): Promise<string[]> {
  try {
    return loadGraftignore(await fs.readFile(path.join(projectRoot, ".graftignore"), "utf-8"));
  } catch {
    return [];
  }
}

export function toPolicyPath(projectRoot: string, filePath: string): string {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(projectRoot, filePath);
  const relativePath = path.relative(projectRoot, absolutePath);
  if (relativePath.length === 0 || relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    return absolutePath;
  }
  return relativePath.split(path.sep).join("/");
}

export function buildMcpPolicyOptions(
  ctx: Pick<McpPolicyContext, "graftignorePatterns" | "session">,
): PolicyOptions {
  return {
    graftignorePatterns: ctx.graftignorePatterns.length > 0 ? [...ctx.graftignorePatterns] : undefined,
    sessionDepth: ctx.session.getSessionDepth(),
    budgetRemaining: ctx.session.getBudget()?.remaining,
  };
}

export function evaluateMcpPolicy(
  ctx: McpPolicyContext,
  filePath: string,
  actual: { lines: number; bytes: number },
): PolicyResult {
  return evaluatePolicy(
    {
      path: toPolicyPath(ctx.projectRoot, filePath),
      lines: actual.lines,
      bytes: actual.bytes,
    },
    buildMcpPolicyOptions(ctx),
  );
}

export function evaluateMcpRefusal(
  ctx: McpPolicyContext,
  filePath: string,
  actual: { lines: number; bytes: number },
): McpPolicyRefusal | null {
  const policy = evaluateMcpPolicy(ctx, filePath, actual);
  if (!(policy instanceof RefusedResult)) {
    return null;
  }

  return {
    path: filePath,
    reason: policy.reason,
    reasonDetail: policy.reasonDetail,
    next: [...policy.next],
    actual,
  };
}
