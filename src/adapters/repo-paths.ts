import * as path from "node:path";

export function createRepoPathResolver(projectRoot: string): (input: string) => string {
  return (input: string): string => {
    if (path.isAbsolute(input)) return input;
    const resolved = path.resolve(projectRoot, input);
    const relative = path.relative(projectRoot, resolved);
    if (relative.startsWith("..")) {
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
