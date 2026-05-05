import type { SupportedLang } from "../lang.js";
import { type LanguageExtractor } from "./common.js";
import { TypescriptExtractor } from "./typescript.js";
import { RustExtractor } from "./rust.js";
import { GraphqlExtractor } from "./graphql.js";
import { PythonExtractor } from "./python.js";

const typescriptExtractor = new TypescriptExtractor();

const EXTRACTORS: Record<SupportedLang, LanguageExtractor> = {
  ts: typescriptExtractor,
  tsx: typescriptExtractor,
  js: typescriptExtractor,
  rust: new RustExtractor(),
  graphql: new GraphqlExtractor(),
  python: new PythonExtractor(),
};

export function getExtractor(lang: SupportedLang): LanguageExtractor {
  return EXTRACTORS[lang];
}
