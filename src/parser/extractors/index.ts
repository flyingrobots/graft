import type { SupportedLang } from "../lang.js";
import { type LanguageExtractor } from "./common.js";
import { TypescriptExtractor } from "./typescript.js";
import { RustExtractor } from "./rust.js";

const EXTRACTORS: Record<SupportedLang, LanguageExtractor> = {
  ts: new TypescriptExtractor(),
  tsx: new TypescriptExtractor(),
  js: new TypescriptExtractor(),
  rust: new RustExtractor(),
};

export function getExtractor(lang: SupportedLang): LanguageExtractor {
  return EXTRACTORS[lang];
}
