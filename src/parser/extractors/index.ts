import type { SupportedLang } from "../lang.js";
import { type LanguageExtractor } from "./common.js";
import { TypescriptExtractor } from "./typescript.js";
import { RustExtractor } from "./rust.js";
import { GraphqlExtractor } from "./graphql.js";
import { PythonExtractor } from "./python.js";
import { GoExtractor } from "./go.js";
import { JsonExtractor } from "./json.js";
import { TomlExtractor } from "./toml.js";
import { YamlExtractor } from "./yaml.js";

const typescriptExtractor = new TypescriptExtractor();

const EXTRACTORS: Record<SupportedLang, LanguageExtractor> = {
  ts: typescriptExtractor,
  tsx: typescriptExtractor,
  js: typescriptExtractor,
  rust: new RustExtractor(),
  graphql: new GraphqlExtractor(),
  python: new PythonExtractor(),
  go: new GoExtractor(),
  json: new JsonExtractor(),
  toml: new TomlExtractor(),
  yaml: new YamlExtractor(),
};

export function getExtractor(lang: SupportedLang): LanguageExtractor {
  return EXTRACTORS[lang];
}
