import { z } from "zod";
import { evaluateMcpPolicy } from "../policy.js";
import { RefusedResult } from "../../policy/types.js";
import type { ToolDefinition, ToolHandler } from "../context.js";

type GraftEditReason =
  | "NOT_FOUND"
  | "OLD_STRING_NOT_FOUND"
  | "OLD_STRING_AMBIGUOUS"
  | RefusedResult["reason"];

type DriftPattern = "jsdoc_typedef";
type DriftDirection = "removed" | "added";

interface GraftEditDriftObservation {
  readonly pattern: DriftPattern;
  readonly path: string;
  readonly direction: DriftDirection;
}

interface GraftEditDriftWarning {
  readonly kind: "structural_pattern_reintroduced";
  readonly severity: "advisory";
  readonly pattern: DriftPattern;
  readonly basis: "session_local_graft_edit";
  readonly message: string;
  readonly current: {
    readonly path: string;
    readonly direction: "added";
  };
  readonly previous: {
    readonly path: string;
    readonly direction: "removed";
  };
}

interface GraftEditResponse {
  readonly path: string;
  readonly operation: "replace";
  readonly projection: "edited" | "refused";
  readonly status: "edited" | "refused";
  readonly changed: boolean;
  readonly matches: number;
  readonly replacements: number;
  readonly reason?: GraftEditReason;
  readonly reasonDetail?: string;
  readonly next?: readonly string[];
  readonly actual?: {
    readonly lines: number;
    readonly bytes: number;
  };
  readonly driftWarnings?: readonly GraftEditDriftWarning[];
}

function countOccurrences(content: string, needle: string): number {
  if (needle.length === 0) {
    return content.length + 1;
  }

  let count = 0;
  let offset = 0;
  while (offset <= content.length) {
    const index = content.indexOf(needle, offset);
    if (index === -1) {
      return count;
    }
    count += 1;
    offset = index + needle.length;
  }
  return count;
}

async function actualForFile(
  content: string,
  stat: () => Promise<{ size: number }>,
): Promise<{ lines: number; bytes: number }> {
  const fileStat = await stat();
  return {
    lines: content.split("\n").length,
    bytes: fileStat.size,
  };
}

function refused(input: {
  readonly path: string;
  readonly reason: GraftEditReason;
  readonly reasonDetail?: string;
  readonly next?: readonly string[];
  readonly actual?: { readonly lines: number; readonly bytes: number };
  readonly matches?: number;
}): GraftEditResponse {
  return {
    path: input.path,
    operation: "replace",
    projection: "refused",
    status: "refused",
    changed: false,
    matches: input.matches ?? 0,
    replacements: 0,
    reason: input.reason,
    ...(input.reasonDetail !== undefined ? { reasonDetail: input.reasonDetail } : {}),
    ...(input.next !== undefined ? { next: [...input.next] } : {}),
    ...(input.actual !== undefined ? { actual: input.actual } : {}),
  };
}

function containsJsdocTypedef(content: string): boolean {
  return content
    .split(/\r?\n/u)
    .some((line) => line.trimStart().startsWith("* @typedef "));
}

function classifyStructuralEdit(input: {
  readonly path: string;
  readonly oldString: string;
  readonly newString: string;
}): GraftEditDriftObservation | null {
  const oldHasTypedef = containsJsdocTypedef(input.oldString);
  const newHasTypedef = containsJsdocTypedef(input.newString);
  if (oldHasTypedef === newHasTypedef) {
    return null;
  }
  return {
    path: input.path,
    pattern: "jsdoc_typedef",
    direction: oldHasTypedef ? "removed" : "added",
  };
}

