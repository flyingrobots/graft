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

function parseSemver(value: string): readonly [number, number, number] | null {
  const match = /\b(\d+)\.(\d+)\.(\d+)(?:[-+][0-9A-Za-z.-]+)?\b/u.exec(value);
  if (match === null) {
    return null;
  }
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function versionAtLeast(actual: readonly [number, number, number], minimum: readonly [number, number, number]): boolean {
  for (let index = 0; index < minimum.length; index += 1) {
    const actualPart = actual[index] ?? 0;
    const minimumPart = minimum[index] ?? 0;
    if (actualPart > minimumPart) {
      return true;
    }
    if (actualPart < minimumPart) {
      return false;
    }
  }
  return true;
}

export function createColorfulCliProseProjector(
  options: CreateColorfulCliProseProjectorOptions,
): ProseProjectionProvider {
  const command = options.command ?? "colorful";
  const timeoutMs = options.timeoutMs ?? 5_000;
  const maxBufferBytes = options.maxBufferBytes ?? 8 * 1024 * 1024;
  const minimumVersion = parseSemver(COLORFUL_CLI_MINIMUM_VERSION);
  let versionSupported: boolean | undefined;

  const supportsMinimumVersion = (): boolean => {
    if (versionSupported !== undefined) {
      return versionSupported;
    }
    const result = options.processRunner.run({
      command,
      args: ["--version"],
      cwd: options.cwd,
      timeoutMs,
      maxBufferBytes: Math.min(maxBufferBytes, 64 * 1024),
    });
    if (result.error !== undefined || result.status !== 0 || minimumVersion === null) {
      versionSupported = false;
      return versionSupported;
    }
    const actualVersion = parseSemver(`${result.stdout}\n${result.stderr}`);
    versionSupported = actualVersion !== null && versionAtLeast(actualVersion, minimumVersion);
    return versionSupported;
  };

  return {
    project(input) {
      if (!isColorfulProsePath(input.path, { includeMarkdown: options.includeMarkdown })) {
        return null;
      }
      if (!supportsMinimumVersion()) {
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
