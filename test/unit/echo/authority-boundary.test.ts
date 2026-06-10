import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createFakeEchoKernelTransport } from "../../../src/adapters/fake-echo-kernel-transport.js";
import { createEchoStructuralHistoryClient } from "../../../src/echo/structural-history-client.js";
import { createEchoStructuralReadingPort } from "../../../src/echo/structural-reading-adapter.js";

const FORBIDDEN_MEMBERS = [
  "tick",
  "step",
  "superTick",
  "start",
  "stop",
  "drain",
  "installContractPackage",
  "appendWal",
  "recoverWal",
  "mutateKernel",
  "recoverScheduler",
] as const;

const APP_SAFE_TRANSPORT_MEMBERS = new Set([
  "kernelInfo",
  "submitIntentBytes",
  "observeBytes",
]);

describe("echo authority boundary", () => {
  it("exposes no trusted-host member on the fake transport", () => {
    const transport = createFakeEchoKernelTransport();
    for (const member of FORBIDDEN_MEMBERS) {
      expect(member in (transport as unknown as Record<string, unknown>)).toBe(false);
    }
  });

  it("exposes no trusted-host member on the typed client", () => {
    const client = createEchoStructuralHistoryClient(createFakeEchoKernelTransport());
    for (const member of FORBIDDEN_MEMBERS) {
      expect(member in (client as unknown as Record<string, unknown>)).toBe(false);
    }
  });

  it("touches only the declared transport seam during port flows", async () => {
    const accessed = new Set<string | symbol>();
    const transport = createFakeEchoKernelTransport({
      fixture: {
        deadSymbols: [
          {
            name: "oldHelper",
            kind: "function",
            filePath: "src/old-helper.ts",
            exported: true,
            removedInCommit: "abc1234",
          },
        ],
      },
    });
    const witnessed = new Proxy(transport, {
      get(target, property, receiver) {
        accessed.add(property);
        return Reflect.get(target, property, receiver);
      },
    });

    const port = createEchoStructuralReadingPort(
      createEchoStructuralHistoryClient(witnessed),
    );
    await port.findDeadSymbols({});

    for (const property of accessed) {
      expect(APP_SAFE_TRANSPORT_MEMBERS.has(String(property))).toBe(true);
    }
  });

  it("keeps the echo adapter out of production contexts", () => {
    const productionContexts = [
      "src/mcp/server-context.ts",
      "src/mcp/repo-tool-worker-context.ts",
    ];
    for (const contextPath of productionContexts) {
      const source = readFileSync(
        path.join(process.cwd(), contextPath),
        "utf8",
      );
      expect(source).not.toMatch(/from\s+"\.\.\/echo\//);
      expect(source).not.toMatch(/fake-echo-kernel-transport/);
    }
  });
});
