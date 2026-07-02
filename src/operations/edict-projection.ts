import type {
  BufferRange,
  SyntaxClass,
  SyntaxSpan,
  WarmProjectionBasis,
} from "./structured-buffer-model.js";

export type JsonObject = Readonly<Record<string, unknown>>;

export type EdictProjectionEmit =
  | "syntax"
  | "diagnostics"
  | "core"
  | "targetIr"
  | "digests";

export type EdictWriteClass =
  | "none"
  | "read"
  | "create"
  | "ensure"
  | "append"
  | "replace"
  | "delete";

export interface EdictProjectionOperationProfileFact {
  readonly source: string;
  readonly core: string;
  readonly allowedWriteClasses?: readonly EdictWriteClass[] | undefined;
}

export interface EdictProjectionEffectWriteClassFact {
  readonly effect: string;
  readonly writeClass: EdictWriteClass;
}

export interface EdictProjectionBudget {
  readonly maxSteps: number;
  readonly maxAllocatedBytes: number;
  readonly maxOutputBytes: number;
}

export interface EdictProjectionBudgetFact {
  readonly source: string;
  readonly budget: EdictProjectionBudget;
}

export interface EdictProjectionCompilerContext {
  readonly operationProfiles?: readonly EdictProjectionOperationProfileFact[] | undefined;
  readonly effectWriteClasses?: readonly EdictProjectionEffectWriteClassFact[] | undefined;
  readonly budgets?: readonly EdictProjectionBudgetFact[] | undefined;
}

export interface EdictProjectionTargetEffectLowering {
  readonly effect: string;
  readonly targetIntrinsic: string;
}

export interface EdictProjectionTargetSettings {
  readonly coordinate: string;
  readonly profileDigest: string;
  readonly irDomain: string;
  readonly operationProfiles?: readonly string[] | undefined;
  readonly obstructionCoordinates?: readonly string[] | undefined;
  readonly effectLowerings?: readonly EdictProjectionTargetEffectLowering[] | undefined;
}

export interface EdictProjectionRequest {
  readonly name: string;
  readonly content: string;
  readonly basis?: WarmProjectionBasis | null | undefined;
  readonly emit: readonly EdictProjectionEmit[];
  readonly compilerContext?: EdictProjectionCompilerContext | undefined;
  readonly target?: EdictProjectionTargetSettings | undefined;
}

export interface EdictProjectionDiagnostics {
  readonly items: readonly EdictDiagnosticItem[];
}

export interface EdictDiagnosticItem {
  readonly stage: string;
  readonly kind: string;
  readonly severity: "error";
  readonly range: BufferRange;
  readonly message?: string | undefined;
}

export type EdictProjectionSlot<TValue> =
  | { readonly state: "not_requested" }
  | { readonly state: "available"; readonly value: TValue }
  | { readonly state: "blocked"; readonly reason: readonly JsonObject[] }
  | { readonly state: "failed"; readonly error: EdictProjectionFailure };

export interface EdictSyntaxProjection {
  readonly spans: readonly SyntaxSpan[];
}

export interface EdictCoreProjection {
  readonly digest: string;
  readonly review: JsonObject;
}

export interface EdictTargetIrProjection {
  readonly domain: string;
  readonly target: {
    readonly coordinate: string;
    readonly digest: string;
  };
  readonly digest: string;
  readonly review: JsonObject;
}

export interface EdictProjectionFailure {
  readonly kind: string;
  readonly message?: string | undefined;
  readonly failures?: readonly JsonObject[] | undefined;
}

export interface EdictProjectionStatus {
  readonly status: "ok" | "error";
  readonly checked: number;
  readonly errors: number;
  readonly exitCode: 0 | 1 | 2;
}

export interface EdictProjectionBundle {
  readonly language: "edict";
  readonly name: string;
  readonly basis: WarmProjectionBasis | null;
  readonly syntax: EdictProjectionSlot<EdictSyntaxProjection>;
  readonly diagnostics: EdictProjectionDiagnostics;
  readonly core: EdictProjectionSlot<EdictCoreProjection>;
  readonly targetIr: EdictProjectionSlot<EdictTargetIrProjection>;
  readonly status: EdictProjectionStatus;
}

