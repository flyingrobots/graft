# Speculative read cost estimate

Before an agent commits to reading a file, graft returns a cost
preview: how many bytes would this read consume, what projection
would fire (content/outline/refused), and what fraction of remaining
budget it would cost.

Decision support, not enforcement. The agent can make an informed
choice before spending context.

Could be a lightweight `peek` mode on safe_read, or a separate
`read_cost` tool.
