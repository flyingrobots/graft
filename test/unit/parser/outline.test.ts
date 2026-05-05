import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { extractOutline, extractOutlineForFile } from "../../../src/parser/outline.js";
import type { JumpEntry } from "../../../src/parser/types.js";

describe("parser: outline extraction", () => {
  describe("TypeScript", () => {
    it("extracts exported functions", () => {
      const source = `export function greet(name: string): string {
  return \`Hello, \${name}!\`;
}`;
      const outline = extractOutline(source, "ts");
      expect(outline.entries).toContainEqual(
        expect.objectContaining({
          kind: "function",
          name: "greet",
          signature: expect.stringContaining("greet(name: string): string") as string,
          exported: true,
        }),
      );
    });

    it("extracts classes with methods", () => {
      const source = `export class Foo {
  bar(): void {}
  baz(x: number): string { return String(x); }
}`;
      const outline = extractOutline(source, "ts");
      const cls = outline.entries.find((e) => e.kind === "class");
      expect(cls).toBeDefined();
      expect(cls!.name).toBe("Foo");
      expect(cls!.children).toHaveLength(2);
      expect(cls!.children![0]!.name).toBe("bar");
      expect(cls!.children![1]!.name).toBe("baz");
    });

    it("extracts interfaces", () => {
      const source = `export interface Config {
  host: string;
  port: number;
}`;
      const outline = extractOutline(source, "ts");
      expect(outline.entries).toContainEqual(
        expect.objectContaining({
          kind: "interface",
          name: "Config",
          exported: true,
        }),
      );
    });

    it("extracts type aliases", () => {
      const source = `export type Status = "ok" | "error";`;
      const outline = extractOutline(source, "ts");
      expect(outline.entries).toContainEqual(
        expect.objectContaining({
          kind: "type",
          name: "Status",
          exported: true,
        }),
      );
    });

    it("extracts exported constants", () => {
      const source = `export const VERSION = "1.0.0";`;
      const outline = extractOutline(source, "ts");
      expect(outline.entries).toContainEqual(
        expect.objectContaining({
          kind: "export",
          name: "VERSION",
        }),
      );
    });

    it("marks non-exported symbols as exported: false", () => {
      const source = `function internal(): void {}`;
      const outline = extractOutline(source, "ts");
      expect(outline.entries).toContainEqual(
        expect.objectContaining({
          name: "internal",
          exported: false,
        }),
      );
    });
  });

  describe("JavaScript", () => {
    it("extracts functions from JS files", () => {
      const source = `export function add(a, b) { return a + b; }`;
      const outline = extractOutline(source, "js");
      expect(outline.entries).toContainEqual(
        expect.objectContaining({
          kind: "function",
          name: "add",
          exported: true,
        }),
      );
    });
  });

  describe("Rust", () => {
    it("extracts public and private Rust declarations", () => {
      const source = [
        "pub fn greet(name: &str) -> String {",
        "  name.to_string()",
        "}",
        "",
        "fn hidden() {}",
        "",
        "pub struct User {",
        "  name: String,",
        "}",
        "",
        "pub trait Named {",
        "  fn name(&self) -> &str;",
        "}",
      ].join("\n");

      const outline = extractOutline(source, "rust");

      expect(outline.entries).toEqual(expect.arrayContaining([
        expect.objectContaining({
          kind: "function",
          name: "greet",
          signature: "greet(name: &str): String",
          exported: true,
        }),
        expect.objectContaining({
          kind: "function",
          name: "hidden",
          exported: false,
        }),
        expect.objectContaining({
          kind: "class",
          name: "User",
          exported: true,
        }),
        expect.objectContaining({
          kind: "interface",
          name: "Named",
          exported: true,
        }),
      ]));

      const trait = outline.entries.find((entry) => entry.name === "Named");
      expect(trait?.children).toEqual(expect.arrayContaining([
        expect.objectContaining({
          kind: "method",
          name: "name",
          signature: "name(&self): &str",
        }),
      ]));
    });

    it("extracts impl blocks and public Rust methods", () => {
      const source = [
        "impl User {",
        "  pub fn new() -> Self {",
        "    Self {}",
        "  }",
        "",
        "  fn hidden_method(&self) {}",
        "}",
      ].join("\n");

      const outline = extractOutlineForFile("src/lib.rs", source);
      expect(outline).not.toBeNull();

      const implEntry = outline!.entries.find((entry) => entry.name === "User");
      expect(implEntry).toEqual(expect.objectContaining({
        kind: "class",
        name: "User",
        signature: "impl User",
      }));
      expect(implEntry?.children).toEqual(expect.arrayContaining([
        expect.objectContaining({
          kind: "method",
          name: "new",
          signature: "new(): Self",
          exported: true,
        }),
        expect.objectContaining({
          kind: "method",
          name: "hidden_method",
          exported: false,
        }),
      ]));
    });
  });

  describe("GraphQL", () => {
    it("extracts schema, type, field, directive, operation, and fragment outlines", () => {
      const source = [
        "schema { query: Query }",
        "",
        "type Query {",
        "  user(id: ID!): User",
        "}",
        "",
        "interface Node { id: ID! }",
        "",
        "type User implements Node {",
        "  id: ID!",
        "  name: String!",
        "}",
        "",
        "input UserInput { name: String! }",
        "",
        "enum Role { ADMIN USER }",
        "",
        "scalar DateTime",
        "",
        "union SearchResult = User",
        "",
        "directive @auth(role: Role!) on FIELD_DEFINITION",
        "",
        "query GetUser($id: ID!) { user(id: $id) { id name } }",
        "",
        "fragment UserFields on User { id name }",
        "",
        "extend type User { email: String }",
      ].join("\n");

      const outline = extractOutlineForFile("src/schema.graphql", source);

      expect(outline).not.toBeNull();
      expect(outline!.entries).toEqual(expect.arrayContaining([
        expect.objectContaining({
          kind: "schema",
          name: "schema",
          signature: "schema",
          exported: true,
        }),
        expect.objectContaining({
          kind: "object",
          name: "Query",
          signature: "type Query",
          exported: true,
        }),
        expect.objectContaining({
          kind: "interface",
          name: "Node",
          signature: "interface Node",
          exported: true,
        }),
        expect.objectContaining({
          kind: "input",
          name: "UserInput",
          signature: "input UserInput",
          exported: true,
        }),
        expect.objectContaining({
          kind: "enum",
          name: "Role",
          signature: "enum Role",
          exported: true,
        }),
        expect.objectContaining({
          kind: "scalar",
          name: "DateTime",
          signature: "scalar DateTime",
          exported: true,
        }),
        expect.objectContaining({
          kind: "union",
          name: "SearchResult",
          signature: "union SearchResult = User",
          exported: true,
        }),
        expect.objectContaining({
          kind: "directive",
          name: "@auth",
          signature: "directive @auth(role: Role!) on FIELD_DEFINITION",
          exported: true,
        }),
        expect.objectContaining({
          kind: "operation",
          name: "GetUser",
          signature: "query GetUser($id: ID!)",
          exported: true,
        }),
        expect.objectContaining({
          kind: "fragment",
          name: "UserFields",
          signature: "fragment UserFields on User",
          exported: true,
        }),
        expect.objectContaining({
          kind: "object",
          name: "extend User",
          signature: "extend type User",
          exported: true,
        }),
      ]));

      const query = outline!.entries.find((entry) => entry.name === "Query");
      expect(query?.children).toEqual([
        expect.objectContaining({
          kind: "field",
          name: "user",
          signature: "user(id: ID!): User",
          exported: true,
        }),
      ]);

      const input = outline!.entries.find((entry) => entry.name === "UserInput");
      expect(input?.children).toEqual([
        expect.objectContaining({
          kind: "input_field",
          name: "name",
          signature: "name: String!",
          exported: true,
        }),
      ]);

      const role = outline!.entries.find((entry) => entry.name === "Role");
      expect(role?.children).toEqual([
        expect.objectContaining({ kind: "enum_value", name: "ADMIN" }),
        expect.objectContaining({ kind: "enum_value", name: "USER" }),
      ]);

      expect(outline!.jumpTable).toContainEqual(expect.objectContaining({
        symbol: "GetUser",
        kind: "operation",
        start: 24,
        end: 24,
      }));
    });

    it("names anonymous GraphQL operations without dropping the outline entry", () => {
      const outline = extractOutline("{ viewer { id } }", "graphql");

      expect(outline.entries).toContainEqual(expect.objectContaining({
        kind: "operation",
        name: "<anonymous query>",
        signature: "query <anonymous query>",
        exported: true,
      }));
    });

    it("extracts a Continuum GraphQL contract fixture with domain-specific kinds", () => {
      const source = readFileSync(
        new URL("../../fixtures/graphql/continuum-runtime-boundary-family.graphql", import.meta.url),
        "utf8",
      );
      const outline = extractOutlineForFile(
        "test/fixtures/graphql/continuum-runtime-boundary-family.graphql",
        source,
      );

      expect(outline).not.toBeNull();
      expect(outline!.partial).not.toBe(true);
      expect(outline!.entries).toHaveLength(13);
      expect(outline!.jumpTable).toContainEqual(expect.objectContaining({
        symbol: "Hash",
        kind: "scalar",
      }));
      expect(outline!.jumpTable).toContainEqual(expect.objectContaining({
        symbol: "Query",
        kind: "object",
      }));

      const hash = outline!.entries.find((entry) => entry.name === "Hash");
      expect(hash).toEqual(expect.objectContaining({
        kind: "scalar",
        signature: "scalar Hash",
        exported: true,
      }));

      const outcomeKind = outline!.entries.find((entry) => entry.name === "RuntimeAdmissionOutcomeKind");
      expect(outcomeKind).toEqual(expect.objectContaining({
        kind: "enum",
        signature: "enum RuntimeAdmissionOutcomeKind",
      }));
      expect(outcomeKind?.children).toEqual([
        expect.objectContaining({ kind: "enum_value", name: "DERIVED" }),
        expect.objectContaining({ kind: "enum_value", name: "PLURAL" }),
        expect.objectContaining({ kind: "enum_value", name: "CONFLICT" }),
        expect.objectContaining({ kind: "enum_value", name: "OBSTRUCTION" }),
      ]);

      const intentEnvelope = outline!.entries.find((entry) => entry.name === "IntentEnvelope");
      expect(intentEnvelope).toEqual(expect.objectContaining({
        kind: "object",
        signature: expect.stringContaining("@wes_codec") as string,
      }));
      expect(intentEnvelope?.signature).toContain("@wes_registry");
      expect(intentEnvelope?.children).toEqual(expect.arrayContaining([
        expect.objectContaining({
          kind: "field",
          name: "intentId",
          signature: "intentId: ID!",
        }),
        expect.objectContaining({
          kind: "field",
          name: "payloadDigest",
          signature: "payloadDigest: Hash!",
        }),
      ]));

      const query = outline!.entries.find((entry) => entry.name === "Query");
      expect(query?.children).toHaveLength(7);
      expect(query?.children).toEqual(expect.arrayContaining([
        expect.objectContaining({
          kind: "field",
          name: "intentEnvelopes",
          signature: "intentEnvelopes(targetLaneId: String): [IntentEnvelope!]!",
        }),
        expect.objectContaining({
          kind: "field",
          name: "importOutcomes",
          signature: "importOutcomes(shellId: ID, targetRuntimeId: String): [ImportOutcome!]!",
        }),
      ]));

      const invariants = outline!.entries.find((entry) => entry.name === "ContinuumRuntimeBoundaryFamilyInvariants");
      expect(invariants).toEqual(expect.objectContaining({
        kind: "object",
        signature: expect.stringContaining("@wes_invariant") as string,
      }));
      expect(invariants?.children).toEqual([
        expect.objectContaining({
          kind: "field",
          name: "_placeholder",
          signature: "_placeholder: Boolean",
        }),
      ]);
    });
  });

  describe("Python", () => {
    it("extracts functions, classes, public methods, fields, and module constants", () => {
      const source = readFileSync(
        new URL("../../fixtures/python/agent_service.py", import.meta.url),
        "utf8",
      );
      const outline = extractOutlineForFile("test/fixtures/python/agent_service.py", source);

      expect(outline).not.toBeNull();
      expect(outline!.partial).not.toBe(true);
      expect(outline!.entries).toEqual(expect.arrayContaining([
        expect.objectContaining({
          kind: "constant",
          name: "DEFAULT_TIMEOUT",
          signature: "DEFAULT_TIMEOUT: int",
          exported: true,
        }),
        expect.objectContaining({
          kind: "class",
          name: "Runnable",
          signature: "class Runnable(Protocol)",
          exported: true,
        }),
        expect.objectContaining({
          kind: "class",
          name: "AgentService",
          signature: "class AgentService",
          exported: true,
        }),
        expect.objectContaining({
          kind: "function",
          name: "build_service",
          signature: "build_service(service_id: str, *, timeout_seconds: int = DEFAULT_TIMEOUT): AgentService",
          exported: true,
        }),
        expect.objectContaining({
          kind: "function",
          name: "fetch_payload",
          signature: "async fetch_payload(url: str): bytes",
          exported: true,
        }),
      ]));
      expect(outline!.entries).not.toContainEqual(expect.objectContaining({
        name: "_INTERNAL_SENTINEL",
      }));

      const runnable = outline!.entries.find((entry) => entry.name === "Runnable");
      expect(runnable?.children).toEqual([
        expect.objectContaining({
          kind: "method",
          name: "run",
          signature: "run(self, payload: bytes): bytes",
          exported: true,
        }),
      ]);

      const service = outline!.entries.find((entry) => entry.name === "AgentService");
      expect(service?.children).toEqual(expect.arrayContaining([
        expect.objectContaining({
          kind: "field",
          name: "service_id",
          signature: "service_id: str",
        }),
        expect.objectContaining({
          kind: "field",
          name: "timeout_seconds",
          signature: "timeout_seconds: int",
        }),
        expect.objectContaining({
          kind: "method",
          name: "describe",
          signature: "describe(self): str",
          exported: true,
        }),
        expect.objectContaining({
          kind: "method",
          name: "execute",
          signature: "async execute(self, payload: bytes): bytes",
          exported: true,
        }),
        expect.objectContaining({
          kind: "method",
          name: "_debug_label",
          exported: false,
        }),
      ]));

      expect(outline!.jumpTable).toContainEqual(expect.objectContaining({
        symbol: "DEFAULT_TIMEOUT",
        kind: "constant",
        start: 6,
        end: 6,
      }));
      expect(outline!.jumpTable).toContainEqual(expect.objectContaining({
        symbol: "AgentService",
        kind: "class",
        start: 15,
        end: 27,
      }));
      expect(outline!.jumpTable).toContainEqual(expect.objectContaining({
        symbol: "fetch_payload",
        kind: "function",
        start: 34,
        end: 35,
      }));
    });
  });

  describe("Markdown", () => {
    it("extracts heading hierarchy with section ranges", () => {
      const source = [
        "# Overview",
        "",
        "Intro",
        "",
        "## Install",
        "",
        "Steps",
        "",
        "### Linux",
        "",
        "Use apt.",
        "",
        "## Usage",
        "",
        "Run it.",
      ].join("\n");

      const outline = extractOutlineForFile("README.md", source);
      expect(outline).not.toBeNull();

      expect(outline!.entries).toContainEqual(
        expect.objectContaining({
          kind: "heading",
          name: "Overview",
          children: expect.arrayContaining([
            expect.objectContaining({ kind: "heading", name: "Install" }),
            expect.objectContaining({ kind: "heading", name: "Usage" }),
          ]) as unknown[],
        }),
      );

      const install = (outline!.entries[0]!.children ?? []).find((entry) => entry.name === "Install");
      expect(install?.children).toContainEqual(
        expect.objectContaining({ kind: "heading", name: "Linux" }),
      );

      const overviewJump = outline!.jumpTable!.find((j: JumpEntry) => j.symbol === "Overview");
      expect(overviewJump).toEqual(expect.objectContaining({ kind: "heading", start: 1, end: 15 }));

      const installJump = outline!.jumpTable!.find((j: JumpEntry) => j.symbol === "Install");
      expect(installJump).toEqual(expect.objectContaining({ kind: "heading", start: 5, end: 12 }));

      const linuxJump = outline!.jumpTable!.find((j: JumpEntry) => j.symbol === "Linux");
      expect(linuxJump).toEqual(expect.objectContaining({ kind: "heading", start: 9, end: 12 }));

      const usageJump = outline!.jumpTable!.find((j: JumpEntry) => j.symbol === "Usage");
      expect(usageJump).toEqual(expect.objectContaining({ kind: "heading", start: 13, end: 15 }));
    });

    it("supports setext headings", () => {
      const source = [
        "Overview",
        "========",
        "",
        "Intro",
        "",
        "Install",
        "-------",
        "",
        "Steps",
        "",
        "Next",
        "====",
      ].join("\n");

      const outline = extractOutlineForFile("README.md", source);
      expect(outline).not.toBeNull();

      const names = outline!.jumpTable!.map((entry) => entry.symbol);
      expect(names).toContain("Overview");
      expect(names).toContain("Install");
      expect(names).toContain("Next");
    });

    it("ignores heading-like lines inside fenced code blocks", () => {
      const source = [
        "# Title",
        "",
        "```md",
        "## Not A Heading",
        "```",
        "",
        "## Real Heading",
      ].join("\n");

      const outline = extractOutlineForFile("README.md", source);
      expect(outline).not.toBeNull();

      const names = outline!.jumpTable!.map((entry) => entry.symbol);
      expect(names).toContain("Title");
      expect(names).toContain("Real Heading");
      expect(names).not.toContain("Not A Heading");
    });

    it("returns an empty outline for markdown files with no headings", () => {
      const outline = extractOutlineForFile(
        "README.md",
        Array.from({ length: 220 }, (_, i) => `Paragraph ${String(i)}.`).join("\n\n"),
      );

      expect(outline).not.toBeNull();
      expect(outline!.entries).toEqual([]);
      expect(outline!.jumpTable).toEqual([]);
    });
  });

  describe("jump table", () => {
    it("produces a jump table mapping symbols to line ranges", () => {
      const source = `export function first(): void {
  console.log("one");
}

export function second(): void {
  console.log("two");
}`;
      const outline = extractOutline(source, "ts");
      expect(outline.jumpTable).toBeDefined();
      expect(outline.jumpTable!.length).toBeGreaterThanOrEqual(2);

      const firstJump = outline.jumpTable!.find((j: JumpEntry) => j.symbol === "first");
      expect(firstJump).toBeDefined();
      expect(firstJump!.start).toBe(1);
      expect(firstJump!.end).toBe(3);
      expect(firstJump!.kind).toBe("function");

      const secondJump = outline.jumpTable!.find((j: JumpEntry) => j.symbol === "second");
      expect(secondJump).toBeDefined();
      expect(secondJump!.start).toBe(5);
      expect(secondJump!.end).toBe(7);
    });
  });

  describe("output bounding", () => {
    it("truncates long signatures", () => {
      const longParams = Array.from({ length: 20 }, (_, i) => `param${String(i)}: string`).join(", ");
      const source = `export function wide(${longParams}): void {}`;
      const outline = extractOutline(source, "ts");
      const fn = outline.entries.find((e) => e.name === "wide");
      expect(fn).toBeDefined();
      // Signature should be bounded, not the full monster
      expect(fn!.signature!.length).toBeLessThan(200);
    });

    it("compacts object literal default params", () => {
      const source = `export function config(opts: { a: string; b: number; c: boolean; d: string; e: number } = { a: "aaaa", b: 1234, c: true, d: "dddd", e: 5678 }): void {}`;
      const outline = extractOutline(source, "ts");
      const fn = outline.entries.find((e) => e.name === "config");
      expect(fn).toBeDefined();
      expect(fn!.signature!.length).toBeLessThan(200);
    });
  });

  describe("error recovery", () => {
    it("returns partial outline for broken files", () => {
      const source = `export class Incomplete {
  validMethod(): string {
    return "works";
  }

  brokenMethod(x: string {
    return x;
  }

export function afterBroken(): number {
  return 42;
}`;
      const outline = extractOutline(source, "ts");
      expect(outline.partial).toBe(true);
      // Should still extract what it can
      expect(outline.entries.length).toBeGreaterThan(0);
    });
  });
});
