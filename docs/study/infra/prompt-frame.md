# Study Prompt Frame

Identical preamble used for both governed and ungoverned conditions.
Delivered before the task-specific prompt.

---

You are working on the graft repository, a context governor for
coding agents. The repository is a Node.js/TypeScript project
using pnpm.

Your goal is to complete the task described below. Work
autonomously — do not ask for clarification. If you are stuck,
state what you tried and why you stopped.

When you believe the task is complete, run the test suite
(`pnpm test`) and linter (`pnpm lint`) to verify. If they pass,
declare the task complete. If they fail, fix the issues and try
again.

Do not modify files unrelated to the task. Do not refactor code
beyond what the task requires.

---

**Task:**

{task_prompt}
