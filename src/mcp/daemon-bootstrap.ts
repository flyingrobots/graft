import * as crypto from "node:crypto";
import * as fs from "node:fs/promises";
import * as http from "node:http";
import * as net from "node:net";
import * as os from "node:os";
import * as path from "node:path";

const DIRECTORY_MODE = 0o700;
const SOCKET_MODE = 0o600;

export function isNamedPipePath(socketPath: string): boolean {
  return process.platform === "win32" && socketPath.startsWith("\\\\.\\pipe\\");
}

export function defaultDaemonRoot(): string {
  return path.join(os.homedir(), ".graft", "daemon");
}

function defaultSocketPath(graftDir: string): string {
  if (process.platform === "win32") {
    const digest = crypto.createHash("sha256").update(os.homedir()).digest("hex").slice(0, 12);
    return `\\\\.\\pipe\\graft-daemon-${digest}`;
  }
  return path.join(graftDir, "mcp.sock");
}

export function resolveSocketPath(socketPath: string | undefined, graftDir: string): string {
  if (socketPath === undefined) return defaultSocketPath(graftDir);
  if (isNamedPipePath(socketPath)) return socketPath;
  return path.resolve(socketPath);
}

export async function ensurePrivateDirectory(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true, mode: DIRECTORY_MODE });
  if (process.platform !== "win32") {
    await fs.chmod(dirPath, DIRECTORY_MODE).catch(() => {
      return undefined;
    });
  }
}

async function socketHasActiveListener(socketPath: string): Promise<boolean> {
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
