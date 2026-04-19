import { z } from "zod";

const indexCommandArgsSchema = z.object({
  json: z.boolean(),
  from: z.string().nullable(),
});

export type IndexCommandArgs = z.infer<typeof indexCommandArgsSchema>;

const indexSuccessSchema = z.object({
  ok: z.literal(true),
  cwd: z.string(),
  from: z.string().nullable(),
  commitsIndexed: z.number().int().nonnegative(),
  patchesWritten: z.number().int().nonnegative(),
});

const indexFailureSchema = z.object({
  ok: z.literal(false),
  cwd: z.string(),
  from: z.string().nullable(),
  error: z.string(),
});

export const indexCliResultSchema = z.union([indexSuccessSchema, indexFailureSchema]);

export type IndexCliResult = z.infer<typeof indexCliResultSchema>;

export function parseIndexCommandArgs(args: readonly string[]): IndexCommandArgs {
  let json = false;
  let from: string | null = null;

  for (const arg of args) {
    if (arg === "--json") {
      json = true;
      continue;
    }
    if (arg.startsWith("--")) {
      throw new Error(`Unknown index arguments: ${arg}`);
    }
    if (from !== null) {
      throw new Error(`Unknown index arguments: ${arg}`);
    }
    from = arg;
  }

  return indexCommandArgsSchema.parse({ json, from });
}

export function buildIndexCliSuccess(input: {
  readonly cwd: string;
  readonly from: string | null;
  readonly commitsIndexed: number;
  readonly patchesWritten: number;
}): IndexCliResult {
  return indexSuccessSchema.parse({
    ok: true,
    cwd: input.cwd,
    from: input.from,
    commitsIndexed: input.commitsIndexed,
    patchesWritten: input.patchesWritten,
  });
}

export function buildIndexCliFailure(input: {
  readonly cwd: string;
  readonly from: string | null;
  readonly error: string;
}): IndexCliResult {
  return indexFailureSchema.parse({
    ok: false,
    cwd: input.cwd,
    from: input.from,
    error: input.error,
  });
}
