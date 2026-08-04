import type { ThreeSurfaceCapabilityBaseline } from "../../src/contracts/capabilities.js";

export function parseDocumentedCapabilityBaseline(
  content: string,
): ThreeSurfaceCapabilityBaseline {
  const heading = /^##\s+Current baseline\s*$/imu.exec(content);
  if (heading === null) throw new Error("Capability matrix is missing its Current baseline section");
  const afterHeading = content.slice(heading.index + heading[0].length);
  const nextSection = /^##\s+/mu.exec(afterHeading);
  const baselineSection = nextSection === null ? afterHeading : afterHeading.slice(0, nextSection.index);
  const lines = baselineSection.split("\n").map((line) => line.replace(/[`*_]/gu, "").trim());

  const countFor = (label: RegExp): number => {
    const counts = lines.flatMap((line) => {
      if (!label.test(line)) return [];
      const count = /\b(\d+)\b/u.exec(line)?.[1];
      return count === undefined ? [] : [Number(count)];
    });
    if (counts.length !== 1) {
      throw new Error(`Capability baseline label ${String(label)} must have exactly one numeric count`);
    }
    return counts[0] ?? 0;
  };

  return {
    cliOnly: countFor(/CLI\s*-\s*only capabilit(?:y|ies)/iu),
    apiCliMcp: countFor(/API\s*\+\s*CLI\s*\+\s*MCP capabilit(?:y|ies)/iu),
    apiMcp: countFor(/API\s*\+\s*MCP capabilit(?:y|ies)/iu),
    apiOnly: countFor(/API\s*-\s*only capabilit(?:y|ies)/iu),
    directCliMcpPeers: countFor(/direct CLI\s*\/\s*MCP peer capabilit(?:y|ies)/iu),
    composedCliOperators: countFor(/composed CLI operator\s*\/\s*lifecycle capabilit(?:y|ies)/iu),
    intentionallyApiMcpOnly: countFor(/intentionally API\s*\+\s*MCP\s*-\s*only agent\s*\/\s*control-plane capabilit(?:y|ies)/iu),
  };
}
