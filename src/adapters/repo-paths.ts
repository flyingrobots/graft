import * as fs from "node:fs";
import * as path from "node:path";

function pathEscapesRoot(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative);
}

function realPathOrSelf(target: string): string {
  try {
    return fs.realpathSync.native(target);
  } catch {
    return target;
  }
}

export function createRepoPathResolver(projectRoot: string): (input: string) => string {
  const normalizedRoot = path.resolve(projectRoot);
  const realProjectRoot = realPathOrSelf(normalizedRoot);

  return (input: string): string => {
    const resolved = path.isAbsolute(input)
      ? path.resolve(input)
      : path.resolve(normalizedRoot, input);

    if (pathEscapesRoot(normalizedRoot, resolved)) {
      throw new Error(`Path traversal blocked: ${input}`);
    }

    const realResolved = realPathOrSelf(resolved);
    if (pathEscapesRoot(realProjectRoot, realResolved)) {
      throw new Error(`Path traversal blocked: ${input}`);
    }

    return resolved;
  };
}

export function toRepoPolicyPath(projectRoot: string, filePath: string): string {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(projectRoot, filePath);
  const relativePath = path.relative(projectRoot, absolutePath);
  if (relativePath.length === 0 || relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    return absolutePath;
  }
  return relativePath.split(path.sep).join("/");
}
