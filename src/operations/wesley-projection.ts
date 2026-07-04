import type {
  BufferRange,
  SyntaxSpan,
  WarmProjectionBasis,
} from "./structured-buffer-model.js";
import type { ResolvedAuthorityContext } from "./projection-profile-resolver.js";

export type WesleyJsonObject = Readonly<Record<string, unknown>>;

export type WesleyProjectionEmit =
  | "syntax"
  | "diagnostics"
  | "digests"
  | "payloads";

export interface WesleyProjectionRequest {
  readonly name: string;
  readonly content: string;
  readonly basis?: WarmProjectionBasis | null | undefined;
  readonly authority: ResolvedAuthorityContext;
  readonly emit: readonly WesleyProjectionEmit[];
}

export type WesleyProjectionSlot<TValue> =
  | { readonly state: "not_requested" }
  | { readonly state: "available"; readonly value: TValue }
  | { readonly state: "blocked"; readonly reason: readonly WesleyJsonObject[] }
  | { readonly state: "failed"; readonly error: WesleyProjectionFailure };

export interface WesleySyntaxProjection {
  readonly spans: readonly SyntaxSpan[];
}

export interface WesleyProjectionDiagnostics {
  readonly items: readonly WesleyDiagnosticItem[];
}

export interface WesleyDiagnosticItem {
  readonly stage: string;
  readonly kind: string;
  readonly severity: "error" | "warning";
  readonly range: BufferRange;
  readonly message?: string | undefined;
}

export interface WesleyDigestProjection {
  readonly items: readonly WesleyDigestItem[];
}

export interface WesleyDigestItem {
  readonly kind: string;
  readonly digest: string;
}

export interface WesleyProjectionFailure {
  readonly kind: string;
  readonly message?: string | undefined;
  readonly failures?: readonly WesleyJsonObject[] | undefined;
}

export interface WesleyProjectionStatus {
  readonly status: "ok" | "error";
  readonly checked: number;
  readonly errors: number;
}

export interface WesleyProjectionBundle {
  readonly language: "wesley-sdl";
  readonly name: string;
  readonly basis: WarmProjectionBasis | null;
  readonly syntax: WesleyProjectionSlot<WesleySyntaxProjection>;
  readonly diagnostics: WesleyProjectionDiagnostics;
  readonly digests: WesleyProjectionSlot<WesleyDigestProjection>;
  readonly payloads: Readonly<Record<string, WesleyProjectionSlot<unknown>>>;
  readonly status: WesleyProjectionStatus;
}

export interface WesleyProjectionProvider {
  project(input: WesleyProjectionRequest): WesleyProjectionBundle;
}
