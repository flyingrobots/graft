import { access, readFile, readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { roadmapData } from "../src/generated-roadmap-data.js";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const siteRoot = resolve(scriptDir, "..");

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function assertAcyclic(name, nodes, edges) {
  const ids = new Set(nodes.map((node) => node.id));
  const indegree = new Map(nodes.map((node) => [node.id, 0]));
  const outgoing = new Map(nodes.map((node) => [node.id, []]));
  for (const edge of edges) {
    invariant(ids.has(edge.source), `${name}: missing source ${edge.source}`);
    invariant(ids.has(edge.target), `${name}: missing target ${edge.target}`);
    indegree.set(edge.target, indegree.get(edge.target) + 1);
    outgoing.get(edge.source).push(edge.target);
  }
  const queue = [...indegree].filter(([, degree]) => degree === 0).map(([id]) => id);
  let visited = 0;
  while (queue.length > 0) {
    const id = queue.shift();
    visited += 1;
    for (const target of outgoing.get(id)) {
      const next = indegree.get(target) - 1;
      indegree.set(target, next);
      if (next === 0) queue.push(target);
    }
  }
  invariant(visited === nodes.length, `${name}: cycle detected (${visited}/${nodes.length} visited)`);
}

invariant(roadmapData.snapshotAt === "2026-08-15", "snapshot date drifted");
invariant(roadmapData.managed.goalposts.length === 13, "expected 13 managed goalposts");
invariant(roadmapData.managed.tasks.length === 105, "expected 105 managed task issues");
invariant(roadmapData.managed.tasks.filter((task) => task.status === "complete").length === 6, "expected six closed managed tasks");
invariant(roadmapData.managed.tasks.filter((task) => task.status === "planned").length === 99, "expected 99 open managed tasks");

const issueNumbers = roadmapData.managed.tasks.map((task) => task.issueNumber);
invariant(issueNumbers[0] === 97 && issueNumbers.at(-1) === 201, "managed issue range must be #97-#201");
invariant(new Set(issueNumbers).size === 105, "managed issue numbers must be unique");
invariant(issueNumbers.every((number, index) => number === 97 + index), "managed issue numbers must be contiguous");

const g0 = roadmapData.managed.goalposts.find((goalpost) => goalpost.id === "G0");
const g1 = roadmapData.managed.goalposts.find((goalpost) => goalpost.id === "G1");
invariant(g0?.status === "complete" && g0.milestone.state === "open", "G0 drift must remain explicit");
invariant(g1?.status === "active" && g1.tasks.length === 8, "G1 must remain the active managed frontier");

assertAcyclic("managed goalposts", roadmapData.managed.goalposts, roadmapData.managed.edges);
assertAcyclic("managed tasks", roadmapData.managed.taskNodes, roadmapData.managed.taskEdges);
assertAcyclic("Echo campaign", roadmapData.echo.nodes, roadmapData.echo.edges);
assertAcyclic("issue 228 proof", roadmapData.echo.proofNodes, roadmapData.echo.proofEdges);

const current = roadmapData.echo.nodes.find((node) => node.id === "graft-228");
const next = roadmapData.echo.proofNodes.find((node) => node.id === "p-red");
invariant(current?.status === "active", "#228 must be the active campaign issue");
invariant(current.summary.includes("implementation has not started"), "#228 must not be described as implemented");
invariant(next?.status === "active", "the #228 RED proof must be the next active task");

const expectedNativeEdges = [
  "graft-228->graft-229",
  "graft-228->graft-232",
  "graft-229->graft-230",
  "graft-229->graft-232",
  "graft-229->graft-236",
  "graft-229->graft-237",
  "graft-230->graft-231",
  "graft-232->hello-12",
  "graft-236->graft-232",
  "graft-237->graft-232",
].sort();
const actualNativeEdges = roadmapData.echo.edges
  .filter((edge) => edge.kind === "native")
  .map((edge) => `${edge.source}->${edge.target}`)
  .sort();
invariant(JSON.stringify(actualNativeEdges) === JSON.stringify(expectedNativeEdges), "Echo native blocker snapshot changed");

for (const node of [...roadmapData.managed.goalposts, ...roadmapData.managed.tasks, ...roadmapData.echo.nodes]) {
  if (!node.url) continue;
  const parsed = new URL(node.url);
  invariant(parsed.protocol === "https:", `${node.id}: evidence link must use https`);
}

const [html, mainSource, readme, mermaidSource] = await Promise.all([
  readFile(resolve(siteRoot, "index.html"), "utf8"),
  readFile(resolve(siteRoot, "src/main.js"), "utf8"),
  readFile(resolve(siteRoot, "README.md"), "utf8"),
  readFile(resolve(siteRoot, "diagrams/file-outline-retained-replay.mmd"), "utf8"),
]);
for (const id of ["example", "cast", "roadmaps", "dags", "gaps", "audit", "mature", "sources"]) {
  invariant(html.includes(`id="${id}"`), `missing explainer section #${id}`);
}
invariant(html.indexOf("sequence-figure") < html.indexOf("figure-caption"), "figure caption must follow the diagram");
invariant(html.indexOf("figure-caption") < html.indexOf("Figure 1 in words"), "explanatory table must follow the caption");
invariant(mainSource.includes("sugiyama()"), "graph must invoke the Sugiyama layout operator");
invariant(mainSource.includes("layeringLongestPath()"), "graph must name its layering stage");
invariant(mainSource.includes("decrossTwoLayer()"), "graph must name its crossing-reduction stage");
invariant(mainSource.includes("coordSimplex()"), "graph must name its coordinate-assignment stage");
const readmeMermaid = readme.match(/```mermaid\n([\s\S]*?)\n```/)?.[1];
invariant(readmeMermaid === mermaidSource.trim(), "validated Mermaid source must match the companion explainer block");

const diagramPath = resolve(siteRoot, "public/diagrams/file-outline-retained-replay.svg");
await access(diagramPath);
const diagram = await readFile(diagramPath, "utf8");
invariant(diagram.includes("<svg"), "validated Mermaid output must be an SVG");

const distIndexPath = resolve(siteRoot, "dist/index.html");
await access(distIndexPath);
const distIndex = await readFile(distIndexPath, "utf8");
invariant(!distIndex.includes('src="/assets/'), "built scripts must use relative asset URLs");
invariant(!distIndex.includes('href="/assets/'), "built styles must use relative asset URLs");
const distAssets = await readdir(resolve(siteRoot, "dist/assets"));
invariant(distAssets.some((file) => file.endsWith(".js")), "static build must emit JavaScript");
invariant(distAssets.some((file) => file.endsWith(".css")), "static build must emit CSS");

const workerUrl = new URL(`../dist/server/index.js?check=${Date.now()}`, import.meta.url);
const { default: worker } = await import(workerUrl);
const seenAssetPaths = [];
const env = {
  ASSETS: {
    fetch(request) {
      const pathname = new URL(request.url).pathname;
      seenAssetPaths.push(pathname);
      return pathname === "/index.html"
        ? new Response("<!doctype html><title>Graft roadmaps</title>", { headers: { "content-type": "text/html" } })
        : new Response("Not found", { status: 404 });
    },
  },
};
const routeResponse = await worker.fetch(new Request("https://roadmap.test/roadmaps/echo"), env);
invariant(routeResponse.status === 200, "worker must serve the static shell for navigation routes");
invariant(seenAssetPaths.join(",") === "/roadmaps/echo,/index.html", "worker must fall back to index.html exactly once");
const missingAsset = await worker.fetch(new Request("https://roadmap.test/missing.png"), env);
invariant(missingAsset.status === 404, "worker must not rewrite missing assets to HTML");

console.log("Roadmap explainer checks passed: 2 DAG families, 105 managed tasks, 6 closed tasks, 0 cycles, static worker fallback verified.");
