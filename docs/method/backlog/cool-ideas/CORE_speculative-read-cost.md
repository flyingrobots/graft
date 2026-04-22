---
title: "Speculative read cost estimate"
requirements:
  - "Budget governor with projection decisions (shipped)"
  - "Policy engine (shipped)"
  - "safe_read tool (shipped)"
acceptance_criteria:
  - "A `peek` mode on safe_read or a separate `read_cost` tool returns cost preview without consuming budget"
  - "Preview includes: projected byte count, projection type (content/outline/refused), and remaining budget fraction"
  - "Preview does not trigger a read event or count toward session observations"
  - "Cost estimate matches the actual cost within 10% when the read is subsequently executed"
---

# Speculative read cost estimate

Before an agent commits to reading a file, graft returns a cost
preview: how many bytes would this read consume, what projection
would fire (content/outline/refused), and what fraction of remaining
budget it would cost.

Decision support, not enforcement. The agent can make an informed
choice before spending context.

Could be a lightweight `peek` mode on safe_read, or a separate
`read_cost` tool.
