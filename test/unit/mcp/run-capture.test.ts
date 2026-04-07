import { afterEach, describe, expect, it } from "vitest";
import type { GraftServer } from "../../../src/mcp/server.js";
import * as fs from "node:fs";
import * as path from "node:path";
import { createIsolatedServer, parse } from "../../helpers/mcp.js";

const cleanups: (() => void)[] = [];

afterEach(() => {
  while (cleanups.length > 0) {
    cleanups.pop()!();
  }
});

function createServer(): GraftServer {
  const isolated = createIsolatedServer();
  cleanups.push(() => {
    isolated.cleanup();
  });
  return isolated.server;
}

describe("mcp: run_capture policy boundary", () => {
  it("marks successful captures as outside the bounded-read contract", async () => {
    const server = createServer();
    const parsed = parse(await server.callTool("run_capture", {
      command: "printf 'alpha\\nbeta\\ngamma'",
      tail: 2,
    }));

    expect(parsed["output"]).toBe("beta\ngamma");
    expect(parsed["tailedLines"]).toBe(2);
    expect(parsed["truncated"]).toBe(true);
    expect(parsed["logPath"]).toBeTruthy();
    expect(parsed["logPersistenceEnabled"]).toBe(true);
    expect(parsed["logRedactions"]).toBe(0);
    expect(parsed["policyBoundary"]).toEqual({
      kind: "shell_escape_hatch",
      boundedReadContract: false,
      policyEnforced: false,
    });
  });

  it("marks failed captures as outside the bounded-read contract", async () => {
    const server = createServer();
    const parsed = parse(await server.callTool("run_capture", {
      command: "printf 'alpha\\nbeta'; exit 2",
      tail: 1,
    }));

    expect(typeof parsed["error"]).toBe("string");
    expect(parsed["output"]).toBe("beta");
    expect(parsed["tailedLines"]).toBe(1);
    expect(parsed["policyBoundary"]).toEqual({
      kind: "shell_escape_hatch",
      boundedReadContract: false,
      policyEnforced: false,
    });
  });

  it("can be disabled explicitly by configuration", async () => {
    const isolated = createIsolatedServer({ runCapture: { enabled: false } });
    cleanups.push(() => {
      isolated.cleanup();
    });

    const parsed = parse(await isolated.server.callTool("run_capture", {
      command: "printf 'alpha'",
      tail: 1,
    }));

    expect(parsed["disabled"]).toBe(true);
    expect(parsed["error"]).toBe("run_capture is disabled by configuration");
    expect(parsed["logPath"]).toBeNull();
    expect(parsed["output"]).toBe("");
  });

  it("redacts obvious secrets before persisting logs", async () => {
    const isolated = createIsolatedServer();
    cleanups.push(() => {
      isolated.cleanup();
    });

    const parsed = parse(await isolated.server.callTool("run_capture", {
      command: "printf 'TOKEN=supersecret\\nvisible=1'",
      tail: 2,
    }));

    expect(parsed["output"]).toBe("TOKEN=supersecret\nvisible=1");
    expect(parsed["logRedactions"]).toBe(1);

    const logPath = path.join(isolated.graftDir, "logs", "capture.log");
    const persisted = fs.readFileSync(logPath, "utf-8");
    expect(persisted).toContain("TOKEN=[REDACTED]");
    expect(persisted).not.toContain("supersecret");
  });

  it("supports opt-out log persistence", async () => {
    const isolated = createIsolatedServer({ runCapture: { persistLogs: false } });
    cleanups.push(() => {
      isolated.cleanup();
    });

    const parsed = parse(await isolated.server.callTool("run_capture", {
      command: "printf 'alpha'",
      tail: 1,
    }));

    expect(parsed["logPath"]).toBeNull();
    expect(parsed["logPersistenceEnabled"]).toBe(false);
    const logPath = path.join(isolated.graftDir, "logs", "capture.log");
    expect(fs.existsSync(logPath)).toBe(false);
  });
});
