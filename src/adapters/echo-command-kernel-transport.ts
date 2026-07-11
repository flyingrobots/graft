// ---------------------------------------------------------------------------
// Echo command kernel transport.
//
// Bridges the app-safe EchoKernelTransport byte seam to a process command.
// The command receives JSON on stdin and returns JSON on stdout; target repo
// paths, Git operations, package installation, and scheduler controls are
// deliberately absent from this adapter contract.
// ---------------------------------------------------------------------------

import type {
  EchoKernelInfo,
  EchoKernelTransport,
} from "../ports/echo-kernel-transport.js";
import type { ProcessRunner } from "../ports/process-runner.js";
import { CanonicalJsonCodec } from "./canonical-json.js";

export const ECHO_KERNEL_COMMAND_PROTOCOL = "graft.echo-kernel-command.v1";

export type EchoKernelCommandMethod =
  | "kernelInfo"
  | "submitIntentBytes"
  | "observeBytes";

export interface EchoKernelCommandTransportOptions {
  readonly runner: ProcessRunner;
  readonly command: string;
  readonly args?: readonly string[] | undefined;
  readonly cwd: string;
  readonly timeoutMs?: number | undefined;
  readonly maxBufferBytes?: number | undefined;
}

interface EchoKernelCommandRequest {
  readonly protocol: typeof ECHO_KERNEL_COMMAND_PROTOCOL;
  readonly method: EchoKernelCommandMethod;
  readonly payloadBase64?: string | undefined;
}

interface EchoKernelCommandErrorBody {
  readonly code?: unknown;
  readonly message?: unknown;
}

export class EchoKernelCommandTransportError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(`${code}: ${message}`);
    this.name = "EchoKernelCommandTransportError";
    this.code = code;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function bytesToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

function isPaddedBase64(value: string): boolean {
  return value.length % 4 === 0 &&
    /^(?:[+/0-9A-Za-z]{4})*(?:[+/0-9A-Za-z]{2}==|[+/0-9A-Za-z]{3}=)?$/.test(value);
}

function base64ToBytes(value: unknown, label: string): Uint8Array {
  if (typeof value !== "string") {
    throw new EchoKernelCommandTransportError(
      "MALFORMED_ECHO_COMMAND_RESPONSE",
      `${label} must be a base64 string`,
    );
  }
  if (!isPaddedBase64(value)) {
    throw new EchoKernelCommandTransportError(
      "MALFORMED_ECHO_COMMAND_RESPONSE",
      `${label} is not valid padded base64`,
    );
  }
  return new Uint8Array(Buffer.from(value, "base64"));
}

function parseKernelInfo(value: unknown): EchoKernelInfo {
  if (!isRecord(value)) {
    throw new EchoKernelCommandTransportError(
      "MALFORMED_ECHO_COMMAND_RESPONSE",
      "kernelInfo must be an object",
    );
  }
  const module = value["module"];
  const codecId = value["codecId"];
  if (typeof module !== "string" || module.length === 0) {
    throw new EchoKernelCommandTransportError(
      "MALFORMED_ECHO_COMMAND_RESPONSE",
      "kernelInfo.module must be a non-empty string",
    );
  }
  if (typeof codecId !== "string" || codecId.length === 0) {
    throw new EchoKernelCommandTransportError(
      "MALFORMED_ECHO_COMMAND_RESPONSE",
      "kernelInfo.codecId must be a non-empty string",
    );
  }
  return { module, codecId };
}

function parseCommandError(value: unknown): EchoKernelCommandTransportError {
  const body: EchoKernelCommandErrorBody = isRecord(value) ? value : {};
  const code = typeof body.code === "string" && body.code.length > 0
    ? body.code
    : "ECHO_COMMAND_ERROR";
  const message = typeof body.message === "string" && body.message.length > 0
    ? body.message
    : "Echo command failed";
  return new EchoKernelCommandTransportError(code, message);
}

export function createEchoCommandKernelTransport(
  options: EchoKernelCommandTransportOptions,
): EchoKernelTransport {
  if (options.command.length === 0) {
    throw new EchoKernelCommandTransportError(
      "INVALID_ECHO_COMMAND",
      "command must be a non-empty string",
    );
  }
  if (options.cwd.length === 0) {
    throw new EchoKernelCommandTransportError(
      "INVALID_ECHO_COMMAND",
      "cwd must be a non-empty string",
    );
  }

  const codec = new CanonicalJsonCodec();
  const args = options.args ?? [];

  function invoke(request: EchoKernelCommandRequest): Record<string, unknown> {
    const result = options.runner.run({
      command: options.command,
      args,
      cwd: options.cwd,
      stdin: `${codec.encode(request)}\n`,
      ...(options.timeoutMs !== undefined ? { timeoutMs: options.timeoutMs } : {}),
      ...(options.maxBufferBytes !== undefined
        ? { maxBufferBytes: options.maxBufferBytes }
        : {}),
    });
    if (result.status !== 0 || result.error !== undefined) {
      const detail = (result.error?.message ?? result.stderr.trim()) ||
        "process failed";
      throw new EchoKernelCommandTransportError(
        "ECHO_COMMAND_PROCESS_FAILED",
        detail,
      );
    }

    let decoded: unknown;
    try {
      decoded = codec.decode(result.stdout);
    } catch (error) {
      const message = error instanceof Error ? error.message : "invalid JSON";
      throw new EchoKernelCommandTransportError(
        "MALFORMED_ECHO_COMMAND_RESPONSE",
        message,
      );
    }
    if (!isRecord(decoded)) {
      throw new EchoKernelCommandTransportError(
        "MALFORMED_ECHO_COMMAND_RESPONSE",
        "response must be a JSON object",
      );
    }
    if (decoded["ok"] === false) {
      throw parseCommandError(decoded["error"]);
    }
    if (decoded["ok"] !== true) {
      throw new EchoKernelCommandTransportError(
        "MALFORMED_ECHO_COMMAND_RESPONSE",
        "response.ok must be true or false",
      );
    }
    return decoded;
  }

  function invokeBytes(
    method: Exclude<EchoKernelCommandMethod, "kernelInfo">,
    bytes: Uint8Array,
  ): Uint8Array {
    const response = invoke({
      protocol: ECHO_KERNEL_COMMAND_PROTOCOL,
      method,
      payloadBase64: bytesToBase64(bytes),
    });
    return base64ToBytes(response["payloadBase64"], "payloadBase64");
  }

  return {
    kernelInfo(): EchoKernelInfo {
      const response = invoke({
        protocol: ECHO_KERNEL_COMMAND_PROTOCOL,
        method: "kernelInfo",
      });
      return parseKernelInfo(response["kernelInfo"]);
    },

    submitIntentBytes(intentBytes: Uint8Array): Uint8Array {
      return invokeBytes("submitIntentBytes", intentBytes);
    },

    observeBytes(requestBytes: Uint8Array): Uint8Array {
      return invokeBytes("observeBytes", requestBytes);
    },
  };
}
