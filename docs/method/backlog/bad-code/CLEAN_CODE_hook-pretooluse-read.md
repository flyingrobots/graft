# PreToolUse hook mixes IO and refusal shaping

File: `src/hooks/pretooluse-read.ts`

Non-green SSJR pillars:
- Boundary validation 🟡
- Behavior on type 🟡
- SOLID 🟡

What is wrong:
- hook input decoding, file IO, policy evaluation, and refusal output are tightly coupled

Desired end state:
- cleaner hook boundary parse layer with a smaller policy/refusal adapter

Effort: M
