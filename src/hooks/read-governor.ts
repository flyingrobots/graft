import * as fs from "node:fs";
import * as path from "node:path";
import type { SupportedLang } from "../parser/lang.js";
import { detectLang } from "../parser/lang.js";
import { evaluatePolicy } from "../policy/evaluate.js";
import type { PolicyResult } from "../policy/types.js";
import { loadGraftignore } from "../policy/graftignore.js";
import { HookInput, safeRelativePath } from "./shared.js";

export class HookReadInspection {
  readonly absolutePath: string;
  readonly relativePath: string;
  readonly rawContent: string;
  readonly lines: number;
  readonly bytes: number;
  readonly lang: SupportedLang | null;
  readonly policy: PolicyResult;

  constructor(opts: {
    absolutePath: string;
    relativePath: string;
    rawContent: string;
    lines: number;
    bytes: number;
    lang: SupportedLang | null;
    policy: PolicyResult;
  }) {
    if (opts.absolutePath.length === 0) {
      throw new Error("HookReadInspection: absolutePath must be non-empty");
    }
    if (opts.relativePath.length === 0) {
      throw new Error("HookReadInspection: relativePath must be non-empty");
    }
    if (opts.lines < 0) {
      throw new Error("HookReadInspection: lines must be non-negative");
    }
    if (opts.bytes < 0) {
      throw new Error("HookReadInspection: bytes must be non-negative");
    }

    this.absolutePath = opts.absolutePath;
    this.relativePath = opts.relativePath;
    this.rawContent = opts.rawContent;
    this.lines = opts.lines;
    this.bytes = opts.bytes;
    this.lang = opts.lang;
    this.policy = opts.policy;
    Object.freeze(this);
  }

  isGovernedCodeRead(): boolean {
    return this.lang !== null && this.policy.projection === "outline";
  }
}

function loadGraftignorePatterns(cwd: string): string[] | undefined {
  try {
    const ignoreFile = fs.readFileSync(path.join(cwd, ".graftignore"), "utf-8");
    return loadGraftignore(ignoreFile);
  } catch {
    return undefined;
  }
}

export function inspectHookRead(input: HookInput): HookReadInspection | null {
  const absolutePath = input.tool_input.file_path;
  const relativePath = safeRelativePath(input.cwd, absolutePath);
  if (relativePath === null) {
    return null;
  }

  let rawContent: string;
  try {
    rawContent = fs.readFileSync(absolutePath, "utf-8");
  } catch {
    return null;
  }

  const lines = rawContent.split("\n").length;
  const bytes = Buffer.byteLength(rawContent, "utf-8");
  const policy = evaluatePolicy(
    { path: relativePath, lines, bytes },
    { graftignorePatterns: loadGraftignorePatterns(input.cwd) },
  );

  return new HookReadInspection({
    absolutePath,
    relativePath,
    rawContent,
    lines,
    bytes,
    lang: detectLang(absolutePath),
    policy,
  });
}
