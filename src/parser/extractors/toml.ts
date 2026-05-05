import type { SyntaxNode as TSNode } from "web-tree-sitter";
import { type JumpEntry, OutlineEntry } from "../types.js";
import {
  type ExtractorResult,
  type LanguageExtractor,
  boundSignature,
  buildJumpEntry,
} from "./common.js";

export class TomlExtractor implements LanguageExtractor {
  extract(root: TSNode): ExtractorResult {
    const entries: OutlineEntry[] = [];
    const jumpTable: JumpEntry[] = [];

    for (const child of root.namedChildren) {
      const entry = this.processTopLevel(child);
      if (!entry) continue;
      entries.push(entry);
      jumpTable.push(buildJumpEntry(entry.name, entry.kind, child));
    }

    return { entries, jumpTable };
  }

  private processTopLevel(node: TSNode): OutlineEntry | undefined {
    if (node.type === "pair") {
      return this.processPair(node);
    }
    if (node.type === "table" || node.type === "table_array_element") {
      return this.processTable(node);
    }
    return undefined;
  }

  private processTable(node: TSNode): OutlineEntry | undefined {
    const key = node.namedChildren.find((child) =>
      child.type === "bare_key" || child.type === "dotted_key" || child.type === "quoted_key"
    );
    if (key === undefined) return undefined;

    const children = node.namedChildren
      .filter((child) => child.type === "pair")
      .map((pair) => this.processPair(pair))
      .filter((entry): entry is OutlineEntry => entry !== undefined);
    const tableKind = node.type === "table_array_element" ? "array_table" : "table";

    return new OutlineEntry({
      kind: "section",
      name: key.text,
      exported: true,
      signature: `${tableKind} ${key.text}`,
      ...(children.length > 0 ? { children } : {}),
    });
  }

  private processPair(node: TSNode): OutlineEntry | undefined {
    const key = node.namedChildren[0];
    const value = node.namedChildren[1];
    if (key === undefined || value === undefined) return undefined;

    return new OutlineEntry({
      kind: "field",
      name: key.text,
      exported: true,
      signature: boundSignature(`${key.text}: ${this.valueShape(value)}`),
    });
  }

  private valueShape(node: TSNode): string {
    switch (node.type) {
      case "string":
      case "integer":
      case "float":
      case "boolean":
      case "offset_date_time":
      case "local_date_time":
      case "local_date":
      case "local_time":
        return node.type;
      case "array":
        return `array (${String(node.namedChildren.length)} items)`;
      case "inline_table":
        return "inline_table";
      default:
        return node.type;
    }
  }
}
