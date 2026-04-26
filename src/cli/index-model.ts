import { z } from "zod";

const indexCommandArgsSchema = z.object({
  json: z.boolean(),
  paths: z.array(z.string()),
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
  const paths: string[] = [];

  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === undefined) continue;
    if (arg === "--json") {
      json = true;
      continue;
    }
    if (arg === "--path") {
      const value = args[index + 1];
      if (value === undefined) {
        throw new Error("Missing value for --path");
      }
      paths.push(value);
      index++;
      continue;
    }
    throw new Error(`Unknown index arguments: ${arg}`);
  }

  return indexCommandArgsSchema.parse({ json, paths });
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
