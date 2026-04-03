// ---------------------------------------------------------------------------
// FileSystem port — hexagonal boundary for file I/O
// ---------------------------------------------------------------------------

/**
 * Portable filesystem interface. Core logic imports this port, not node:fs.
 * Node adapter implements it; tests can substitute a mock.
 */
export interface FileSystem {
  readFile(path: string, encoding: "utf-8"): Promise<string>;
  readFile(path: string): Promise<Buffer>;
  writeFile(path: string, data: string, encoding: "utf-8"): Promise<void>;
  appendFile(path: string, data: string, encoding: "utf-8"): Promise<void>;
  mkdir(path: string, options: { recursive: true }): Promise<void>;
  stat(path: string): Promise<{ size: number }>;
  readFileSync(path: string, encoding: "utf-8"): string;
}
