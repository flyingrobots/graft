import {
  coordSimplex,
  dagre,
  decrossTwoLayer,
  layeringLongestPath,
  sugiyama,
} from "d3-dag";

import { roadmapData } from "./generated-roadmap-data.js";

const SVG_NS = "http://www.w3.org/2000/svg";

function svgElement(name, attributes = {}) {
  const element = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, String(value));
  }
  return element;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function splitLabel(label, width = 27, lines = 2) {
  const words = label.split(/\s+/u);
  const result = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= width || current.length === 0) {
      current = candidate;
    } else {
      result.push(current);
      current = word;
    }
  }
  if (current) result.push(current);
  if (result.length <= lines) return result;
  const visible = result.slice(0, lines);
  visible[lines - 1] = `${visible[lines - 1].slice(0, Math.max(4, width - 1))}…`;
  return visible;
}

function assertAcyclic(nodes, edges) {
  const nodeIds = new Set(nodes.map((node) => node.id));
  const indegree = new Map(nodes.map((node) => [node.id, 0]));
  const outgoing = new Map(nodes.map((node) => [node.id, []]));
  for (const edge of edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      throw new Error(`edge endpoint missing: ${edge.source} -> ${edge.target}`);
    }
    indegree.set(edge.target, indegree.get(edge.target) + 1);
    outgoing.get(edge.source).push(edge.target);
  }
  const queue = [...indegree.entries()].filter(([, degree]) => degree === 0).map(([id]) => id);
  let visited = 0;
  while (queue.length > 0) {
    const id = queue.shift();
    visited += 1;
    for (const target of outgoing.get(id)) {
      const degree = indegree.get(target) - 1;
      indegree.set(target, degree);
      if (degree === 0) queue.push(target);
    }
  }
  if (visited !== nodes.length) {
    throw new Error(`Sugiyama input must be acyclic; visited ${visited} of ${nodes.length} nodes`);
  }
}

function goalpostNodes() {
  return roadmapData.managed.goalposts.map((goalpost) => ({
    ...goalpost,
    summary: goalpost.goal,
    short: `${goalpost.id} · ${goalpost.trackerStatus.toUpperCase()}`,
  }));
}

const graphDefinitions = {
  echo: {
    initialView: "campaign",
    initialSelection: { campaign: "graft-228", proof: "p-red" },
    views: {
      campaign: {
        name: "Echo campaign",
        nodes: roadmapData.echo.nodes,
        edges: roadmapData.echo.edges,
      },
      proof: {
        name: "Issue 228 proof",
        nodes: roadmapData.echo.proofNodes,
        edges: roadmapData.echo.proofEdges,
      },
    },
  },
  managed: {
    initialView: "goalposts",
    initialSelection: { goalposts: "G1", tasks: "G1.1" },
    views: {
      goalposts: {
        name: "Managed goalposts",
        nodes: goalpostNodes(),
        edges: roadmapData.managed.edges,
      },
      tasks: {
        name: "All 105 managed tasks",
        nodes: roadmapData.managed.taskNodes,
        edges: roadmapData.managed.taskEdges,
      },
    },
  },
};

class RoadmapGraph {
  constructor(root, definition) {
    this.root = root;
    this.definition = definition;
    this.svg = root.querySelector("[data-graph-svg]");
    this.inspector = root.querySelector("[data-node-inspector]");
    this.edgeList = root.querySelector("[data-edge-list]");
    this.searchInput = root.querySelector("[data-graph-search]");
    this.statusFilter = root.querySelector("[data-status-filter]");
    this.viewName = definition.initialView;
    this.selectedId = definition.initialSelection[this.viewName];
    this.nodeElements = new Map();
    this.edgeElements = [];
    this.viewBox = { x: 0, y: 0, width: 100, height: 100 };
    this.fitBox = { ...this.viewBox };
    this.dragState = null;
    this.installControls();
    this.installPanZoom();
    this.render();
  }

  get view() {
    return this.definition.views[this.viewName];
  }

