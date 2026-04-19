import { resolveEntrypointArgs } from "./command-parser.js";
import { runCli } from "./main.js";

export interface CliEntrypointOptions {
  readonly argv?: readonly string[] | undefined;
  readonly stdinIsTTY?: boolean | undefined;
  readonly stdoutIsTTY?: boolean | undefined;
}

export async function runCliEntrypoint(options: CliEntrypointOptions = {}): Promise<void> {
  await runCli({
    args: resolveEntrypointArgs(
      options.argv ?? process.argv.slice(2),
      options.stdinIsTTY ?? process.stdin.isTTY,
      options.stdoutIsTTY ?? process.stdout.isTTY,
    ),
  });
}