export interface EdictProjectionProvider {
  project(input: EdictProjectionRequest): EdictProjectionBundle;
}

export class EdictProjectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EdictProjectionError";
  }
}

interface Utf8ByteMapper {
  readonly byteToPoint: (byte: number) => { readonly row: number; readonly column: number };
  readonly hasBoundary: (byte: number) => boolean;
}

function fail(message: string): never {
  throw new EdictProjectionError(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) {
    fail(`${label} must be an object`);
  }
  return value;
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string") {
    fail(`${label} must be a string`);
  }
  return value;
}

function requireInteger(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    fail(`${label} must be an integer`);
  }
  return value;
}

function requireArray(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value)) {
    fail(`${label} must be an array`);
  }
  return value;
}

function asJsonObject(value: unknown, label: string): JsonObject {
  const record = requireRecord(value, label);
  return record as JsonObject;
}

function requireDigest(value: unknown, label: string): string {
  const digest = requireString(value, label);
  if (!/^sha256:[0-9a-f]{64}$/u.test(digest)) {
    fail(`${label} must be a lowercase sha256 digest`);
  }
  return digest;
}

function requireEnvelope(record: Record<string, unknown>, expectedType: string, label: string): void {
  const recordType = requireString(record["type"], `${label}.type`);
  if (recordType !== expectedType) {
    fail(`${label}.type must be ${expectedType}`);
  }
  const command = requireString(record["command"], `${label}.command`);
  if (command !== "project") {
    fail(`${label}.command must be project`);
  }
}

function requireInputName(record: Record<string, unknown>, requestName: string, label: string): void {
  const input = requireRecord(record["input"], `${label}.input`);
  const inputName = requireString(input["name"], `${label}.input.name`);
  if (inputName !== requestName) {
    fail(`${label}.input.name must match the projection request name`);
  }
}

function makeUtf8ByteMapper(source: string): Utf8ByteMapper {
  const pointByBoundary = new Map<number, { row: number; column: number }>();
  let byte = 0;
  let row = 0;
  let column = 0;
  pointByBoundary.set(byte, { row, column });

  for (const char of source) {
    byte += Buffer.byteLength(char, "utf8");
    if (char === "\n") {
      row += 1;
      column = 0;
    } else {
      column += 1;
    }
    pointByBoundary.set(byte, { row, column });
  }

  return {
    byteToPoint(offset) {
      const point = pointByBoundary.get(offset);
      if (point === undefined) {
        fail(`byte offset ${String(offset)} is not a UTF-8 character boundary`);
      }
      return point;
    },
    hasBoundary(offset) {
      return pointByBoundary.has(offset);
    },
  };
}

function decodeByteRange(value: unknown, label: string, source: string, mapper: Utf8ByteMapper): BufferRange {
  const record = requireRecord(value, label);
  const start = requireInteger(record["start"], `${label}.start`);
  const end = requireInteger(record["end"], `${label}.end`);
  const sourceLength = Buffer.byteLength(source, "utf8");
  if (start < 0 || end < start || end > sourceLength) {
    fail(`${label} must be a valid half-open byte range`);
  }
  if (!mapper.hasBoundary(start) || !mapper.hasBoundary(end)) {
    fail(`${label} must start and end on UTF-8 character boundaries`);
  }
  return {
    start: mapper.byteToPoint(start),
    end: mapper.byteToPoint(end),
  };
}

function syntaxClassForRole(role: string): SyntaxClass {
  switch (role) {
    case "comment":
      return "comment";
    case "identifier":
      return "variable";
    case "keyword":
      return "keyword";
    case "number":
      return "number";
    case "operator":
      return "operator";
    case "punctuation":
      return "punctuation";
    case "string":
      return "string";
    case "typeIdentifier":
      return "type";
    default:
      fail(`unknown Edict syntax role ${role}`);
  }
}

