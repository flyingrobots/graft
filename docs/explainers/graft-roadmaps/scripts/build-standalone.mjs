import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const siteRoot = resolve(scriptDir, "..");
const distRoot = resolve(siteRoot, "dist");
const outputPath = resolve(siteRoot, "Graft Two Roadmaps.html");

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

const builtHtml = await readFile(resolve(distRoot, "index.html"), "utf8");
const scriptTag = builtHtml.match(/<script\b[^>]*\bsrc="(\.\/assets\/[^"]+\.js)"[^>]*><\/script>/u);
const styleTag = builtHtml.match(/<link\b[^>]*\bhref="(\.\/assets\/[^"]+\.css)"[^>]*>/u);
invariant(scriptTag, "production HTML must contain one bundled JavaScript asset");
invariant(styleTag, "production HTML must contain one bundled stylesheet asset");

const [javascript, stylesheet, diagram] = await Promise.all([
  readFile(resolve(distRoot, scriptTag[1]), "utf8"),
  readFile(resolve(distRoot, styleTag[1]), "utf8"),
  readFile(resolve(distRoot, "diagrams/file-outline-retained-replay.svg")),
]);

const safeJavaScript = javascript.replaceAll("</script", "<\\\\/script");
const safeStylesheet = stylesheet.replaceAll("</style", "<\\\\/style");
const diagramDataUrl = `data:image/svg+xml;base64,${diagram.toString("base64")}`;

const standalone = builtHtml
  .replace(scriptTag[0], () => `<script data-standalone-bundle>${safeJavaScript}</script>`)
  .replace(styleTag[0], () => `<style data-standalone-styles>${safeStylesheet}</style>`)
  .replace("./diagrams/file-outline-retained-replay.svg", diagramDataUrl)
  .replace(/\s*<meta property="og:image"[^>]*>/u, "")
  .replace(/\s*<meta name="twitter:image"[^>]*>/u, "")
  .replace("<title>", '<meta name="offline-artifact" content="self-contained" />\n    <title>');

await writeFile(outputPath, standalone);
console.log(`Generated offline artifact: ${outputPath}`);
