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
