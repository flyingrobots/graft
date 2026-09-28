---
title: "Modular Graft design verification"
date: 2026-09-07
source_sha: b7938aa9dbf274942a584fe18b21e6e635f2a369
surface: docs
---

# Modular Graft design verification

## Baseline and observation scope

- Source checkout: `b7938aa9dbf274942a584fe18b21e6e635f2a369`, package 0.13.0.
- Installed operator inspected from disk: package 0.12.0; loaded build of the
  reported large daemon was not recovered.
- jedit embedding investigation: installed 0.11.1, with source-level API usage
  and a prior bounded import experiment; not a new consumer compatibility run.
- No workload MCP query, daemon startup, restart, upgrade, graph opening,
  indexing, heap capture or process termination was performed.

## Checks performed

| Check | Command or method | Result |
| :--- | :--- | :--- |
| Clean source preflight | `git status --porcelain=v1 --untracked-files=all` | Empty before isolated design worktree creation |
| Remote source | `git fetch origin` | Succeeded; baseline remained b7938aa9 |
| Dependencies for lint | `pnpm install --frozen-lockfile --offline --ignore-scripts` | 325 cached packages; no lockfile change |
| Lint | `pnpm lint` | Exit 0; existing unresolved NPM_TOKEN placeholder warning, no secret output |
| Diff whitespace | `git diff --cached --check` | Recorded at staging before commit |
| Source coverage | Git tracked manifest compared with linked inventory | All 346 files assigned once |
| Capability coverage | Imported `CAPABILITY_REGISTRY` and compared count | 55 entries matched the document inventory |
| Mermaid | `mmdc` 11.12.0, every final source block rendered to SVG | 17 successful renders |
| Visual diagram QA | Figure 5 rendered to PNG and viewed | Labels and relationships readable; tables provide linear explanation |
| Authoring links | Resolve local relative targets from the design document | No missing target |
| Semantic review | Current/target distinction, origin attribution, optional monitor origin, release partiality, lease PR reconciliation | Corrections incorporated before commit |

The 346-file scope is exactly `git ls-files src bin scripts schemas .github`.
There is no claim of auditing every line or every transitive package. The
inventory and relative-link authoring checks are not committed automated tests
for Markdown structure. No runtime test or full suite was run for prose changes.

## Memory observation

Read-only `ps`, `lsof -U`, `vm_stat`, and `sysctl hw.memsize vm.swapusage`
observations after the operator's report found no process retaining the reported
7 GB under a visible Graft command, no default daemon socket, and no Graft daemon
listener in the Unix-socket listing. Explicitly named small Graft Node processes
summed to approximately 179 MiB RSS in one sample; a checkout-hosted child was
visible separately. RSS does not include all compressed/swapped footprint and
this sample cannot refute the earlier report.

The host reported 17,179,869,184 bytes RAM and 8,408.81 MiB swap used. Those are
host-wide facts, not attribution to Graft. The investigation neither restarted
the missing process nor tried to allocate gigabytes to recreate the incident on
the pressured host.

An isolated Node process imported only the installed 0.12.0 pool class and supplied
a tiny fake opener. It acquired 128 distinct repository keys, then reacquired
the first. Assertions observed pool size 128, exactly 128 opens, and identity
reuse of the first handle. The prototype exposed `constructor`, `getOrOpen`, and
`size`. No filesystem repository or real WARP instance was opened. Source review
confirmed successful entries have no removal path; failure removes an entry.
This is a retention experiment, not a heap measurement or an incident reproducer.

## Independently delivered work

GitHub read-only queries verified PR #251 open at
`ede389ae04ffc96371e92b3b58493ba88299b3b9` and PR #250 open at
`924c59c41905a06ea966ae41f875e8874589c0f7`. The former's existing design was read to
preserve independent binding/invocation ownership and eager final release. The
latter reports a review hold. These observations do not constitute a new
current-head review or merge-readiness assessment.

## Diagram receipts

Extract each `mermaid` fence from the design and render it with `mmdc -i
figure-NN.mmd -o figure-NN.svg`. The table hashes the exact fence body with SHA-256
and records the generated SVG size. Render files are local authoring artifacts
under `/tmp/graft-design-diagrams`; the Markdown sources are the deliverable.

| Figure | Mermaid kind | Source SHA-256 | SVG bytes |
| :--- | :--- | :--- | ---: |
| 1 | `flowchart TD` | `ef1f3d243229fbec14ed92ec8acb33b591543db463167760bd82d838366dbdf5` | 17043 |
| 2 | `flowchart TD` | `f47c0552761352e4f038dd9c01edafef0ae47473ada49e574bd2d248dacf8e85` | 18618 |
| 3 | `flowchart LR` | `c43577971ec9a44402741016fc35fc93e88776434eeb6a1af122f5e3d3762e2b` | 22625 |
| 4 | `classDiagram` | `e3c8bbfd0fd7d0cc70812b7b6243183c2ae0dd773a9eb006fad409400a482a76` | 45496 |
| 5 | `erDiagram` | `d8d23161ded079b3f1445963970f99388ada0b398eb4980925da995dfe592fa5` | 79584 |
| 6 | `sequenceDiagram` | `18597966a0f75bc4765be960e1fe56cc2e804961f29a678cd086252b8927e7e4` | 25927 |
| 7 | `sequenceDiagram` | `9f52deb7e69fe2caf6b0b3bb3d2df6f85c1f41207079cfe7f4ad0b0e19b43715` | 28443 |
| 8 | `sequenceDiagram` | `ee8b656873bc14857374718520068273fa79683bd9ffc3bd1dc45087ea2d668c` | 25551 |
| 9 | `stateDiagram-v2` | `605d793e0df9c089c38385cd944a571966ed86f2750a1ea0e9f28418e4fe5f3d` | 351645 |
| 10 | `classDiagram` | `1e7f442bf81c4d67f50501a269a431a47af9f6645784478d9bccd46109fcee9a` | 30857 |
| 11 | `stateDiagram-v2` | `18dfb7df3164a645dabca7763518df64cc05ec3bb63a5329f53117c778507e8d` | 225924 |
| 12 | `flowchart TD` | `bd73c818e5fbbcdbc1f6ba7f0dd2be6e42532ca11df4137e6050bb45968be187` | 21551 |
| 13 | `stateDiagram-v2` | `91502f5ee4893f2787de243658750cc39b0b2be7c912afabc68eccf5127cd1e0` | 226529 |
| 14 | `sequenceDiagram` | `7c13258d3952830a3f17cd8508a483ed5c6ab7937fe95de07d3d713f5bcbd37b` | 24966 |
| 15 | `stateDiagram-v2` | `1c294be7f96f0816166f27345aff44d189fa6314573abea2b8e56863f0c8c730` | 262726 |
| 16 | `stateDiagram-v2` | `ddc3b69bce952c8f4c0b8347d634ad7b6099fd97420196285e93dce58c50b063` | 261677 |
| 17 | `flowchart TD` | `f874a2c210d0febfad4cc217c70ad58095ace36f93ff101b47bf85753666da0c` | 19287 |

The hashes bind these receipts to diagram inputs; they do not establish source
correctness, runtime coherence, incident causality, or implementation completeness.
