// ---------------------------------------------------------------------------
// Inline fixture content for unit tests — avoids real filesystem I/O
// ---------------------------------------------------------------------------

/** 6-line TypeScript file — under every threshold. */
export const SMALL_TS = [
  'export function greet(name: string): string {',
  '  return `Hello, ${name}!`;',
  '}',
  '',
  'export const VERSION = "1.0.0";',
  '',
].join("\n");

/** ~100-line TypeScript file with class, interface, function, and type. */
export const MEDIUM_TS = [
  'export interface Config {',
  '  host: string;',
  '  port: number;',
  '  debug: boolean;',
  '}',
  '',
  'export class ConnectionManager {',
  '  private config: Config;',
  '',
  '  constructor(config: Config) {',
  '    this.config = config;',
  '  }',
  '',
  '  async connect(id: string): Promise<void> {',
  '    // noop',
  '  }',
  '',
  '  async disconnect(id: string): Promise<void> {',
  '    // noop',
  '  }',
  '',
  '  getConnection(id: string): unknown {',
  '    return undefined;',
  '  }',
  '',
  '  listConnections(): string[] {',
  '    return [];',
  '  }',
  '',
  '  get connectionCount(): number {',
  '    return 0;',
  '  }',
  '',
  '  isConnected(id: string): boolean {',
  '    return false;',
  '  }',
  '',
  '  async reconnect(id: string): Promise<void> {',
  '    await this.disconnect(id);',
  '    await this.connect(id);',
  '  }',
  '',
  '  async disconnectAll(): Promise<void> {',
  '    // noop',
  '  }',
  '',
  '  getConfig(): Config {',
  '    return { ...this.config };',
  '  }',
  '',
  '  updateConfig(partial: Partial<Config>): void {',
  '    this.config = { ...this.config, ...partial };',
  '  }',
  '}',
  '',
  'export function createManager(config: Config): ConnectionManager {',
  '  return new ConnectionManager(config);',
  '}',
  '',
  'export function defaultConfig(): Config {',
  '  return {',
  '    host: "localhost",',
  '    port: 5432,',
  '    debug: false,',
  '  };',
  '}',
  '',
  'export type ConnectionStatus = "connected" | "disconnected" | "error";',
  '',
  'export function getStatus(manager: ConnectionManager, id: string): ConnectionStatus {',
  '  if (manager.isConnected(id)) {',
  '    return "connected";',
  '  }',
  '  return "disconnected";',
  '}',
  '',
  'export const MAX_CONNECTIONS = 100;',
  'export const DEFAULT_TIMEOUT = 5000;',
  'export const RETRY_DELAY = 1000;',
  '',
  // Pad to ~100 lines
  ...Array.from({ length: 15 }, (_, i) =>
    `export const PADDING_${String(i)} = ${String(i)};`
  ),
  '',
].join("\n");

/** 653-line TypeScript file — exceeds line threshold. */
export function makeLargeTs(): string {
  const lines: string[] = [
    'export interface LargeConfig {',
  ];
  for (let i = 0; i < 40; i++) {
    lines.push(`  field${String(i)}: string;`);
  }
  lines.push('}', '');

  for (let i = 0; i < 30; i++) {
    lines.push(
      `export function handler${String(i)}(x: string): string {`,
      `  // This function does important processing for component ${String(i)}`,
      `  const value = x.trim().toLowerCase();`,
      `  const prefix = "component-${String(i)}-";`,
      `  const result = prefix + value;`,
      `  if (result.length > 100) {`,
      `    return result.slice(0, 100);`,
      `  }`,
      `  return result;`,
      '}',
      '',
    );
  }

  // Pad with comment blocks to make raw content much larger than outline
  for (let i = 0; i < 50; i++) {
    lines.push(
      `// ---------------------------------------------------------------------------`,
      `// Section ${String(i)}: configuration constants and supporting values`,
      `// ---------------------------------------------------------------------------`,
      `export const VAL_${String(i)} = ${String(i)};`,
      `export const DESC_${String(i)} = "Description for value ${String(i)}";`,
      '',
    );
  }
  lines.push('');
  return lines.join("\n");
}

/** Syntactically broken TypeScript — parser should produce partial results. */
export const BROKEN_TS = [
  'export class Incomplete {',
  '  validMethod(): string {',
  '    return "works";',
  '  }',
  '',
  '  brokenMethod(x: string {',
  '    return x;',
  '  }',
  '',
  'export function afterBroken(): number {',
  '  return 42;',
  '}',
  '',
].join("\n");

/** Minified JS content. */
export const MINIFIED_JS =
  'var a=function(b){return b*2};var c=function(d){return d+1};var e=function(f,g){return f(g)};';

/** Lockfile content. */
export const LOCKFILE_JSON = '{"name":"test","lockfileVersion":3,"packages":{}}';

/** Secret file content. */
export const SECRET_ENV = 'DB_PASSWORD=hunter2';

/** Binary-ish content (won't matter — policy checks extension, not content). */
export const BINARY_PNG = '\x89PNG\r\n\x1A\n';

/** Markdown with headings. */
export const MARKDOWN_WITH_HEADINGS = [
  '# Hello',
  '',
  '## Install',
  '',
  'Use it.',
  '',
].join("\n");

/** Large markdown (220 sections) — exceeds line threshold, triggers outline. */
export function makeLargeMarkdown(): string {
  return Array.from(
    { length: 220 },
    (_, i) => `## Section ${String(i)}\n\nParagraph ${String(i)}.\n`,
  ).join("\n");
}

/** Large markdown with no headings — exceeds line threshold, empty outline. */
export function makeLargeMarkdownNoHeadings(): string {
  return Array.from(
    { length: 220 },
    (_, i) => `Paragraph ${String(i)}.`,
  ).join("\n\n");
}