  installControls() {
    for (const button of this.root.querySelectorAll("[data-view]")) {
      button.addEventListener("click", () => {
        this.viewName = button.dataset.view;
        this.selectedId = this.definition.initialSelection[this.viewName];
        for (const sibling of this.root.querySelectorAll("[data-view]")) {
          sibling.classList.toggle("is-active", sibling === button);
        }
        this.render();
      });
    }

    this.searchInput.addEventListener("input", () => this.applyHighlight());
    this.searchInput.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      const match = this.findMatchingNodes()[0];
      if (match) {
        this.selectNode(match.id, true);
      }
    });
    this.statusFilter.addEventListener("change", () => this.applyHighlight());

    for (const button of this.root.querySelectorAll("[data-zoom]")) {
      button.addEventListener("click", () => {
        const direction = button.dataset.zoom;
        if (direction === "fit") this.fit();
        if (direction === "in") this.zoom(0.78);
        if (direction === "out") this.zoom(1.28);
      });
    }
  }

  installPanZoom() {
    this.svg.addEventListener("wheel", (event) => {
      event.preventDefault();
      const factor = event.deltaY > 0 ? 1.13 : 0.88;
      this.zoom(factor, event.clientX, event.clientY);
    }, { passive: false });

    this.svg.addEventListener("pointerdown", (event) => {
      if (event.target.closest(".graph-node")) return;
      this.dragState = {
        pointerId: event.pointerId,
        clientX: event.clientX,
        clientY: event.clientY,
        viewBox: { ...this.viewBox },
      };
      this.svg.setPointerCapture(event.pointerId);
      this.svg.classList.add("is-dragging");
    });

    this.svg.addEventListener("pointermove", (event) => {
      if (!this.dragState || event.pointerId !== this.dragState.pointerId) return;
      const scaleX = this.dragState.viewBox.width / this.svg.clientWidth;
      const scaleY = this.dragState.viewBox.height / this.svg.clientHeight;
      this.viewBox.x = this.dragState.viewBox.x - (event.clientX - this.dragState.clientX) * scaleX;
      this.viewBox.y = this.dragState.viewBox.y - (event.clientY - this.dragState.clientY) * scaleY;
      this.updateViewBox();
    });

    const endDrag = (event) => {
      if (!this.dragState || event.pointerId !== this.dragState.pointerId) return;
      this.dragState = null;
      this.svg.classList.remove("is-dragging");
    };
    this.svg.addEventListener("pointerup", endDrag);
    this.svg.addEventListener("pointercancel", endDrag);
  }

  layout() {
    const { nodes, edges } = this.view;
    assertAcyclic(nodes, edges);
    const large = nodes.length > 60;
    const graph = new dagre.graphlib.Graph();
    graph.setGraph({
      rankdir: "LR",
      nodesep: large ? 14 : 30,
      ranksep: large ? 60 : 88,
      marginx: 36,
      marginy: 36,
      quality: large ? "fast" : "medium",
    });
    graph.setDefaultEdgeLabel(() => ({}));
    for (const node of nodes) {
      const width = node.kind === "task" ? 184 : node.kind === "gate" ? 192 : 218;
      const height = node.kind === "task" ? 66 : 78;
      graph.setNode(node.id, { width, height });
    }
    for (const edge of edges) graph.setEdge(edge.source, edge.target);

    const operator = sugiyama()
      .layering(layeringLongestPath())
      .decross(decrossTwoLayer())
      .coord(coordSimplex());
    dagre.layout(graph, operator);
    return graph;
  }

  render() {
    const graph = this.layout();
    const { nodes, edges } = this.view;
    const graphSize = graph.graph();
    const padding = 36;
    this.fitBox = {
      x: -padding,
      y: -padding,
      width: graphSize.width + padding * 2,
      height: graphSize.height + padding * 2,
    };
    this.svg.replaceChildren();
    this.svg.dataset.layout = "sugiyama";
    this.svg.setAttribute("aria-label", `${this.view.name}: ${nodes.length} nodes and ${edges.length} directed edges`);
    this.createDefinitions();
    const edgeLayer = svgElement("g", { class: "edge-layer" });
    const nodeLayer = svgElement("g", { class: "node-layer" });
    this.svg.append(edgeLayer, nodeLayer);
    this.nodeElements.clear();
    this.edgeElements = [];

    for (const edge of edges) {
      const route = graph.edge(edge.source, edge.target).points;
      const path = svgElement("path", {
        class: `graph-edge edge-${edge.kind}`,
        d: route.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" "),
        "marker-end": `url(#arrow-${edge.kind})`,
        "data-source": edge.source,
        "data-target": edge.target,
      });
      const title = svgElement("title");
      title.textContent = `${edge.source} → ${edge.target}: ${edge.label}`;
      path.append(title);
      edgeLayer.append(path);
      this.edgeElements.push({ edge, element: path });
    }

    for (const node of nodes) {
      const position = graph.node(node.id);
      const group = this.createNode(node, position);
      nodeLayer.append(group);
      this.nodeElements.set(node.id, group);
    }

    this.renderEdgeList();
    this.selectNode(this.selectedId, false);
    this.fit();
    this.applyHighlight();
  }

  createDefinitions() {
    const definitions = svgElement("defs");
    const markerColors = {
      native: "#59ccd0",
      roadmap: "#ef9a63",
      membership: "#697c85",
      documented: "#b989c5",
      "native-stale": "#71958a",
    };
    for (const [kind, color] of Object.entries(markerColors)) {
      const marker = svgElement("marker", {
        id: `arrow-${kind}`,
        viewBox: "0 0 10 10",
        refX: 9,
        refY: 5,
        markerWidth: 5,
        markerHeight: 5,
        orient: "auto-start-reverse",
      });
      marker.append(svgElement("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: color }));
      definitions.append(marker);
    }
    this.svg.append(definitions);
  }

  createNode(node, position) {
    const group = svgElement("g", {
      class: `graph-node node-${node.status} node-${node.kind}`,
      transform: `translate(${position.x - position.width / 2} ${position.y - position.height / 2})`,
      role: "button",
      tabindex: "0",
      "aria-label": `${node.short}: ${node.title}. Status ${node.status}.`,
      "data-node-id": node.id,
    });
    group.append(svgElement("rect", {
      width: position.width,
      height: position.height,
      rx: node.kind === "task" ? 11 : 15,
    }));

    const short = svgElement("text", { x: 13, y: 18, class: "node-short" });
    short.textContent = node.short;
    group.append(short);

    const title = svgElement("text", { x: 13, y: 37, class: "node-title" });
    for (const [index, line] of splitLabel(node.title, node.kind === "task" ? 24 : 28, 2).entries()) {
      const span = svgElement("tspan", { x: 13, dy: index === 0 ? 0 : 14 });
      span.textContent = line;
      title.append(span);
    }
    group.append(title);

    const status = svgElement("text", {
      x: position.width - 12,
      y: position.height - 10,
      class: "node-status",
      "text-anchor": "end",
    });
    status.textContent = node.status;
    group.append(status);

    group.addEventListener("click", () => this.selectNode(node.id, false));
    group.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        this.selectNode(node.id, false);
      }
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        event.preventDefault();
        this.navigateNode(node.id, event.key === "ArrowRight" ? "out" : "in");
      }
    });
    return group;
  }

  navigateNode(nodeId, direction) {
    const edge = this.view.edges.find((candidate) => (
      direction === "out" ? candidate.source === nodeId : candidate.target === nodeId
    ));
    if (!edge) return;
    const nextId = direction === "out" ? edge.target : edge.source;
    this.selectNode(nextId, true);
  }

  selectNode(nodeId, focus) {
    const node = this.view.nodes.find((candidate) => candidate.id === nodeId);
    if (!node) return;
    this.selectedId = nodeId;
    for (const [id, element] of this.nodeElements) {
      element.classList.toggle("is-selected", id === nodeId);
      element.setAttribute("aria-pressed", id === nodeId ? "true" : "false");
    }
    for (const { edge, element } of this.edgeElements) {
      element.classList.toggle("is-related", edge.source === nodeId || edge.target === nodeId);
    }
    this.renderInspector(node);
    if (focus) this.nodeElements.get(nodeId)?.focus();
  }

  renderInspector(node) {
    const inbound = this.view.edges.filter((edge) => edge.target === node.id);
    const outbound = this.view.edges.filter((edge) => edge.source === node.id);
    const nodeById = new Map(this.view.nodes.map((candidate) => [candidate.id, candidate]));
    const relationshipList = (edges, direction) => edges.length === 0
      ? "<li>None in this view.</li>"
      : edges.map((edge) => {
        const relatedId = direction === "in" ? edge.source : edge.target;
        const related = nodeById.get(relatedId);
        return `<li><strong>${escapeHtml(related?.short ?? relatedId)}</strong> — ${escapeHtml(edge.label)}</li>`;
      }).join("");
    const milestone = typeof node.milestone === "string"
      ? node.milestone
      : node.milestone?.number
        ? `GitHub milestone ${node.milestone.number}`
        : null;
    const issue = node.issueNumber ? `#${node.issueNumber}` : null;
    const taskCount = Array.isArray(node.tasks) ? `${node.tasks.length} task issues` : null;
    const metadata = [milestone, issue, taskCount, node.release].filter(Boolean);
    const sourceLink = node.url
      ? `<p><a href="${escapeHtml(node.url)}" target="_blank" rel="noreferrer">Open source evidence ↗</a></p>`
      : "";
    this.inspector.innerHTML = `
      <p class="mini-label">${escapeHtml(node.short)}</p>
      <h4>${escapeHtml(node.title)}</h4>
      <div class="node-badges">
        <span class="node-badge status-${escapeHtml(node.status)}">${escapeHtml(node.status)}</span>
        <span class="node-badge">${escapeHtml(node.kind)}</span>
      </div>
      <p>${escapeHtml(node.summary ?? node.goal ?? "No summary in this snapshot.")}</p>
      ${metadata.length > 0 ? `<dl>${metadata.map((item) => `<div><dt>Context</dt><dd>${escapeHtml(item)}</dd></div>`).join("")}</dl>` : ""}
      <h5>Blocked by / enters from</h5>
      <ul>${relationshipList(inbound, "in")}</ul>
      <h5>Blocks / contributes to</h5>
      <ul>${relationshipList(outbound, "out")}</ul>
      ${sourceLink}
    `;
  }

  renderEdgeList() {
    const nodeById = new Map(this.view.nodes.map((node) => [node.id, node]));
    this.edgeList.innerHTML = `<ol>${this.view.edges.map((edge) => {
      const source = nodeById.get(edge.source);
      const target = nodeById.get(edge.target);
      return `<li><strong>${escapeHtml(source?.short ?? edge.source)}</strong> → <strong>${escapeHtml(target?.short ?? edge.target)}</strong> <span class="edge-kind">${escapeHtml(edge.kind)} · ${escapeHtml(edge.label)}</span></li>`;
    }).join("")}</ol>`;
  }

  findMatchingNodes() {
    const query = this.searchInput.value.trim().toLocaleLowerCase();
    if (!query) return [];
    return this.view.nodes.filter((node) => [node.id, node.short, node.title, node.summary, node.goal]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase()
      .includes(query));
  }

  applyHighlight() {
    const query = this.searchInput.value.trim().toLocaleLowerCase();
    const status = this.statusFilter.value;
    const visibleIds = new Set();
    for (const node of this.view.nodes) {
      const haystack = [node.id, node.short, node.title, node.summary, node.goal]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase();
      const queryMatch = !query || haystack.includes(query);
      const statusMatch = status === "all" || node.status === status;
      const visible = queryMatch && statusMatch;
      if (visible) visibleIds.add(node.id);
      const element = this.nodeElements.get(node.id);
      element?.classList.toggle("is-muted", !visible);
      element?.classList.toggle("is-match", Boolean(query) && queryMatch);
    }
    for (const { edge, element } of this.edgeElements) {
      element.classList.toggle("is-muted", !visibleIds.has(edge.source) || !visibleIds.has(edge.target));
    }
  }

  fit() {
    this.viewBox = { ...this.fitBox };
    this.updateViewBox();
  }

  zoom(factor, clientX, clientY) {
    const rect = this.svg.getBoundingClientRect();
    const anchorX = clientX === undefined
      ? this.viewBox.x + this.viewBox.width / 2
      : this.viewBox.x + ((clientX - rect.left) / rect.width) * this.viewBox.width;
    const anchorY = clientY === undefined
      ? this.viewBox.y + this.viewBox.height / 2
      : this.viewBox.y + ((clientY - rect.top) / rect.height) * this.viewBox.height;
    const width = Math.min(this.fitBox.width * 2.5, Math.max(this.fitBox.width * 0.08, this.viewBox.width * factor));
    const height = width * (this.viewBox.height / this.viewBox.width);
    const xRatio = (anchorX - this.viewBox.x) / this.viewBox.width;
    const yRatio = (anchorY - this.viewBox.y) / this.viewBox.height;
    this.viewBox = {
      x: anchorX - width * xRatio,
      y: anchorY - height * yRatio,
      width,
      height,
    };
    this.updateViewBox();
  }

  updateViewBox() {
    this.svg.setAttribute("viewBox", `${this.viewBox.x} ${this.viewBox.y} ${this.viewBox.width} ${this.viewBox.height}`);
  }
}

for (const [name, definition] of Object.entries(graphDefinitions)) {
  const root = document.querySelector(`[data-graph="${name}"]`);
  if (root) new RoadmapGraph(root, definition);
}

document.documentElement.dataset.roadmapSnapshot = roadmapData.snapshotAt;
