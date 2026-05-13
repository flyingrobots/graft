export const DEFAULT_ISOLATED_VITEST_MAX_WORKERS = "2";

export function normalizeVitestArgs(args: string[]): string[] {
  if (args[0] === "--") {
    return args.slice(1);
  }
  return args;
}

function hasExplicitMaxWorkers(args: string[]): boolean {
  return args.some((arg) => arg === "--maxWorkers" || arg.startsWith("--maxWorkers="));
}

export function applyIsolatedVitestDefaults(args: string[]): string[] {
  if (hasExplicitMaxWorkers(args)) {
    return args;
  }

  return [...args, "--maxWorkers", DEFAULT_ISOLATED_VITEST_MAX_WORKERS];
}
