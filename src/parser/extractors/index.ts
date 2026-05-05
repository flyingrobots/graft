import type { SupportedLang } from "../lang.js";
import { type LanguageExtractor } from "./common.js";
import { TypescriptExtractor } from "./typescript.js";
import { RustExtractor } from "./rust.js";
import { GraphqlExtractor } from "./graphql.js";

const typescriptExtractor = new TypescriptExtractor();

const EXTRACTORS: Record<SupportedLang, LanguageExtractor> = {
  ts: typescriptExtractor,
  tsx: typescriptExtractor,
  js: typescriptExtractor,
  rust: new RustExtractor(),
  graphql: new GraphqlExtractor(),
};

export function getExtractor(lang: SupportedLang): LanguageExtractor {
  return EXTRACTORS[lang];
}
