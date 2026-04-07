# PostToolUse hook mixes IO and education logic

File: `src/hooks/posttooluse-read.ts`

Non-green SSJR pillars:
- Boundary validation 🟡
- Behavior on type 🟡
- SOLID 🟡

What is wrong:
- hook input decoding, file IO, policy simulation, and human-facing messaging are tightly packed together

Desired end state:
- separate hook boundary parsing from message-generation logic

Effort: M
