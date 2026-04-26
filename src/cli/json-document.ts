import * as fs from "node:fs";
import * as path from "node:path";
import {
  cloneJsonValue,
  isJsonObjectValue,
  type JsonArrayValue,
  type JsonObjectValue,
  type JsonValue,
} from "./init-model.js";

function formatJsonField(pointer: readonly string[]): string {
  return pointer.length === 0 ? "document root" : pointer.join(".");
}

export class JsonArrayNode {
  constructor(
    private readonly value: JsonArrayValue,
    private readonly label: string,
    private readonly pointer: readonly string[] = [],
  ) {}

  static fromUnknown(
    value: unknown,
    label: string,
    pointer: readonly string[] = [],
  ): JsonArrayNode {
    if (!Array.isArray(value)) {
      throw new Error(`${label}: expected ${formatJsonField(pointer)} to be an array`);
    }
    return new JsonArrayNode(value as JsonArrayValue, label, pointer);
  }

  objectItems(): JsonObjectNode[] {
    return this.value.map((item, index) =>
      JsonObjectNode.fromUnknown(item, this.label, [...this.pointer, `[${String(index)}]`]),
    );
  }

  objectEntries(): { index: number; node: JsonObjectNode }[] {
    return this.value.map((item, index) => ({
      index,
      node: JsonObjectNode.fromUnknown(item, this.label, [...this.pointer, `[${String(index)}]`]),
    }));
  }

  push(value: JsonValue): void {
    this.value.push(cloneJsonValue(value));
  }

  set(index: number, value: JsonValue): void {
    this.value[index] = cloneJsonValue(value);
  }
}

export class JsonObjectNode {
  constructor(
    private readonly value: JsonObjectValue,
    private readonly label: string,
    private readonly pointer: readonly string[] = [],
  ) {}

  static fromUnknown(
    value: unknown,
    label: string,
    pointer: readonly string[] = [],
  ): JsonObjectNode {
    if (!isJsonObjectValue(value)) {
      throw new Error(`${label}: expected ${formatJsonField(pointer)} to be an object`);
    }
    return new JsonObjectNode(value, label, pointer);
  }

  has(key: string): boolean {
    return this.value[key] !== undefined;
  }

  set(key: string, value: JsonValue): void {
    this.value[key] = cloneJsonValue(value);
  }

  ensureObject(key: string): JsonObjectNode {
    const current = this.value[key];
    if (current === undefined) {
      const created: JsonObjectValue = {};
      this.value[key] = created;
      return new JsonObjectNode(created, this.label, [...this.pointer, key]);
    }
    return JsonObjectNode.fromUnknown(current, this.label, [...this.pointer, key]);
  }

  ensureArray(key: string): JsonArrayNode {
    const current = this.value[key];
    if (current === undefined) {
      const created: JsonArrayValue = [];
      this.value[key] = created;
      return new JsonArrayNode(created, this.label, [...this.pointer, key]);
    }
    return JsonArrayNode.fromUnknown(current, this.label, [...this.pointer, key]);
  }

  requireArray(key: string): JsonArrayNode {
    const current = this.value[key];
    if (current === undefined) {
      throw new Error(`${this.label}: expected ${formatJsonField([...this.pointer, key])} to exist`);
    }
    return JsonArrayNode.fromUnknown(current, this.label, [...this.pointer, key]);
  }

  stringValue(key: string): string | undefined {
    const current = this.value[key];
    return typeof current === "string" ? current : undefined;
  }

  toJsonValue(): JsonObjectValue {
    return this.value;
  }
}

export class JsonObjectDocument {
  constructor(
    readonly label: string,
    readonly filePath: string,
    private readonly rootNode: JsonObjectNode,
  ) {}

  static create(
    filePath: string,
    label: string,
    root: JsonObjectValue,
  ): JsonObjectDocument {
    return new JsonObjectDocument(
      label,
      filePath,
      new JsonObjectNode(cloneJsonValue(root), label),
    );
  }

  static open(filePath: string, label: string): JsonObjectDocument {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8")) as unknown;
    return new JsonObjectDocument(
      label,
      filePath,
      JsonObjectNode.fromUnknown(parsed, label),
    );
  }

  root(): JsonObjectNode {
    return this.rootNode;
  }

  write(): void {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(this.rootNode.toJsonValue(), null, 2));
  }
}
