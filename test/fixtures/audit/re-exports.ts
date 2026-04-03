// Audit fixture: Re-export patterns (barrel file)
// Tests: named re-exports, type re-exports, wildcard re-exports

export { UserCard, UserList } from "./react-component";
export { authenticate, rateLimit } from "./express-router";
export type { UserProps, UserState } from "./react-component";
export type { RouteParams, HandlerFn } from "./express-router";
export * from "./god-class";

// Local declarations mixed with re-exports
export const VERSION = "1.0.0";

export function createApp(): { start: () => void } {
  return { start: () => {} };
}
