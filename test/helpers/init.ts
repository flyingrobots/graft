import * as fs from "node:fs";
import * as path from "node:path";
import { expect } from "vitest";
import { runInit } from "../../src/cli/init.js";
import { git } from "./git.js";

export interface BufferWriter {
  text(): string;
  write(chunk: string): true;
}

export function createBufferWriter(): BufferWriter {
  let buffer = "";
  return {
    write(chunk: string): true {
      buffer += chunk;
      return true;
    },
    text(): string {
      return buffer;
    },
  };
}

export function runInitQuietly(args?: readonly string[]): void {
  runInit({
    args,
    stdout: createBufferWriter(),
    stderr: createBufferWriter(),
  });
}

export function initGitRepo(cwd: string): void {
  git(cwd, "init");
  git(cwd, "config user.email test@test.com");
  git(cwd, "config user.name test");
}

export function readJsonFile(cwd: string, ...segments: string[]): unknown {
  return JSON.parse(fs.readFileSync(path.join(cwd, ...segments), "utf-8")) as unknown;
}

export function expectGraftServerEntry(entry: { command: string; args: string[] }): void {
  expect(entry).toEqual({
    command: "npx",
    args: ["-y", "@flyingrobots/graft", "serve"],
  });
}

export function expectSingleGraftServerRecord(
  record: Record<string, { command: string; args: string[] }>,
): void {
  const graftEntry = record["graft"];
  expect(graftEntry).toBeDefined();
  if (graftEntry === undefined) {
    throw new Error("expected graft MCP server entry");
  }
  expectGraftServerEntry(graftEntry);
  expect(Object.keys(record).filter((name) => name === "graft")).toHaveLength(1);
}

export function expectSingleGraftServerArray(
  servers: { name: string; command: string; args: string[] }[],
): void {
  const graftEntries = servers.filter((entry) => entry.name === "graft");
  expect(graftEntries).toHaveLength(1);
  const [graftEntry] = graftEntries;
  expect(graftEntry).toBeDefined();
  if (graftEntry === undefined) {
    throw new Error("expected graft MCP server entry");
  }
  expect(graftEntry.name).toBe("graft");
  expectGraftServerEntry({
    command: graftEntry.command,
    args: graftEntry.args,
  });
}
