// ---------------------------------------------------------------------------
// Node PathOps adapter — implements PathOps using node:path
// ---------------------------------------------------------------------------

import * as path from "node:path";
import type { PathOps } from "../ports/paths.js";

function toForwardSlash(p: string): string {
  return p.replaceAll("\\", "/");
}

function stripTrailingSlash(p: string): string {
  if (p === "/") return p;
  return p.endsWith("/") ? p.slice(0, -1) : p;
}

function normalizeImpl(p: string): string {
  return stripTrailingSlash(toForwardSlash(path.normalize(p)));
}

export const nodePathOps: PathOps = {
  normalize(p: string): string {
    return normalizeImpl(p);
  },

  isWithin(filePath: string, directory: string): boolean {
    const normFile = normalizeImpl(filePath);
    const normDir = normalizeImpl(directory);
    return normFile === normDir || normFile.startsWith(`${normDir}/`);
  },

  join(...segments: string[]): string {
    return normalizeImpl(path.join(...segments));
  },
};
