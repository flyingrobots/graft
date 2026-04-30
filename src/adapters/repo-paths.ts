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

function nearestExistingAncestor(target: string): string {
  let current = target;
  while (current.length > 0) {
    try {
      fs.lstatSync(current);
      return current;
    } catch {
      const parent = path.dirname(current);
      if (parent === current) {
        return current;
      }
      current = parent;
    }
  }
  return target;
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

    const realAncestor = realPathOrSelf(nearestExistingAncestor(resolved));
    if (pathEscapesRoot(realProjectRoot, realAncestor)) {
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
