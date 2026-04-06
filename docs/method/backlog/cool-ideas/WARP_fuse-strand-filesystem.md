# FUSE-mounted strand filesystem

Mount a WARP strand as a virtual filesystem via FUSE. The strand
overlay materializes as a file tree. Standard tools (IDEs, editors,
grep, cat) read from it like any directory. Writes go back into
the strand's worldline as structural patches.

This is NOT a git worktree. It's cheaper:
- No checkout, no index, no working tree copy
- Multiple strands mounted simultaneously (parallel universes
  on disk)
- Reads materialize from the WARP graph on demand
- Writes are captured as structural diffs and committed to the
  strand overlay

The flow:
1. `graft mount strand-id /mnt/experiment` — mount a strand
2. Open `/mnt/experiment/src/server.ts` in VS Code — FUSE
   materializes from the graph
3. Edit the file, save — FUSE captures the write
4. Graft diffs the old materialized content against the new write
5. Structural delta patch committed to the strand's worldline
6. The strand's observer now sees the updated structure

Why this is insane:
- Agents get isolated workspaces that are REAL FILESYSTEMS
- No git branch overhead — strands are cheap
- Multiple speculative refactors running simultaneously, each
  in its own mount point
- IDE integration for free — every tool that reads files works
- Structural diffs computed AUTOMATICALLY from file writes
- Collapse a strand = merge its structural patches into main
  worldline

The counterfactual refactoring idea becomes PHYSICAL:
- Mount 3 strands: /mnt/extract-class, /mnt/rename-method,
  /mnt/change-interface
- Make changes in each using your normal editor
- Compare their structural outcomes via WARP observers
- Collapse the winner. Delete the others.

Cheap parallel universes. On disk. With your existing tools.

Depends on: WARP Level 1 (shipped), git-warp Strands,
FUSE bindings (Node.js fuse-native or similar), strand
collapse/merge.

See also: JIT Shadow Working Sets, counterfactual refactoring.
