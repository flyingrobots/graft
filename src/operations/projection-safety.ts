// ---------------------------------------------------------------------------
// Projection Safety Classes — what can each projection level answer?
// ---------------------------------------------------------------------------

/** Question classes ordered by information requirement. */
export type QuestionClass = "existence" | "structure" | "signature" | "behavior";

/** Projection levels ordered by detail. */
export type ProjectionLevel = "outline" | "signature" | "content";

/** Warning when a projection is insufficient for the inferred question. */
export interface SafetyWarning {
  readonly questionClass: QuestionClass;
  readonly currentProjection: ProjectionLevel;
  readonly requiredProjection: ProjectionLevel;
  readonly message: string;
}

/** Metadata about what a projection level can answer. */
export interface SafetyClassMetadata {
  readonly projection: ProjectionLevel;
  readonly answerable: readonly QuestionClass[];
}

// ---------------------------------------------------------------------------
// Question class taxonomy
// ---------------------------------------------------------------------------

/** What each projection level can safely answer. */
const ANSWERABLE: Readonly<Record<ProjectionLevel, readonly QuestionClass[]>> = {
  outline: ["existence", "structure"],
  signature: ["existence", "structure", "signature"],
  content: ["existence", "structure", "signature", "behavior"],
};

/** Minimum projection needed for each question class. */
const MINIMUM_PROJECTION: Readonly<Record<QuestionClass, ProjectionLevel>> = {
  existence: "outline",
  structure: "outline",
  signature: "signature",
  behavior: "content",
};

// ---------------------------------------------------------------------------
// Tool → question class mapping
// ---------------------------------------------------------------------------

const TOOL_QUESTION_CLASS: Readonly<Record<string, QuestionClass>> = {
  code_find: "existence",
  graft_map: "structure",
  file_outline: "structure",
  code_refs: "existence",
  code_show: "behavior",
  safe_read: "behavior",
  read_range: "behavior",
  graft_diff: "structure",
  graft_review: "structure",
  changed_since: "structure",
};

/**
 * Infer the question class from a tool name.
 * Defaults to "behavior" for unknown tools (conservative).
 */
export function getQuestionClass(toolName: string): QuestionClass {
  return TOOL_QUESTION_CLASS[toolName] ?? "behavior";
}

// ---------------------------------------------------------------------------
// Safety check
// ---------------------------------------------------------------------------

/** Projection detail ordering for comparison. */
const LEVEL_ORDER: Readonly<Record<ProjectionLevel, number>> = {
  outline: 0,
  signature: 1,
  content: 2,
};

/**
 * Check whether a projection is sufficient for the question implied
 * by a tool call. Returns null if safe, or a warning if insufficient.
 */
export function checkProjectionSafety(
  toolName: string,
  currentProjection: ProjectionLevel,
): SafetyWarning | null {
  const questionClass = getQuestionClass(toolName);
  const required = MINIMUM_PROJECTION[questionClass];

  if (LEVEL_ORDER[currentProjection] >= LEVEL_ORDER[required]) {
    return null;
  }

  return {
    questionClass,
    currentProjection,
    requiredProjection: required,
    message: `${toolName} asks a "${questionClass}" question which requires "${required}" projection, but current projection is "${currentProjection}".`,
  };
}

/**
 * Get metadata about what question classes a projection level can answer.
 */
export function getSafetyClassMetadata(projection: ProjectionLevel): SafetyClassMetadata {
  return {
    projection,
    answerable: ANSWERABLE[projection],
  };
}
