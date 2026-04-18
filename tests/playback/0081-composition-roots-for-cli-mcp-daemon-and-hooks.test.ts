import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";

const MCP_SERVER = path.resolve(import.meta.dirname, "../../src/mcp/server.ts");
const MCP_TOOL_REGISTRY = path.resolve(import.meta.dirname, "../../src/mcp/tool-registry.ts");
const MCP_TOOL_ACCESS = path.resolve(import.meta.dirname, "../../src/mcp/server-tool-access.ts");
const WORKSPACE_ROUTER = path.resolve(import.meta.dirname, "../../src/mcp/workspace-router.ts");
const WORKSPACE_ROUTER_RUNTIME = path.resolve(
  import.meta.dirname,
  "../../src/mcp/workspace-router-runtime.ts",
);
const LOCAL_HISTORY = path.resolve(import.meta.dirname, "../../src/mcp/persisted-local-history.ts");
const LOCAL_HISTORY_VIEWS = path.resolve(
  import.meta.dirname,
  "../../src/mcp/persisted-local-history-views.ts",
);
const LOCAL_HISTORY_POLICY = path.resolve(
  import.meta.dirname,
  "../../src/mcp/persisted-local-history-policy.ts",
);
const DAEMON_SERVER = path.resolve(import.meta.dirname, "../../src/mcp/daemon-server.ts");
const DAEMON_BOOTSTRAP = path.resolve(import.meta.dirname, "../../src/mcp/daemon-bootstrap.ts");
const DAEMON_SESSION_HOST = path.resolve(
  import.meta.dirname,
  "../../src/mcp/daemon-session-host.ts",
);
const CLI_MAIN = path.resolve(import.meta.dirname, "../../src/cli/main.ts");
const CLI_COMMAND_PARSER = path.resolve(import.meta.dirname, "../../src/cli/command-parser.ts");
const CLI_PEER_COMMAND = path.resolve(import.meta.dirname, "../../src/cli/peer-command.ts");
const STDIO_SERVER = path.resolve(import.meta.dirname, "../../src/mcp/stdio-server.ts");
const PRE_READ_HOOK = path.resolve(import.meta.dirname, "../../src/hooks/pretooluse-read.ts");
const POST_READ_HOOK = path.resolve(import.meta.dirname, "../../src/hooks/posttooluse-read.ts");

function read(pathname: string): string {
  return fs.readFileSync(pathname, "utf-8");
}

function lineCount(pathname: string): number {
  return read(pathname).trimEnd().split("\n").length;
}

describe("0081 composition roots for cli mcp daemon and hooks", () => {
  it("Can a reviewer point to explicit modules for MCP tool registration, daemon/tool access policy, workspace runtime assembly, and local history projection/policy instead of reading `server.ts`, `workspace-router.ts`, and `persisted-local-history.ts` as one mixed orchestration seam?", () => {
    expect(fs.existsSync(MCP_TOOL_REGISTRY)).toBe(true);
    expect(fs.existsSync(MCP_TOOL_ACCESS)).toBe(true);
    expect(fs.existsSync(WORKSPACE_ROUTER_RUNTIME)).toBe(true);
    expect(fs.existsSync(LOCAL_HISTORY_VIEWS)).toBe(true);
    expect(fs.existsSync(LOCAL_HISTORY_POLICY)).toBe(true);

    expect(read(MCP_SERVER)).toContain('./tool-registry.js');
    expect(read(MCP_SERVER)).toContain('./server-tool-access.js');
    expect(read(WORKSPACE_ROUTER)).toContain('./workspace-router-runtime.js');
    expect(read(LOCAL_HISTORY)).toContain('./persisted-local-history-views.js');
    expect(read(LOCAL_HISTORY)).toContain('./persisted-local-history-policy.js');
  });

  it("Can the MCP server and workspace router delegate composition work to focused helpers while preserving the same repo-local behavior under typecheck, lint, and the existing MCP/library test slices?", () => {
    const server = read(MCP_SERVER);
    const router = read(WORKSPACE_ROUTER);
    const daemon = read(DAEMON_SERVER);
    const cli = read(CLI_MAIN);

    expect(server).toContain("./tool-registry.js");
    expect(server).toContain("./server-tool-access.js");
    expect(router).toContain("./workspace-router-runtime.js");
    expect(daemon).toContain("./daemon-bootstrap.js");
    expect(daemon).toContain("./daemon-session-host.js");
    expect(cli).toContain("./command-parser.js");
    expect(cli).toContain("./peer-command.js");
  });

  it("Is `persisted-local-history.ts` reduced to store/orchestration responsibilities, with summary/activity projection and continuity policy/event construction extracted into pure helper modules?", () => {
    const content = read(LOCAL_HISTORY);

    expect(fs.existsSync(LOCAL_HISTORY_VIEWS)).toBe(true);
    expect(fs.existsSync(LOCAL_HISTORY_POLICY)).toBe(true);
    expect(content).toContain("./persisted-local-history-views.js");
    expect(content).toContain("./persisted-local-history-policy.js");
  });

  it("Do CLI and daemon roots avoid re-owning peer-command, transport-session, and bootstrap internals now that those responsibilities have explicit modules?", () => {
    const cli = read(CLI_MAIN);
    const daemon = read(DAEMON_SERVER);

    expect(fs.existsSync(CLI_COMMAND_PARSER)).toBe(true);
    expect(fs.existsSync(CLI_PEER_COMMAND)).toBe(true);
    expect(fs.existsSync(DAEMON_BOOTSTRAP)).toBe(true);
    expect(fs.existsSync(DAEMON_SESSION_HOST)).toBe(true);

    expect(cli).not.toContain("new CanonicalJsonCodec()");
    expect(cli).not.toContain("createGraftServer(");
    expect(daemon).not.toContain("new StreamableHTTPServerTransport(");
    expect(daemon).not.toContain("isInitializeRequest(");
    expect(daemon).not.toContain("createGraftServer(");
  });

  it("Do `startStdioServer` and the read hook entrypoints remain thin composition roots rather than alternate homes for application behavior?", () => {
    const stdio = read(STDIO_SERVER);
    const preHook = read(PRE_READ_HOOK);
    const postHook = read(POST_READ_HOOK);

    expect(lineCount(STDIO_SERVER)).toBeLessThanOrEqual(30);
    expect(stdio).toContain("new StdioServerTransport()");
    expect(stdio).toContain("createGraftServer");

    expect(lineCount(PRE_READ_HOOK)).toBeLessThanOrEqual(60);
    expect(preHook).toContain("runHook(handleReadHook, 2)");
    expect(preHook).toContain("inspectHookRead");

    expect(lineCount(POST_READ_HOOK)).toBeLessThanOrEqual(60);
    expect(postHook).toContain("runHook(handlePostReadHook, 0)");
    expect(postHook).toContain("inspectHookRead");
  });
});
