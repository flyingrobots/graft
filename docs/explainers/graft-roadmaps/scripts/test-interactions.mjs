import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { Window } from "happy-dom";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const siteRoot = resolve(scriptDir, "..");
const standalonePath = resolve(siteRoot, "Graft Two Roadmaps.html");
const window = new Window({ url: pathToFileURL(standalonePath).href });
const standalone = await readFile(standalonePath, "utf8");
const bundleOpen = '<script data-standalone-bundle>';
const bundleStart = standalone.indexOf(bundleOpen);
const bundleEnd = standalone.indexOf("</script>", bundleStart);
if (bundleStart < 0 || bundleEnd < 0) throw new Error("offline artifact must contain its bundled JavaScript");
const beforeBundle = standalone.slice(0, bundleStart);
const standaloneBundle = standalone.slice(bundleStart + bundleOpen.length, bundleEnd);
const afterBundle = standalone.slice(bundleEnd + "</script>".length);

window.document.open();
window.document.write(beforeBundle);
window.eval(standaloneBundle);
window.document.write(afterBundle);
window.document.close();

Object.assign(globalThis, {
  window,
  document: window.document,
  Element: window.Element,
  HTMLElement: window.HTMLElement,
  SVGElement: window.SVGElement,
  Event: window.Event,
  KeyboardEvent: window.KeyboardEvent,
  PointerEvent: window.PointerEvent,
  WheelEvent: window.WheelEvent,
});

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

const echo = document.querySelector('[data-graph="echo"]');
const managed = document.querySelector('[data-graph="managed"]');
invariant(window.location.protocol === "file:", "offline artifact test must execute in a file URL context");
invariant(
  window.getComputedStyle(document.querySelector(".site-header")).display === "grid",
  "inlined stylesheet must apply the designed header layout",
);
invariant(echo && managed, "both graph workbenches must initialize");
invariant(echo.querySelectorAll(".graph-node").length === 12, "Echo campaign must render 12 context and task nodes");
invariant(managed.querySelectorAll(".graph-node").length === 13, "managed goalpost view must render 13 nodes");
invariant(echo.querySelector("[data-graph-svg]").dataset.layout === "sugiyama", "Echo SVG must identify Sugiyama layout");
invariant(managed.querySelector("[data-graph-svg]").dataset.layout === "sugiyama", "managed SVG must identify Sugiyama layout");

const proofButton = echo.querySelector('[data-view="proof"]');
proofButton.click();
invariant(echo.querySelectorAll(".graph-node").length === 10, "expanded #228 proof must render ten causal tasks");
invariant(echo.querySelector('[data-node-id="p-red"]').classList.contains("is-selected"), "RED proof must be selected as the active next task");
invariant(echo.querySelector("[data-node-inspector]").textContent.includes("Substrate audit and failing proof"), "inspector must explain the RED task");

const echoSearch = echo.querySelector("[data-graph-search]");
echoSearch.value = "replay";
echoSearch.dispatchEvent(new window.Event("input", { bubbles: true }));
invariant(echo.querySelectorAll(".graph-node.is-match").length > 0, "search must highlight matching nodes");
echoSearch.value = "";
echoSearch.dispatchEvent(new window.Event("input", { bubbles: true }));

const echoStatus = echo.querySelector("[data-status-filter]");
echoStatus.value = "active";
echoStatus.dispatchEvent(new window.Event("change", { bubbles: true }));
invariant(echo.querySelectorAll(".graph-node.is-muted").length === 9, "status filter must visually isolate the one active proof task");
echoStatus.value = "all";
echoStatus.dispatchEvent(new window.Event("change", { bubbles: true }));

const initialViewBox = echo.querySelector("[data-graph-svg]").getAttribute("viewBox");
echo.querySelector('[data-zoom="in"]').click();
const zoomedViewBox = echo.querySelector("[data-graph-svg]").getAttribute("viewBox");
invariant(initialViewBox !== zoomedViewBox, "zoom control must change the SVG viewBox");
echo.querySelector('[data-zoom="fit"]').click();
invariant(echo.querySelector("[data-graph-svg]").getAttribute("viewBox") === initialViewBox, "fit control must restore the complete graph");

managed.querySelector('[data-view="tasks"]').click();
invariant(managed.querySelectorAll(".graph-node").length === 131, "task view must render 105 issues plus 26 goalpost gates");
const g1Task = managed.querySelector('[data-node-id="G1.1"]');
g1Task.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
invariant(managed.querySelector("[data-node-inspector]").textContent.includes("Secure Graft-home bootstrap"), "task selection must update the inspector");
g1Task.dispatchEvent(new window.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
invariant(managed.querySelector('[data-node-id="G1-exit"]').classList.contains("is-selected"), "keyboard navigation must follow an outgoing dependency");

const managedSearch = managed.querySelector("[data-graph-search]");
managedSearch.value = "PDF";
managedSearch.dispatchEvent(new window.Event("input", { bubbles: true }));
invariant(managed.querySelectorAll(".graph-node.is-match").length >= 1, "managed task search must find PDF work");
invariant(managed.querySelector("[data-edge-list] ol li"), "textual dependency fallback must remain populated");

await window.happyDOM.abort();
console.log("Offline roadmap interaction checks passed: inlined bundle, view switches, 131-node expansion, selection, search, filters, zoom, and keyboard traversal.");
