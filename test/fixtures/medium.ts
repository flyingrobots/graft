/**
 * A file that sits right around the line threshold.
 * Used to test boundary conditions in policy.
 */

export interface Config {
  host: string;
  port: number;
  debug: boolean;
  timeout: number;
  retries: number;
}

export class ConnectionManager {
  private config: Config;
  private connections: Map<string, unknown>;

  constructor(config: Config) {
    this.config = config;
    this.connections = new Map();
  }

  async connect(id: string): Promise<void> {
    if (this.connections.has(id)) {
      throw new Error(`Connection ${id} already exists`);
    }
    // simulate connection
    await new Promise((resolve) => setTimeout(resolve, this.config.timeout));
    this.connections.set(id, { id, connected: true });
  }

  async disconnect(id: string): Promise<void> {
    if (!this.connections.has(id)) {
      throw new Error(`Connection ${id} not found`);
    }
    this.connections.delete(id);
  }

  getConnection(id: string): unknown {
    return this.connections.get(id);
  }

  listConnections(): string[] {
    return [...this.connections.keys()];
  }

  get connectionCount(): number {
    return this.connections.size;
  }

  isConnected(id: string): boolean {
    return this.connections.has(id);
  }

  async reconnect(id: string): Promise<void> {
    await this.disconnect(id);
    await this.connect(id);
  }

  async disconnectAll(): Promise<void> {
    for (const id of this.connections.keys()) {
      await this.disconnect(id);
    }
  }

  getConfig(): Config {
    return { ...this.config };
  }

  updateConfig(partial: Partial<Config>): void {
    this.config = { ...this.config, ...partial };
  }
}

export function createManager(config: Config): ConnectionManager {
  return new ConnectionManager(config);
}

export function defaultConfig(): Config {
  return {
    host: "localhost",
    port: 5432,
    debug: false,
    timeout: 5000,
    retries: 3,
  };
}

export type ConnectionStatus = "connected" | "disconnected" | "error";

export function getStatus(manager: ConnectionManager, id: string): ConnectionStatus {
  if (manager.isConnected(id)) {
    return "connected";
  }
  return "disconnected";
}

export const MAX_CONNECTIONS = 100;
export const DEFAULT_TIMEOUT = 5000;
export const RETRY_DELAY = 1000;
