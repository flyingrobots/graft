export const SUPPORTED_LANGS = ["ts", "tsx", "js"] as const;
export type SupportedLang = typeof SUPPORTED_LANGS[number];

export const SUPPORTED_STRUCTURED_FORMATS = [
  ...SUPPORTED_LANGS,
  "md",
] as const;
export type SupportedStructuredFormat = typeof SUPPORTED_STRUCTURED_FORMATS[number];

const LANGUAGE_SUFFIXES: Readonly<Record<SupportedLang, readonly string[]>> = {
  ts: [".ts", ".mts", ".cts"],
  tsx: [".tsx", ".jsx"],
  js: [".js", ".mjs", ".cjs"],
};

const STRUCTURED_FORMAT_SUFFIXES: Readonly<Record<SupportedStructuredFormat, readonly string[]>> = {
  ...LANGUAGE_SUFFIXES,
  md: [".md"],
};

function normalizedSuffix(filePath: string): string {
  const normalized = filePath.trim().toLowerCase();
  const lastSeparator = Math.max(
    normalized.lastIndexOf("/"),
    normalized.lastIndexOf("\\"),
  );
  const basename = lastSeparator >= 0 ? normalized.slice(lastSeparator + 1) : normalized;
  const lastDot = basename.lastIndexOf(".");
  return lastDot >= 0 ? basename.slice(lastDot) : "";
}

function detectBySuffix<TFormat extends string>(
  filePath: string,
  suffixes: Readonly<Record<TFormat, readonly string[]>>,
): TFormat | null {
  const suffix = normalizedSuffix(filePath);
  for (const [format, supportedSuffixes] of Object.entries(suffixes) as [TFormat, readonly string[]][]) {
    if (supportedSuffixes.includes(suffix)) {
      return format;
    }
  }
  return null;
}

export function isSupportedLang(value: string): value is SupportedLang {
  return (SUPPORTED_LANGS as readonly string[]).includes(value);
}

export function isSupportedStructuredFormat(
  value: string,
): value is SupportedStructuredFormat {
  return (SUPPORTED_STRUCTURED_FORMATS as readonly string[]).includes(value);
}

/**
 * Detect the tree-sitter language from a file suffix.
 * Returns null for unsupported file types.
 */
export function detectLang(filePath: string): SupportedLang | null {
  return detectBySuffix(filePath, LANGUAGE_SUFFIXES);
}

/**
 * Detect the supported structured format for bounded read surfaces.
 * Returns null for file types that still have no explicit extractor.
 */
export function detectStructuredFormat(
  filePath: string,
): SupportedStructuredFormat | null {
  return detectBySuffix(filePath, STRUCTURED_FORMAT_SUFFIXES);
}