function decodeSyntaxRecord(
  value: Record<string, unknown>,
  source: string,
  mapper: Utf8ByteMapper,
): EdictProjectionSlot<EdictSyntaxProjection> {
  const spans = requireArray(value["spans"], "Edict syntax.spans").map((entry, index) => {
    const record = requireRecord(entry, `Edict syntax.spans[${String(index)}]`);
    return {
      className: syntaxClassForRole(requireString(record["role"], `Edict syntax.spans[${String(index)}].role`)),
      range: decodeByteRange(record["span"], `Edict syntax.spans[${String(index)}].span`, source, mapper),
      text: requireString(record["lexeme"], `Edict syntax.spans[${String(index)}].lexeme`),
    };
  });
  return { state: "available", value: { spans } };
}

function decodeDiagnosticsRecord(
  value: Record<string, unknown>,
  source: string,
  mapper: Utf8ByteMapper,
): EdictProjectionDiagnostics {
  const items = requireArray(value["diagnostics"], "Edict diagnostics.diagnostics").map((entry, index) => {
    const record = requireRecord(entry, `Edict diagnostics[${String(index)}]`);
    const message = record["message"];
    return {
      stage: requireString(record["stage"], `Edict diagnostics[${String(index)}].stage`),
      kind: requireString(record["kind"], `Edict diagnostics[${String(index)}].kind`),
      severity: "error" as const,
      range: decodeByteRange(record["span"], `Edict diagnostics[${String(index)}].span`, source, mapper),
      ...(message !== undefined ? { message: requireString(message, `Edict diagnostics[${String(index)}].message`) } : {}),
    };
  });
  return { items };
}

function decodeReason(value: unknown, label: string): readonly JsonObject[] {
  return requireArray(value, label).map((entry, index) => asJsonObject(entry, `${label}[${String(index)}]`));
}

function decodeCoreRecord(value: Record<string, unknown>): EdictProjectionSlot<EdictCoreProjection> {
  const state = requireString(value["state"], "Edict core.state");
  if (state === "available") {
    return {
      state,
      value: {
        digest: requireDigest(value["digest"], "Edict core.digest"),
        review: asJsonObject(value["review"], "Edict core.review"),
      },
    };
  }
  if (state === "blocked") {
    return { state, reason: decodeReason(value["reason"], "Edict core.reason") };
  }
  if (state === "failed") {
    return { state, error: decodeFailure(value["error"], "Edict core.error") };
  }
  fail(`unknown Edict core state ${state}`);
}

function decodeFailure(value: unknown, label: string): EdictProjectionFailure {
  const record = requireRecord(value, label);
  const message = record["message"];
  const failures = record["failures"];
  return {
    kind: requireString(record["kind"], `${label}.kind`),
    ...(message !== undefined ? { message: requireString(message, `${label}.message`) } : {}),
    ...(failures !== undefined ? { failures: decodeReason(failures, `${label}.failures`) } : {}),
  };
}

function decodeTargetIrRecord(value: Record<string, unknown>): EdictProjectionSlot<EdictTargetIrProjection> {
  const state = requireString(value["state"], "Edict targetIr.state");
  if (state === "available") {
    const target = requireRecord(value["target"], "Edict targetIr.target");
    return {
      state,
      value: {
        domain: requireString(value["domain"], "Edict targetIr.domain"),
        target: {
          coordinate: requireString(target["coordinate"], "Edict targetIr.target.coordinate"),
          digest: requireDigest(target["digest"], "Edict targetIr.target.digest"),
        },
        digest: requireDigest(value["digest"], "Edict targetIr.digest"),
        review: asJsonObject(value["review"], "Edict targetIr.review"),
      },
    };
  }
  if (state === "blocked") {
    return { state, reason: decodeReason(value["reason"], "Edict targetIr.reason") };
  }
  if (state === "failed") {
    return { state, error: decodeFailure(value["error"], "Edict targetIr.error") };
  }
  fail(`unknown Edict targetIr state ${state}`);
}

