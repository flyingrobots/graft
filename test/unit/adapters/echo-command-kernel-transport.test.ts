import { describe, expect, it } from "vitest";
import {
  ECHO_KERNEL_COMMAND_PROTOCOL,
  EchoKernelCommandTransportError,
  createEchoCommandKernelTransport,
} from "../../../src/adapters/echo-command-kernel-transport.js";
import type {
  ProcessRunRequest,
  ProcessRunResult,
  ProcessRunner,
} from "../../../src/ports/process-runner.js";

class RecordingRunner implements ProcessRunner {
  readonly requests: ProcessRunRequest[] = [];
  private readonly handler: (request: ProcessRunRequest) => ProcessRunResult;

  constructor(handler: (request: ProcessRunRequest) => ProcessRunResult) {
    this.handler = handler;
  }

  run(request: ProcessRunRequest): ProcessRunResult {
    this.requests.push(request);
    return this.handler(request);
  }
}

function okJson(value: Record<string, unknown>): ProcessRunResult {
  return {
    status: 0,
    stdout: JSON.stringify({ ok: true, ...value }),
    stderr: "",
  };
}

function decodeRequest(request: ProcessRunRequest): Record<string, unknown> {
  return JSON.parse(request.stdin ?? "{}") as Record<string, unknown>;
}

describe("echo command kernel transport", () => {
  it("invokes kernelInfo through the configured command", () => {
    const runner = new RecordingRunner(() =>
      okJson({
        kernelInfo: {
          module: "echo-local-contract-host",
          codecId: "graft-structural-history-le-v0",
        },
      }),
    );

    const transport = createEchoCommandKernelTransport({
      runner,
      command: "echo-host",
      args: ["kernel"],
      cwd: "/tmp/echo-host",
      timeoutMs: 5000,
    });

    expect(transport.kernelInfo()).toEqual({
      module: "echo-local-contract-host",
      codecId: "graft-structural-history-le-v0",
    });
    expect(runner.requests).toHaveLength(1);
    expect(runner.requests[0]).toMatchObject({
      command: "echo-host",
      args: ["kernel"],
      cwd: "/tmp/echo-host",
      timeoutMs: 5000,
    });
    expect(decodeRequest(runner.requests[0]!)["method"]).toBe("kernelInfo");
  });

  it("wraps submit and observe bytes as base64 command payloads", () => {
    const runner = new RecordingRunner((request) => {
      const decoded = decodeRequest(request);
      expect(decoded["protocol"]).toBe(ECHO_KERNEL_COMMAND_PROTOCOL);
      expect(decoded["payloadBase64"]).toBe("AQIDBA==");
      return okJson({ payloadBase64: "CQgHBg==" });
    });
    const transport = createEchoCommandKernelTransport({
      runner,
      command: "echo-host",
      cwd: "/tmp/echo-host",
    });

    expect([...transport.submitIntentBytes(new Uint8Array([1, 2, 3, 4]))]).toEqual([
      9,
      8,
      7,
      6,
    ]);
    expect([...transport.observeBytes(new Uint8Array([1, 2, 3, 4]))]).toEqual([
      9,
      8,
      7,
      6,
    ]);
    expect(runner.requests.map((request) => decodeRequest(request)["method"])).toEqual([
      "submitIntentBytes",
      "observeBytes",
    ]);
  });

  it("throws typed errors for command-level failures", () => {
    const runner = new RecordingRunner(() => ({
      status: 0,
      stdout: JSON.stringify({
        ok: false,
        error: {
          code: "UNSUPPORTED_OPERATION",
          message: "no installed observer",
        },
      }),
      stderr: "",
    }));
    const transport = createEchoCommandKernelTransport({
      runner,
      command: "echo-host",
      cwd: "/tmp/echo-host",
    });

    expect(() => transport.observeBytes(new Uint8Array([1]))).toThrow(
      EchoKernelCommandTransportError,
    );
    expect(() => transport.observeBytes(new Uint8Array([1]))).toThrow(
      /UNSUPPORTED_OPERATION: no installed observer/,
    );
  });

  it("fails closed when the process exits unsuccessfully", () => {
    const runner = new RecordingRunner(() => ({
      status: 1,
      stdout: "",
      stderr: "boom",
    }));
    const transport = createEchoCommandKernelTransport({
      runner,
      command: "echo-host",
      cwd: "/tmp/echo-host",
    });

    expect(() => transport.kernelInfo()).toThrow(/ECHO_COMMAND_PROCESS_FAILED: boom/);
  });

  it("fails closed on malformed JSON and malformed byte payloads", () => {
    const malformedJsonRunner = new RecordingRunner(() => ({
      status: 0,
      stdout: "not json",
      stderr: "",
    }));
    const malformedBytesRunner = new RecordingRunner(() =>
      okJson({ payloadBase64: "not padded" }),
    );

    expect(() =>
      createEchoCommandKernelTransport({
        runner: malformedJsonRunner,
        command: "echo-host",
        cwd: "/tmp/echo-host",
      }).kernelInfo(),
    ).toThrow(/MALFORMED_ECHO_COMMAND_RESPONSE/);
    expect(() =>
      createEchoCommandKernelTransport({
        runner: malformedBytesRunner,
        command: "echo-host",
        cwd: "/tmp/echo-host",
      }).observeBytes(new Uint8Array([1])),
    ).toThrow(/payloadBase64 is not valid padded base64/);
  });

  it("keeps target repository paths out of the adapter contract", () => {
    const runner = new RecordingRunner(() => okJson({ payloadBase64: "AA==" }));
    const transport = createEchoCommandKernelTransport({
      runner,
      command: "echo-host",
      args: ["serve-app-bytes"],
      cwd: "/tmp/echo-host",
    });

    transport.observeBytes(new Uint8Array([1]));

    const serializedRequest = JSON.stringify(decodeRequest(runner.requests[0]!));
    expect(serializedRequest).not.toContain("/tmp/project-repo");
    expect(runner.requests[0]!.cwd).toBe("/tmp/echo-host");
  });
});
