# Optic-based refactoring

Declare structural rewrites as WARP optics. The system projects,
focuses, transforms, and reassembles — lawfully.

"Extract method" is an optic. "Rename symbol" is an optic.
"Change signature" is an optic. Each carries a witness for
local reversibility.

The profunctor form means the SAME optic can be interpreted as:
- Execute the refactor
- Preview the structural outcome (counterfactual)
- Estimate the cost / blast radius
- Check for conflicts with other pending rewrites
- Generate a debugger explanation
- Emit the actual code changes

One declared shape, six interpretations. No reimplementation.

Depends on: WARP Level 1 (shipped), counterfactual refactoring
(backlog), git-warp Strands.

See: aion-paper-07/optics/warp-optic.tex
