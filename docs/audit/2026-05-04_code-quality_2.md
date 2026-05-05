---
report_id: "AUD-2026-05-04-Q-V02"
title: "Quarterly Code Quality Audit: Graft Governor"
status: "Final"
audit:
  date_started: 2026-05-04
  date_completed: 2026-05-04
  type: "Full"
  scope: "src/warp/*, src/parser/*, src/policy/*"
  compliance_frameworks: ["Internal Engineering Standards"]
target:
  repository: "github.com/flyingrobots/graft"
  branch: "main"
  commit_hash: "HEAD"
  language_stack: ["TypeScript 6.0", "Tree-Sitter"]
  environment: "Development"
methodology:
  automated_tools: ["ESLint", "TSC"]
  manual_review_hours: 4
  false_positive_rate: "5%"
summary:
  total_findings: 10
  severity_count:
    critical: 0
    high: 1
    medium: 5
    low: 4
  remediation_status: "Pending"
related_reports:
  previous_audit: "AUD-2026-05-04-Q-V01"
---

<!-- markdownlint-disable -->

# 0. 🏆 EXECUTIVE REPORT CARD (Strategic Lead View)

|**Metric**|**Score (1-10)**|**Recommendation**|
|---|---|---|
|**Developer Experience (DX)**|8.5|**Best of:** High-fidelity structural history via WARP enables powerful navigation.|
|**Internal Quality (IQ)**|8|**Watch Out For:** Top-level awaits in core parser runtime and type-casting hacks in timeline reconstruction.|
|**Overall Recommendation**|**THUMBS UP**|**Justification:** The project maintains high structural integrity but needs to harden its core parsing and indexing performance.|

---

# 1. DX: ERGONOMICS & INTERFACE CLARITY (Advocate View)

- **1.1. Time-to-Value (TTV) Score (1-10):** 8. Setting up structural history requires a cold index which can be slow.
    
    - **Answer:** The `indexHead` function in `index-head.ts` has a strict 64-file limit per call which forces developers to implement their own batching/looping logic for large repos.
        
    - **Action Prompt (TTV Improvement):** `Refactor indexHead in src/warp/index-head.ts to support an internal batching mechanism or an EventEmitter that reports progress, allowing the CLI to handle large repositories without failing the safety check.`
        
- **1.2. Principle of Least Astonishment (POLA):** The `symbolTimeline` function requires a `filePath` to find "removed" symbols, which is counter-intuitive if a developer is searching for a symbol that they only know by name and suspect was deleted.
    
    - **Answer:** Developers expect to find the history of a symbol globally by name.
        
    - **Action Prompt (Interface Refactoring):** `Update symbolTimeline in src/warp/symbol-timeline.ts to support a global name search fallback when filePath is not provided, utilizing a 'dead-symbol' index if available.`
        
- **1.3. Error Usability:** The error "indexHead refused to index 65 files in one call" is defensive but doesn't tell the user *how* to index the rest.
    
    - **Answer:** The error should suggest using the CLI `index` command with specific paths or increasing the limit via a flag if they are on the CLI.
        
    - **Action Prompt (Error Handling Fix):** `Enhance the error message in indexHead (src/warp/index-head.ts) to explicitly suggest the 'graft index' command or the batching flag, and provide a link to docs/CLI.md#indexing.`
        

---

# 2. DX: DOCUMENTATION & EXTENDABILITY (Advocate View)

- **2.1. Documentation Gap:** The "Semantic Enrichment" feature in `index-head.ts` is implemented but lacks an integration guide for third-party providers (e.g., LSIF, SCIP).
    
    - **Answer:** Integrate a 'Semantic Provider Guide' into the advanced documentation.
        
    - **Action Prompt (Documentation Creation):** `Create docs/strategy/semantic-enrichment-providers.md detailing the interface requirements and registration process for new SemanticEnrichmentProviders.`
        
- **2.2. Customization Score (1-10):** 7. The parser runtime is hardcoded to specific WASM files.
    
    - **Answer:** `src/parser/runtime.ts` uses top-level await and `esmRequire` to load specific languages, making it difficult to add new languages without editing the source.
        
    - **Action Prompt (Extension Improvement):** `Refactor src/parser/runtime.ts to use a dynamic registration registry for Tree-Sitter grammars, allowing consumers to register new .wasm paths at runtime.`
        

---

# 3. INTERNAL QUALITY: ARCHITECTURE & MAINTAINABILITY (Architect View)

- **3.1. Technical Debt Hotspot:** `src/warp/index-head.ts` is a "God Module" for indexing, mixing Git operations, graph patching, and semantic enrichment logic.
    
    - **Answer:** Low cohesion and high complexity make it hard to modify indexing behavior.
        
    - **Action Prompt (Debt Reduction):** `Extract the 'commit metadata extraction' and 'file-to-graph mapping' from index-head.ts into separate FileIndexer and CommitIndexer classes.`
        
- **3.2. Abstraction Violation:** `src/warp/symbol-timeline.ts` casts `ctx.app.core()` to `ProvenanceTimelineCore`, which is a private/internal interface.
    
    - **Answer:** This bypasses the formal port/adapter boundary.
        
    - **Action Prompt (SoC Refactoring):** `Define a formal 'ProvenancePort' in src/ports/ and implement it in the Warp adapter, then update symbol-timeline.ts to use this port instead of direct core casting.`
        
- **3.3. Testability Barrier:** `src/parser/runtime.ts` performs heavy initialization (`Parser.init()` and `Language.load()`) at the top level, making unit tests for other modules slow and prone to timeout.
    
    - **Answer:** Heavy top-level side effects.
        
    - **Action Prompt (Testability Improvement):** `Wrap the Parser initialization and language loading in a lazy-initialized singleton or a factory function in src/parser/runtime.ts.`
        

---

# 4. INTERNAL QUALITY: RISK & EFFICIENCY (Auditor View)

- **4.1. The Critical Flaw:** The `indexHead` function uses `JSON.stringify(patch.build())` just to check the byte length, which is extremely expensive for large patches.
    
    - **Answer:** Performance bottleneck during indexing.
        
    - **Action Prompt (Risk Mitigation):** `Implement a more efficient 'estimatedByteLength' method on the PatchBuilder that doesn't require a full JSON serialization.`
        
- **4.2. Efficiency Sink:** Redundant `git show HEAD:path` calls in `indexHeadFile` even when the content might have been recently read by the caller.
    
    - **Answer:** Redundant Git I/O.
        
    - **Action Prompt (Optimization):** `Update indexHeadFile to accept an optional 'cachedContent' string to avoid redundant Git show operations during read-through indexing.`
        
- **4.3. Dependency Health:** The `picomatch` dependency is used extensively in the policy layer but is not locked to a specific version range in a way that guarantees consistent glob behavior across environments.
    
    - **Answer:** Potential for drift in ignore-pattern behavior.
        
    - **Action Prompt (Dependency Update):** `Verify the picomatch version in package.json and ensure it is pinned to a version that guarantees deterministic glob matching for .graftignore.`
        

---

# 5. STRATEGIC SYNTHESIS & ACTION PLAN (Strategist View)

- **5.1. Combined Health Score (1-10):** 8.2
        
- **5.2. Strategic Fix:** Decouple the parser initialization from the module load state. This will significantly speed up cold-starts and improve test isolation.
        
- **5.3. Mitigation Prompt:**
    
    - **Action Prompt (Strategic Priority):** `Refactor src/parser/runtime.ts to move Parser.init() and Language.load() calls into an async 'ensureParserReady()' function. Update all callers to await this function, and introduce a ParserPool to reuse parser instances safely across concurrent requests.`
