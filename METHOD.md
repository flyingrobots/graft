# METHOD

The Graft work doctrine: A backlog, a loop, and honest bookkeeping.

## Principles

- **The agent and the human sit at the same table.** Both matter. Both are named in every design. Default to the agent surface first.
- **The filesystem is the coordination layer.** Directories are priorities; filenames are identities; moves are decisions.
- **Tests are the executable spec.** Design names the problem; tests prove the answer.
- **Reproducibility is the definition of done.** Results must be re-runnable proof, not static artifacts.

## Structure

| Signpost | Role |
| :--- | :--- |
| **`README.md`** | Public front door and project identity. |
| **`GUIDE.md`** | Orientation and productive-fast path. |
| **`BEARING.md`** | Current direction and active tensions. |
| **`VISION.md`** | Core tenets and the provenance-aware mission. |
| **`ARCHITECTURE.md`** | Authoritative structural reference. |
| **`AGENTS.md`** | Context recovery protocol for AI and humans. |
| **`METHOD.md`** | Repo work doctrine (this document). |

## Backlog Lanes

| Lane | Purpose |
| :--- | :--- |
| **`asap/`** | Imminent work; pull into the next cycle. |
| **`up-next/`** | Queued after `asap/`. |
| **`cool-ideas/`** | Uncommitted experiments. |
| **`bad-code/`** | Technical debt that must be addressed. |
| **`inbox/`** | Raw ideas. |

## The Cycle Loop

```mermaid
stateDiagram-v2
    direction LR
    [*] --> Pull: asap/
    Pull --> Branch: cycle/
    Branch --> Red: failing tests
    Red --> Green: passing tests
    Green --> Retro: findings/debt
    Retro --> Ship: PR to main
    Ship --> [*]
```

1. **Pull**: Move an item from `asap/` to `docs/design/`.
2. **Branch**: Create `cycle/<cycle_name>`.
3. **Red**: Write failing tests based on the design's playback questions.
4. **Green**: Implement the solution until tests pass.
5. **Retro**: Document findings and follow-on debt in the cycle doc.
6. **Ship**: Open a PR to `main`. Update `BEARING.md` and `CHANGELOG.md` after merge.

## Naming Convention
Backlog and cycle files follow: `<LEGEND>_<slug>.md`
Example: `WARP_strand-collapse-witness.md`
