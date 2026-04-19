# AUDIT: DOCUMENTATION QUALITY (2026-04-11)

## 1. ACCURACY & EFFECTIVENESS ASSESSMENT

- **1.1. Core Mismatch:**
    - **Answer:** The root `README.md` is generally accurate but verbose. The most significant mismatch is in the `Quick start` section, which shows `npx @flyingrobots/graft init` but doesn't explicitly mention that for non-stdio clients (like Cursor or Windsurf), a separate `workspace_bind` tool call is required by the agent.

- **1.2. Audience & Goal Alignment:**
    - **Answer:**
        - **Target Audience:** Coding agents (primary) and human operators (secondary).
        - **Top 3 Questions addressed?**
            1. **"What tools exist?"**: Yes (Tools table in README).
            2. **"How do I install?"**: Yes (Install section).
            3. **"How do I recover context?"**: Yes (`AGENTS.md`).

- **1.3. Time-to-Value (TTV) Barrier:**
    - **Answer:** Understanding the transition from "repo-local stdio" to the "same-user daemon." The README mentions the daemon, but the path to enabling it for a standard project is buried in the decision table.

## 2. REQUIRED UPDATES & COMPLETENESS CHECK

- **2.1. README.md Priority Fixes:**
    1. **Structural Essence**: Distill the root README by moving the large ASCII art and verbose history to the changelog.
    2. **Daemon-First Positioning**: Elevate the daemon mode as the industrial-grade path for multi-repo work.
    3. **Schema Confidence**: Highlight that every response is versioned and machine-readable.

- **2.2. Missing Standard Documentation:**
    1. **`docs/strategy/security-model.md`**: Essential for a tool that governs file access and runs a local daemon.
    2. **`docs/design-system/README.md`**: While it's an agent tool, the CLI and MCP outputs should follow a consistent "Information Architecture."

- **2.3. Supplementary Documentation (Docs):**
    - **Answer:** **Causal Collapse & Strands**. The "Warp" section in `ARCHITECTURE.md` refers to future features that are currently landing. A dedicated doc explaining the ontology would bridge the gap between "Commit history" and "Speculative work."

## 3. FINAL ACTION PLAN

- **3.1. Recommendation Type:** **B. Recommend a complete re-write of the README and documentation.** (Align with the 'world-class essence' established in the sister repos).

- **3.2. Deliverable (Prompt Generation):** `Rewrite README.md to lead with the 'Industrial-Grade Context Governor' value proposition. Consolidate architecture into a root-level manifest. Strike the verbose histories and move them to docs/archive/ or CHANGELOG.md.`

- **3.3. Mitigation Prompt:** `Overhaul the Graft documentation by: 1) Distilling the root README into a high-signal entry point. 2) Unifying ARCHITECTURE.md at the root. 3) Creating a root-level GUIDE.md for orientation. 4) Ensuring AGENTS.md remains the authoritative context recovery protocol.`
