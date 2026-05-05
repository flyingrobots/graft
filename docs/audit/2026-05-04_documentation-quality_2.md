---
report_id: "AUD-2026-05-04-D-V02"
title: "Quarterly Documentation Quality Audit: Graft Governor"
status: "Final"
audit:
  date_started: 2026-05-04
  date_completed: 2026-05-04
  type: "Full"
  scope: "README.md, docs/**/*, AGENTS.md, METHOD.md"
  compliance_frameworks: ["Technical Writing Best Practices"]
target:
  repository: "github.com/flyingrobots/graft"
  branch: "main"
  commit_hash: "HEAD"
  language_stack: ["Markdown"]
  environment: "Documentation"
methodology:
  automated_tools: ["None"]
  manual_review_hours: 3
  false_positive_rate: "0%"
summary:
  total_findings: 6
  severity_count:
    critical: 0
    high: 0
    medium: 3
    low: 3
  remediation_status: "Pending"
related_reports:
  previous_audit: "AUD-2026-05-04-D-V01"
---

<!-- markdownlint-disable -->

# 1. ACCURACY & EFFECTIVENESS ASSESSMENT

- **1.1. Core Mismatch:** `README.md` Section 4 ("Direct Library API") shows `import { createProjectionBundle } from "@flyingrobots/graft"`, but the actual export in `src/api/index.ts` is named `createProjectionBundle` and it is an async-ready wrapper over `StructuredBuffer`. The example shows it being called synchronously and then logging `bundle.parseStatus.status`, which is correct, but the surrounding boilerplate for disposing the buffer is missing in the example code while being present in the source `createProjectionBundle` implementation.
    
- **1.2. Audience & Goal Alignment:** The primary target audience is AI Agent Developers. The documentation addresses:
    1. **How to start?** (Quick Start is excellent).
    2. **How to configure?** (`SETUP.md` is very detailed).
    3. **How does it work?** (`ARCHITECTURE.md` is high-level but deep).
    
- **1.3. Time-to-Value (TTV) Barrier:** The biggest barrier is the "Daemon Bootstrap" flow. The documentation mentions `workspace_authorize` then `workspace_bind`, but it doesn't provide a consolidated "Daemon First Run" script or command to simplify this multi-step handshake.

# 2. REQUIRED UPDATES & COMPLETENESS CHECK

- **2.1. README.md Priority Fixes:** 
    - Fix the `createProjectionBundle` example to accurately reflect its signature and disposal behavior if used directly.
    - Add a "Platform Support" section to the README to clarify that `darwin` is primary but others are supported via Docker.
    - Include a "Community & Support" section (e.g., GitHub Discussions or the maintainer's email).

- **2.2. Missing Standard Documentation (New Focus):** 
    - **`docs/api/REFERENCE.md`**: A generated or manually maintained API reference for the library surface.
    - **`docs/method/GLOSSARY.md`**: Definitions for project-specific terms like "WARP", "Causal Provenance", "Strand", and "Worldline".

- **2.3. Supplementary Documentation (Docs):** The `AGENTS.md` file is mentioned in `SETUP.md` as a way to seed instructions for Codex, but its content is not standardized or templated for other agents. A `docs/templates/AGENTS.md` would help users maintain instruction parity across different tools.

# 3. FINAL ACTION PLAN

- **3.1. Recommendation Type:** **A.** Recommend incremental updates to the existing `README` and documentation.
        
- **3.2. Deliverable (Prompt Generation):** Generate a prompt to apply the specific fixes from 2.1 and create the missing glossary and API reference files identified in 2.2.
    
- **3.3. Mitigation Prompt:** 
    `Update the createProjectionBundle example in README.md to match the implementation in src/api/index.ts. Create docs/method/GLOSSARY.md with definitions for WARP, Causal Provenance, Strand, and Worldline. Also, scaffold docs/api/REFERENCE.md by extracting JSDoc summaries from the exported functions in src/api/index.ts.`
