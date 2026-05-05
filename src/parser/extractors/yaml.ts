import type { SyntaxNode as TSNode } from "web-tree-sitter";
import { type JumpEntry, OutlineEntry } from "../types.js";
import {
  type ExtractorResult,
  type LanguageExtractor,
  boundSignature,
  buildJumpEntry,
} from "./common.js";

const MAX_YAML_CHILDREN = 32;
const MAX_YAML_DEPTH = 4;

export class YamlExtractor implements LanguageExtractor {
  extract(root: TSNode): ExtractorResult {
    const entries: OutlineEntry[] = [];
    const jumpTable: JumpEntry[] = [];
    const mapping = this.topLevelBlockMapping(root);
    if (mapping === undefined) {
      return { entries, jumpTable };
    }

    for (const pair of this.mappingPairs(mapping)) {
      const entry = this.processPair(pair, 0);
      if (!entry) continue;
      entries.push(entry);
      jumpTable.push(buildJumpEntry(entry.name, entry.kind, pair));
    }

    return { entries, jumpTable };
  }

  private processPair(node: TSNode, depth: number): OutlineEntry | undefined {
    const key = node.childForFieldName("key");
    const value = node.childForFieldName("value");
    const name = key ? this.scalarText(key) : undefined;
    if (!name || value === null) return undefined;

    const children = depth < MAX_YAML_DEPTH
      ? this.valuePairs(value)
        .slice(0, MAX_YAML_CHILDREN)
        .map((pair) => this.processPair(pair, depth + 1))
        .filter((entry): entry is OutlineEntry => entry !== undefined)
      : [];

    return new OutlineEntry({
      kind: "field",
      name,
      exported: true,
      signature: boundSignature(`${name}: ${this.valueShape(value)}`),
      ...(children.length > 0 ? { children } : {}),
    });
  }

  private topLevelBlockMapping(root: TSNode): TSNode | undefined {
    if (root.type === "block_mapping") return root;
    if (root.type !== "stream" && root.type !== "document" && root.type !== "block_node") {
      return undefined;
    }
    for (const child of root.namedChildren) {
      const found = this.topLevelBlockMapping(child);
      if (found !== undefined) return found;
    }
    return undefined;
  }

  private valuePairs(node: TSNode): TSNode[] {
    const value = this.semanticValueNode(node);
    if (value?.type !== "block_mapping") return [];
    return this.mappingPairs(value);
  }

  private mappingPairs(node: TSNode): TSNode[] {
    return node.namedChildren.filter((child) => child.type === "block_mapping_pair");
  }

  private scalarText(node: TSNode): string | undefined {
    if (node.type === "flow_node") {
      return node.text.trim();
    }
    const scalar = node.descendantsOfType("string_scalar")[0];
    return scalar?.text.trim();
  }

  private valueShape(node: TSNode): string {
    const value = this.semanticValueNode(node);
    if (value?.type === "block_mapping") {
      return `object (${String(this.mappingPairs(value).length)} keys)`;
    }
    if (value?.type === "flow_mapping") {
      return `object (${String(value.namedChildren.length)} keys)`;
    }
    if (value?.type === "block_sequence" || value?.type === "flow_sequence") {
      return `array (${String(value.namedChildren.length)} items)`;
    }

    return "scalar";
  }

  private semanticValueNode(node: TSNode): TSNode | undefined {
    if (
      (node.type === "block_node" || node.type === "flow_node")
      && node.namedChildren.length === 1
    ) {
      const child = node.namedChildren[0];
      return child ? this.semanticValueNode(child) : node;
    }
    return node;
  }
}
