export function normalizeVitestArgs(args: string[]): string[] {
  if (args[0] === "--") {
    return args.slice(1);
  }
  return args;
}
