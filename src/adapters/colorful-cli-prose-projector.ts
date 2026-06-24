import { createHash } from "node:crypto";
import type { ProcessRunner } from "../ports/process-runner.js";
import {
  isColorfulProsePath,
  projectColorfulIr,
} from "../operations/colorful-prose-projection.js";
import type { ProseProjectionProvider } from "../operations/colorful-prose-projection.js";

export const COLORFUL_CLI_MINIMUM_VERSION = "0.2.1";

export interface CreateColorfulCliProseProjectorOptions {
  readonly processRunner: ProcessRunner;
  readonly cwd: string;
  readonly command?: string | undefined;
  readonly includeMarkdown?: boolean | undefined;
  readonly timeoutMs?: number | undefined;
  readonly maxBufferBytes?: number | undefined;
}

function sha256ContentHash(source: Uint8Array): string {
  return `sha256:${createHash("sha256").update(source).digest("hex")}`;
}

export function createColorfulCliProseProjector(
  options: CreateColorfulCliProseProjectorOptions,
): ProseProjectionProvider {
  const command = options.command ?? "colorful";
  const timeoutMs = options.timeoutMs ?? 5_000;
  const maxBufferBytes = options.maxBufferBytes ?? 8 * 1024 * 1024;

  return {
    project(input) {
      if (!isColorfulProsePath(input.path, { includeMarkdown: options.includeMarkdown })) {
        return null;
      }
      const source = Buffer.from(input.content, "utf8");
      const result = options.processRunner.run({
        command,
        args: ["ir", "-"],
        cwd: options.cwd,
        stdin: input.content,
        timeoutMs,
        maxBufferBytes,
      });
      if (result.error !== undefined || result.status !== 0) {
        return null;
      }

      let ir: unknown;
      try {
        ir = JSON.parse(result.stdout) as unknown;
      } catch (error) {
        const message = error instanceof Error ? error.message : "unknown parse error";
        throw new Error(`Colorful CLI returned invalid JSON: ${message}`, { cause: error });
      }

      return projectColorfulIr({
        path: input.path,
        source,
        sourceHash: sha256ContentHash(source),
        ir,
      });
    },
  };
}