function buildDriftWarnings(
  observation: GraftEditDriftObservation | null,
  priorObservations: readonly GraftEditDriftObservation[],
): GraftEditDriftWarning[] {
  if (observation?.direction !== "added") {
    return [];
  }

  let previous: GraftEditDriftObservation | undefined;
  for (let i = priorObservations.length - 1; i >= 0; i--) {
    const candidate = priorObservations[i];
    if (candidate?.pattern === observation.pattern && candidate.direction === "removed") {
      previous = candidate;
      break;
    }
  }
  if (previous === undefined) {
    return [];
  }

  return [{
    kind: "structural_pattern_reintroduced",
    severity: "advisory",
    pattern: observation.pattern,
    basis: "session_local_graft_edit",
    message: "You are adding a typedef in a session that has been removing typedefs.",
    current: {
      path: observation.path,
      direction: "added",
    },
    previous: {
      path: previous.path,
      direction: "removed",
    },
  }];
}

export const graftEditTool: ToolDefinition = {
  name: "graft_edit",
  description:
    "Perform one governed exact string replacement in a repo file. " +
    "Requires path, old_string, and new_string. Refuses missing or " +
    "ambiguous old_string matches and policy-denied paths.",
  schema: {
    path: z.string(),
    old_string: z.string(),
    new_string: z.string(),
  },
  createHandler(): ToolHandler {
    const structuralEditObservations: GraftEditDriftObservation[] = [];

    return async (args, ctx) => {
      const filePath = ctx.resolvePath(args["path"] as string);
      const oldString = args["old_string"] as string;
      const newString = args["new_string"] as string;
      ctx.recordFootprint({ paths: [filePath] });

      let content: string;
      try {
        content = await ctx.fs.readFile(filePath, "utf-8");
      } catch {
        ctx.metrics.recordRefusal();
        return ctx.respond("graft_edit", {
          ...refused({
            path: filePath,
            reason: "NOT_FOUND",
            reasonDetail: "File does not exist or cannot be read",
            next: ["Choose an existing file; graft_edit does not create files"],
          }),
        });
      }

      const actual = await actualForFile(content, () => ctx.fs.stat(filePath));
      const policy = evaluateMcpPolicy(ctx, filePath, actual);
      if (policy instanceof RefusedResult) {
        ctx.metrics.recordRefusal();
        return ctx.respond("graft_edit", {
          ...refused({
            path: filePath,
            reason: policy.reason,
            reasonDetail: policy.reasonDetail,
            next: policy.next,
            actual,
          }),
        });
      }

      const matches = countOccurrences(content, oldString);
      if (matches === 0) {
        ctx.metrics.recordRefusal();
        return ctx.respond("graft_edit", {
          ...refused({
            path: filePath,
            reason: "OLD_STRING_NOT_FOUND",
            reasonDetail: "old_string does not occur in the target file",
            next: ["Inspect the current file content and provide an exact old_string"],
            actual,
            matches,
          }),
        });
      }

      if (matches !== 1) {
        ctx.metrics.recordRefusal();
        return ctx.respond("graft_edit", {
          ...refused({
            path: filePath,
            reason: "OLD_STRING_AMBIGUOUS",
            reasonDetail: "old_string must occur exactly once",
            next: ["Provide a longer old_string that uniquely identifies the edit site"],
            actual,
            matches,
          }),
        });
      }

      const nextContent = content.replace(oldString, newString);
      const changed = nextContent !== content;
      if (changed) {
        await ctx.fs.writeFile(filePath, nextContent, "utf-8");
      }

      const observation = classifyStructuralEdit({
        path: filePath,
        oldString,
        newString,
      });
      const driftWarnings = buildDriftWarnings(observation, structuralEditObservations);
      if (observation !== null) {
        structuralEditObservations.push(observation);
      }

      const response: GraftEditResponse = {
        path: filePath,
        operation: "replace",
        projection: "edited",
        status: "edited",
        changed,
        matches,
        replacements: 1,
        actual,
        ...(driftWarnings.length > 0 ? { driftWarnings } : {}),
      };
      return ctx.respond("graft_edit", { ...response });
    };
  },
};
