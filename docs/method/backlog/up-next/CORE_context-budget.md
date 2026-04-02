# Context budget

Agent declares a token/byte budget at session start. Graft adjusts
all thresholds dynamically to stay within it. The governor becomes
budget-aware, not just size-aware.

Instead of fixed caps (150 lines, 12 KB) the governor tracks
cumulative bytes returned and tightens as the budget drains. A
200K-token session that's used 150K gets stricter caps than one
that's used 20K.

Connects to Blacklight: the sessions that blew up were the ones
where nobody was counting.

Effort: M
