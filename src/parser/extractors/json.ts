import type { SyntaxNode as TSNode } from "web-tree-sitter";
import { type JumpEntry, OutlineEntry } from "../types.js";
import {
  type ExtractorResult,
  type LanguageExtractor,
  boundSignature,
  buildJumpEntry,
} from "./common.js";

const MAX_JSON_CHILDREN = 32;

export class JsonExtractor implements LanguageExtractor {
  extract(root: TSNode): ExtractorResult {
    const entries: OutlineEntry[] = [];
    const jumpTable: JumpEntry[] = [];
    const value = root.namedChildren[0];

    if (value?.type !== "object") {
      return { entries, jumpTable };
    }

    for (const pair of this.objectPairs(value)) {
      const entry = this.processPair(pair);
      if (!entry) continue;
      entries.push(entry);
      jumpTable.push(buildJumpEntry(entry.name, entry.kind, pair));
    }

    return { entries, jumpTable };
  }

  private objectPairs(node: TSNode): TSNode[] {
    return node.namedChildren.filter((child) => child.type === "pair");
  }

  private processPair(node: TSNode): OutlineEntry | undefined {
    const key = this.keyName(node);
    const value = node.childForFieldName("value");
    if (!key || value === null) return undefined;

    const children = value.type === "object"
      ? this.objectPairs(value)
        .slice(0, MAX_JSON_CHILDREN)
        .map((pair) => this.processPair(pair))
        .filter((entry): entry is OutlineEntry => entry !== undefined)
      : [];

    return new OutlineEntry({
      kind: "field",
      name: key,
      exported: true,
      signature: boundSignature(`${key}: ${this.valueShape(value)}`),
      ...(children.length > 0 ? { children } : {}),
    });
  }

  private keyName(node: TSNode): string | undefined {
    const key = node.childForFieldName("key");
    if (key === null) return undefined;

    try {
      const parsed = JSON.parse(key.text) as unknown;
      return typeof parsed === "string" ? parsed : undefined;
    } catch {
      return key.namedChildren.find((child) => child.type === "string_content")?.text;
    }
  }

  private valueShape(node: TSNode): string {
    switch (node.type) {
      case "object":
        return `object (${String(this.objectPairs(node).length)} keys)`;
      case "array":
        return `array (${String(node.namedChildren.length)} items)`;
      case "string":
        return "string";
      case "number":
        return "number";
      case "true":
      case "false":
        return "boolean";
      case "null":
        return "null";
      default:
        return node.type;
    }
  }
}
