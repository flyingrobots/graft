import * as crypto from "node:crypto";
import * as fs from "node:fs/promises";
import * as http from "node:http";
import * as net from "node:net";
import * as path from "node:path";
import { graftRootPath, graftRootPipeKey } from "../adapters/graft-root.js";

const DIRECTORY_MODE = 0o700;
const SOCKET_MODE = 0o600;

export function isNamedPipePath(socketPath: string): boolean {
  return process.platform === "win32" && socketPath.startsWith("\\\\.\\pipe\\");
}

export function defaultDaemonRoot(graftRoot: string = graftRootPath()): string {
  return path.join(graftRoot, "daemon");
}

/** What the default socket path depends on besides the daemon root. */
export interface DefaultSocketContext {
  /** The environment whose GRAFT_ROOT_PATH keys the Windows pipe; process.env by default. */
  readonly env?: Readonly<Record<string, string | undefined>> | undefined;
  /** The platform whose socket convention applies; the running one by default. */
  readonly platform?: NodeJS.Platform | undefined;
}

function defaultSocketPath(graftDir: string, context: DefaultSocketContext): string {
  const platform = context.platform ?? process.platform;
  if (platform === "win32") {
    const pipeKey = graftRootPipeKey(context.env ?? process.env, undefined, platform);
    const digest = crypto.createHash("sha256").update(pipeKey).digest("hex").slice(0, 12);
    return `\\\\.\\pipe\\graft-daemon-${digest}`;
  }
  return path.join(graftDir, "mcp.sock");
}

export function resolveSocketPath(
  socketPath: string | undefined,
  graftDir: string,
  cwd?: string,
  context: DefaultSocketContext = {},
): string {
  if (socketPath === undefined) return defaultSocketPath(graftDir, context);
  if (isNamedPipePath(socketPath)) return socketPath;
  return cwd === undefined ? path.resolve(socketPath) : path.resolve(cwd, socketPath);
}

export async function ensurePrivateDirectory(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true, mode: DIRECTORY_MODE });
  if (process.platform !== "win32") {
    await fs.chmod(dirPath, DIRECTORY_MODE).catch(() => {
      return undefined;
    });
  }
}

export async function socketHasActiveListener(socketPath: string): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const socket = net.createConnection({ path: socketPath });
    let settled = false;

    const finish = (result: boolean): void => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(result);
    };

    socket.once("connect", () => {
      finish(true);
    });
    socket.once("error", () => {
      finish(false);
    });
    socket.setTimeout(200, () => {
      finish(false);
    });
  });
}

export async function prepareSocketPath(socketPath: string): Promise<void> {
  if (isNamedPipePath(socketPath)) return;
  await ensurePrivateDirectory(path.dirname(socketPath));
  const existing = await fs.lstat(socketPath).catch((error: unknown) => {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return null;
    throw error;
  });
  if (existing === null) return;
  if (!existing.isSocket()) {
    throw new Error(`Refusing to overwrite non-socket path: ${socketPath}`);
  }
  if (await socketHasActiveListener(socketPath)) {
    throw new Error(`A graft daemon is already listening on ${socketPath}`);
  }
  await fs.unlink(socketPath);
}

export async function tightenSocketPermissions(socketPath: string): Promise<void> {
  if (process.platform === "win32" || isNamedPipePath(socketPath)) return;
  await fs.chmod(socketPath, SOCKET_MODE).catch(() => {
    return undefined;
  });
}

export async function closeHttpServer(server: http.Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}
