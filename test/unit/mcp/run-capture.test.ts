import { afterEach, describe, expect, it } from "vitest";
import type { GraftServer } from "../../../src/mcp/server.js";
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
});
