// Audit fixture: Mixed declaration types in one file
// Tests: interfaces, types, classes, functions, enums, arrow exports

export interface Config {
  host: string;
  port: number;
  debug: boolean;
}

export interface Logger {
  info(msg: string): void;
  error(msg: string, err?: Error): void;
}

export type Status = "active" | "inactive" | "pending";

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export enum HttpMethod {
  GET = "GET",
  POST = "POST",
  PUT = "PUT",
  DELETE = "DELETE",
}

export class Server {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  start(): void {
    console.log(`Starting on ${this.config.host}:${String(this.config.port)}`);
  }

  stop(): void {
    console.log("Stopping server");
  }
}

export class Client {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async request(method: HttpMethod, path: string): Promise<unknown> {
    const resp = await fetch(`${this.baseUrl}${path}`, { method });
    return resp.json();
  }
}

export function createServer(config: Config): Server {
  return new Server(config);
}

export function createClient(baseUrl: string): Client {
  return new Client(baseUrl);
}

export function parseConfig(raw: string): Config {
  return JSON.parse(raw) as Config;
}

export const DEFAULT_CONFIG: Config = {
  host: "localhost",
  port: 3000,
  debug: false,
};

export const formatStatus = (status: Status): string => {
  return status.charAt(0).toUpperCase() + status.slice(1);
};

// Non-exported declarations
function internalHelper(): void {
  // not exported
}

class InternalCache {
  private data = new Map<string, unknown>();
  get(key: string): unknown { return this.data.get(key); }
  set(key: string, value: unknown): void { this.data.set(key, value); }
}
