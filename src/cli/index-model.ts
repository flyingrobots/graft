import { z } from "zod";

const indexCommandArgsSchema = z.object({
  json: z.boolean(),
});

export type IndexCommandArgs = z.infer<typeof indexCommandArgsSchema>;

const indexSuccessSchema = z.object({
  ok: z.literal(true),
  cwd: z.string(),
  filesIndexed: z.number().int().nonnegative(),
  nodesEmitted: z.number().int().nonnegative(),
});

const indexFailureSchema = z.object({
  ok: z.literal(false),
  cwd: z.string(),
  error: z.string(),
});

export const indexCliResultSchema = z.union([indexSuccessSchema, indexFailureSchema]);

export type IndexCliResult = z.infer<typeof indexCliResultSchema>;

export function parseIndexCommandArgs(args: readonly string[]): IndexCommandArgs {
  let json = false;

  for (const arg of args) {
    if (arg === "--json") {
      json = true;
      continue;
    }
    throw new Error(`Unknown index arguments: ${arg}`);
  }

  return indexCommandArgsSchema.parse({ json });
}

export function buildIndexCliSuccess(input: {
  readonly cwd: string;
  readonly filesIndexed: number;
  readonly nodesEmitted: number;
}): IndexCliResult {
  return indexSuccessSchema.parse({
    ok: true,
    cwd: input.cwd,
    filesIndexed: input.filesIndexed,
    nodesEmitted: input.nodesEmitted,
  });
}

export function buildIndexCliFailure(input: {
  readonly cwd: string;
  readonly error: string;
}): IndexCliResult {
  return indexFailureSchema.parse({
    ok: false,
    cwd: input.cwd,
    error: input.error,
  });
}
