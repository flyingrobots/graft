import type { SupportedLang } from "../lang.js";
import { type LanguageExtractor } from "./common.js";
import { TypescriptExtractor } from "./typescript.js";
import { RustExtractor } from "./rust.js";

const typescriptExtractor = new TypescriptExtractor();

const EXTRACTORS: Record<SupportedLang, LanguageExtractor> = {
  ts: typescriptExtractor,
  tsx: typescriptExtractor,
  js: typescriptExtractor,
  rust: new RustExtractor(),
};

export function getExtractor(lang: SupportedLang): LanguageExtractor {
  return EXTRACTORS[lang];
}
