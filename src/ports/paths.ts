// ---------------------------------------------------------------------------
// PathOps port — hexagonal boundary for path operations
// ---------------------------------------------------------------------------

/**
 * Portable path operations. Core logic imports this port, not node:path.
 * Node adapter implements it; tests can substitute a mock.
 *
 * All methods accept and return forward-slash paths. Normalization
 * (collapsing `//`, resolving `..`, stripping trailing slashes) happens
 * inside the adapter so callers never see raw platform paths.
 */
export interface PathOps {
  /** Normalize a path: collapse `//`, resolve `..`, strip trailing `/`. */
  normalize(p: string): string;

  /** True when `filePath` is exactly `directory` or nested inside it. */
  isWithin(filePath: string, directory: string): boolean;

  /** Join path segments with forward slashes, normalized. */
  join(...segments: string[]): string;
}