function decodeStatusRecord(value: Record<string, unknown>): EdictProjectionStatus {
  const status = requireString(value["status"], "Edict status.status");
  if (status !== "ok" && status !== "error") {
    fail(`unknown Edict status ${status}`);
  }
  const exitCode = requireInteger(value["exitCode"], "Edict status.exitCode");
  if (exitCode !== 0 && exitCode !== 1 && exitCode !== 2) {
    fail("Edict status.exitCode must be 0, 1, or 2");
  }
  const checked = requireInteger(value["checked"], "Edict status.checked");
  const errors = requireInteger(value["errors"], "Edict status.errors");
  if (checked < 0 || errors < 0) {
    fail("Edict status.checked and Edict status.errors must be non-negative");
  }
  return {
    status,
    checked,
    errors,
    exitCode,
  };
}

export function isEdictPath(filePath: string): boolean {
  return filePath.trim().toLowerCase().endsWith(".edict");
}

export function projectEdictJsonlRecords(
  request: EdictProjectionRequest,
  records: readonly unknown[],
): EdictProjectionBundle {
  const mapper = makeUtf8ByteMapper(request.content);
  let syntax: EdictProjectionSlot<EdictSyntaxProjection> = { state: "not_requested" };
  let diagnostics: EdictProjectionDiagnostics = { items: [] };
  let diagnosticsSeen = false;
  let core: EdictProjectionSlot<EdictCoreProjection> = { state: "not_requested" };
  let targetIr: EdictProjectionSlot<EdictTargetIrProjection> = { state: "not_requested" };
  let status: EdictProjectionStatus | undefined;

  for (const entry of records) {
    const record = requireRecord(entry, "Edict JSONL record");
    const schema = requireString(record["schema"], "Edict JSONL record.schema");
    switch (schema) {
      case "edict.projection.syntax/v1":
        requireEnvelope(record, "syntax", "Edict syntax");
        requireInputName(record, request.name, "Edict syntax");
        syntax = decodeSyntaxRecord(record, request.content, mapper);
        break;
      case "edict.projection.diagnostics/v1":
        requireEnvelope(record, "diagnostics", "Edict diagnostics");
        requireInputName(record, request.name, "Edict diagnostics");
        diagnostics = decodeDiagnosticsRecord(record, request.content, mapper);
        diagnosticsSeen = true;
        break;
      case "edict.projection.core/v1":
        requireEnvelope(record, "core", "Edict core");
        requireInputName(record, request.name, "Edict core");
        core = decodeCoreRecord(record);
        break;
      case "edict.projection.target-ir/v1":
        requireEnvelope(record, "targetIr", "Edict targetIr");
        requireInputName(record, request.name, "Edict targetIr");
        targetIr = decodeTargetIrRecord(record);
        break;
      case "edict.cli.event/v1":
        requireEnvelope(record, "status", "Edict status");
        status = decodeStatusRecord(record);
        break;
      default:
        fail(`unknown Edict JSONL schema ${schema}`);
    }
  }

  if (status === undefined) {
    fail("Edict JSONL stream is missing final status record");
  }

  if (request.emit.includes("diagnostics") && !diagnosticsSeen) {
    diagnostics = {
      items: [
        {
          stage: "projection",
          kind: "missing_projection_record",
          severity: "error",
          message: "Edict did not emit a requested diagnostics projection record",
          range: {
            start: mapper.byteToPoint(0),
            end: mapper.byteToPoint(0),
          },
        },
      ],
    };
  }

  if (request.emit.includes("syntax") && syntax.state === "not_requested") {
    syntax = {
      state: "failed",
      error: {
        kind: "missing_projection_record",
        message: "Edict did not emit a requested syntax projection record",
      },
    };
  }
  if (
    (request.emit.includes("core") || request.emit.includes("digests"))
    && core.state === "not_requested"
  ) {
    core = {
      state: "failed",
      error: {
        kind: "missing_projection_record",
        message: "Edict did not emit a requested Core projection record",
      },
    };
  }
  if (
    (request.emit.includes("targetIr") || request.emit.includes("digests"))
    && targetIr.state === "not_requested"
  ) {
    targetIr = {
      state: "failed",
      error: {
        kind: "missing_projection_record",
        message: "Edict did not emit a requested Target IR projection record",
      },
    };
  }

  return {
    language: "edict",
    name: request.name,
    basis: request.basis ?? null,
    syntax,
    diagnostics,
    core,
    targetIr,
    status,
  };
}
