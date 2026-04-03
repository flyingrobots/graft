// Audit fixture: God class with 30+ methods of varied kinds
// Tests: regular, static, get/set, async, private methods

export class DataService {
  private cache = new Map<string, unknown>();
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  // Regular methods
  findById(id: string): unknown { return this.cache.get(id); }
  findAll(): unknown[] { return [...this.cache.values()]; }
  save(id: string, data: unknown): void { this.cache.set(id, data); }
  delete(id: string): boolean { return this.cache.delete(id); }
  clear(): void { this.cache.clear(); }
  has(id: string): boolean { return this.cache.has(id); }
  count(): number { return this.cache.size; }

  // Async methods
  async fetch(id: string): Promise<unknown> {
    const resp = await globalThis.fetch(`${this.baseUrl}/${id}`);
    return resp.json();
  }
  async fetchAll(): Promise<unknown[]> {
    const resp = await globalThis.fetch(this.baseUrl);
    return resp.json() as Promise<unknown[]>;
  }
  async sync(id: string): Promise<void> {
    const data = await this.fetch(id);
    this.save(id, data);
  }

  // Static methods
  static create(baseUrl: string): DataService { return new DataService(baseUrl); }
  static fromEnv(): DataService { return new DataService(process.env["API_URL"] ?? ""); }
  static defaultHeaders(): Record<string, string> { return { "Content-Type": "application/json" }; }

  // Getters and setters
  get url(): string { return this.baseUrl; }
  set url(value: string) { this.baseUrl = value; }
  get size(): number { return this.cache.size; }
  get isEmpty(): boolean { return this.cache.size === 0; }

  // Private methods
  private validate(data: unknown): boolean { return data !== null && data !== undefined; }
  private serialize(data: unknown): string { return JSON.stringify(data); }
  private deserialize(raw: string): unknown { return JSON.parse(raw); }

  // Methods with complex signatures
  query(filter: { field: string; op: "eq" | "gt" | "lt"; value: unknown }): unknown[] {
    return this.findAll().filter(() => true);
  }
  bulkSave(items: Array<{ id: string; data: unknown }>): void {
    for (const item of items) this.save(item.id, item.data);
  }
  transform<T>(id: string, fn: (data: unknown) => T): T | null {
    const data = this.findById(id);
    return data !== undefined ? fn(data) : null;
  }
  subscribe(event: string, callback: (data: unknown) => void): () => void {
    return () => { void event; void callback; };
  }
  pipe<T, U>(input: T, ...fns: Array<(arg: unknown) => unknown>): U {
    return fns.reduce((acc, fn) => fn(acc), input as unknown) as U;
  }

  // More regular methods to hit 30+
  toJSON(): Record<string, unknown> { return Object.fromEntries(this.cache); }
  toString(): string { return `DataService(${this.baseUrl})`; }
  clone(): DataService {
    const svc = new DataService(this.baseUrl);
    for (const [k, v] of this.cache) svc.save(k, v);
    return svc;
  }
  merge(other: DataService): void {
    for (const [k, v] of Object.entries(other.toJSON())) this.save(k, v);
  }
  keys(): string[] { return [...this.cache.keys()]; }
  values(): unknown[] { return [...this.cache.values()]; }
  entries(): Array<[string, unknown]> { return [...this.cache.entries()]; }
}
