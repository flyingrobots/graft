# Outline quality audit

If the outline is weak, agents feel crippled and fight the tool.
Current outlines are tested against simple fixtures. Real-world
code is harder.

## What needs testing

- 500-line React component with nested hooks and JSX
- Express/Fastify router with 40 route handlers
- File with many re-exports (`export { x } from './y'`)
- Class with 30+ methods (god class)
- File mixing types, interfaces, classes, and functions
- Minified-adjacent code (long lines, dense expressions)
- File with heavy decorators (NestJS, Angular)

## What to measure

- Can an agent go from outline → read_range in one step?
- Does the jump table have enough entries to be useful?
- Are signatures informative enough to choose the right symbol?
- Are the outlines small enough to fit in context alongside work?

## What might need fixing

- Richer signatures (param types, return types, JSDoc summaries)
- Export re-export detection
- Decorator extraction
- Nested function/arrow handling (currently only top-level)
- Configurable verbosity (compact vs detailed outlines)

This is the difference between "smart thesis" and "defensible
infrastructure." If outlines don't help agents navigate, the
governor is just a wall.

Effort: M
