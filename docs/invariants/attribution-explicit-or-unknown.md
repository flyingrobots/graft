# attribution-explicit-or-unknown

If Graft surfaces actor attribution, it must name a supported actor
class with inspectable evidence or explicitly say `unknown`.

Why it matters:
- bounded provenance surfaces are trust surfaces
- silent guessing breaks both human and agent workflows

Must always hold:
- actor attribution uses the explicit actor classes:
  `human`, `agent`, `git`, `daemon`, `unknown`
- if available evidence does not support a specific actor, the surface
  says `unknown`
- no product surface fabricates a specific actor from continuity signals
  alone
